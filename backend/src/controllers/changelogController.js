import { Octokit } from "@octokit/rest";
import Repository from "../models/repository.js";
import Commit from "../models/commit.js";
import { filterApiChanges } from "../services/filterApiChangesService.js";
import { generateReadableChangelog } from "../services/changelogFormattingService.js";
import { analyzeDiff } from "../services/gitCommitDiffService.js";
import _ from "lodash";
import dotenv from "dotenv";
import {
  createOctokit,
  getRepositoryInfo,
  getPRForCommit,
  getCommitDetails,
} from "./githubController.js";
import { sendProgress } from "./sseController.js";

// Load environment variables
dotenv.config();

/**
 * Process a chunk of commits in parallel
 * @param {Array} commits - Array of commits to process
 * @param {Object} repository - Repository information
 * @param {Octokit} octokit - Octokit instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} defaultBranch - Default branch name
 * @returns {Promise<Array>} Processed commit data
 */
const processCommitChunk = async (
  commits,
  repository,
  octokit,
  owner,
  repo,
  defaultBranch
) => {
  const processedCommits = await Promise.all(
    commits.map(async (commit) => {
      const prInfo = await getPRForCommit(octokit, owner, repo, commit.sha);
      const commitDetails = await getCommitDetails(
        octokit,
        owner,
        repo,
        commit.sha
      );

      return {
        sha: commit.sha,
        message: commit.commit.message,
        date: commit.commit.author.date,
        branchName: defaultBranch,
        prTitle: prInfo?.title || "",
        prDescription: prInfo?.body || "",
        mergedAt: prInfo?.mergedAt || commit.commit.author.date,
        commits: [
          {
            sha: commit.sha,
            message: commit.commit.message,
            date: commit.commit.author.date,
            files: commitDetails.files,
          },
        ],
      };
    })
  );

  return processedCommits;
};

/**
 * Generate changelog from repository commits
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getCommitAndGenerateChangeLog = async (req, res) => {
  const { owner, repo, startDate, endDate } = req.body;
  const clientId = `${owner}/${repo}`;

  try {
    const octokit = createOctokit();
    sendProgress(clientId, {
      progress: 10,
      step: "Fetching repository info...",
    });

    // Get repository info
    const repoInfo = await getRepositoryInfo(octokit, owner, repo);
    if (!repoInfo) {
      return res
        .status(404)
        .json({ success: false, error: "Repository not found" });
    }

    // Get or create repository in database
    let repository = await Repository.findOne({
      "owner.login": owner,
      name: repo,
    });

    if (!repository) {
      repository = await Repository.create({
        owner: {
          login: owner,
          avatar_url: repoInfo.owner.avatar_url,
          html_url: repoInfo.owner.html_url,
          type: repoInfo.owner.type,
        },
        name: repo,
        full_name: repoInfo.full_name,
        description: repoInfo.description,
        default_branch: repoInfo.default_branch,
        html_url: repoInfo.html_url,
        created_at: repoInfo.created_at,
        updated_at: repoInfo.updated_at,
        stargazers_count: repoInfo.stargazers_count,
        language: repoInfo.language,
        topics: repoInfo.topics || [],
      });
    } else {
      // Update repository info
      repository.full_name = repoInfo.full_name;
      repository.description = repoInfo.description;
      repository.stargazers_count = repoInfo.stargazers_count;
      repository.language = repoInfo.language;
      repository.topics = repoInfo.topics || [];
      repository.updated_at = repoInfo.updated_at;
      await repository.save();
    }

    sendProgress(clientId, {
      progress: 20,
      step: "Repository information saved. Fetching commits...",
    });

    // Get commits within date range
    const since =
      startDate ||
      new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const until = endDate || new Date().toISOString();

    // First, check if we have these commits cached
    let commits = await Commit.find({
      repository: repository._id,
      date: { $gte: new Date(since), $lte: new Date(until) },
    });

    if (commits.length === 0) {
      console.log("Fetching commits from GitHub");
      const { data: githubCommits } = await octokit.repos.listCommits({
        owner,
        repo,
        since,
        until,
      });

      // Process commits in chunks
      const chunkSize = 5;
      const commitChunks = _.chunk(githubCommits, chunkSize);
      commits = [];

      for (let i = 0; i < commitChunks.length; i++) {
        const chunk = commitChunks[i];
        const progress = Math.floor(20 + (40 * (i + 1)) / commitChunks.length);
        sendProgress(clientId, {
          progress,
          step: `Processing commits (${i * chunkSize + 1}-${Math.min(
            (i + 1) * chunkSize,
            githubCommits.length
          )} of ${githubCommits.length})...`,
        });

        // Process each commit in the chunk
        const processedChunk = await Promise.all(
          chunk.map(async (commit) => {
            const prInfo = await getPRForCommit(
              octokit,
              owner,
              repo,
              commit.sha
            );
            const commitDetails = await getCommitDetails(
              octokit,
              owner,
              repo,
              commit.sha
            );

            const commitData = {
              sha: commit.sha,
              message: commit.commit.message,
              repository: repository._id,
              branchName: repository.default_branch,
              date: commit.commit.author.date,
              author: {
                name: commit.commit.author.name,
                email: commit.commit.author.email,
              },
              prInfo: prInfo
                ? {
                    number: prInfo.number,
                    title: prInfo.title,
                    body: prInfo.body,
                    mergedAt: prInfo.merged_at,
                    html_url: prInfo.html_url,
                  }
                : null,
              files: commitDetails.files.map((file) => ({
                filename: file.filename,
                status: file.status,
                additions: file.additions,
                deletions: file.deletions,
                changes: file.changes,
                patch: file.patch || "",
              })),
            };

            // Save commit to database right after fetching
            const savedCommit = await Commit.findOneAndUpdate(
              { sha: commit.sha },
              commitData,
              { upsert: true, new: true }
            );

            return savedCommit;
          })
        );

        commits.push(...processedChunk);
      }
    }

    // Now process the commits (either from cache or newly fetched) for changelog
    sendProgress(clientId, {
      progress: 60,
      step: "Filtering API changes...",
    });

    // Process in larger chunks for the filter stage
    const filterChunkSize = 20; // Larger chunks for the filter stage
    const commitChunks = _.chunk(commits, filterChunkSize);

    // Step 1: Filter commits in chunks and merge results
    const filteredResults = [];
    for (let i = 0; i < commitChunks.length; i++) {
      const chunk = commitChunks[i];
      sendProgress(clientId, {
        progress: 60 + (15 * i) / commitChunks.length,
        step: `Filtering changes (chunk ${i + 1}/${commitChunks.length})...`,
      });

      const formattedChunk = chunk.map((commit) => ({
        sha: commit.sha,
        message: commit.message,
        date: commit.date,
        branchName: commit.branchName,
        prTitle: commit.prInfo?.title || "",
        prDescription: commit.prInfo?.body || "",
        mergedAt: commit.prInfo?.mergedAt || commit.date,
        files: commit.files || [],
      }));

      const chunkResults = await filterApiChanges(formattedChunk);
      if (chunkResults.apiChanges && chunkResults.apiChanges.length > 0) {
        filteredResults.push(...chunkResults.apiChanges);
      }
    }

    // Check if we found any API changes
    if (filteredResults.length === 0) {
      console.log("No API changes found");
      // Still save an empty changelog entry to record that we checked this period
      const emptyChangelog = {
        timestamp: new Date().toISOString(),
        sections: []
      };
      
      repository.changelog = repository.changelog || [];
      repository.changelog.push(emptyChangelog);
      repository.lastGeneratedAt = new Date();
      await repository.save();

      return res.json({
        success: true,
        changelog: "No API changes found in the specified date range.",
      });
    }

    // Step 1: Merge filtered results
    const filteredChanges = {
      apiChanges: filteredResults,
    };

    // Step 2: Analyze diffs for the filtered commits
    console.log("Analyzing diffs...");
    sendProgress(clientId, {
      progress: 75,
      step: "Analyzing changes...",
    });

    // Process each commit's diff
    for (const change of filteredChanges.apiChanges) {
      for (const commit of change.commits) {
        if (commit.files && commit.files.length > 0) {
          try {
            const rawDiff = commit.files
              .map(
                (file) =>
                  `diff --git a/${file.filename} b/${file.filename}\n${file.patch || ""}`
              )
              .join("\n");
            commit.diffAnalysis = await analyzeDiff(rawDiff);
          } catch (error) {
            console.error(
              `Error analyzing diff for commit ${commit.sha}:`,
              error
            );
            commit.diffAnalysis = {
              technicalChanges: "Failed to analyze changes",
              potentialImpact: "Unknown",
              breakingChange: false,
              suggestedChangelogEntry: commit.message,
              metadata: {
                filesAnalyzed: commit.files.length,
                diffSize: 0,
              },
            };
          }
        }
      }
    }

    sendProgress(clientId, {
      progress: 90,
      step: "Generating changelog...",
    });

    // Step 3: Generate the final changelog
    const changelog = await generateReadableChangelog(filteredChanges);
    console.log("Generated changelog:", changelog); // Add logging

    // Add the changelog entry and update lastGeneratedAt in one operation
    repository.changelog = repository.changelog || []; // Ensure changelog array exists
    repository.changelog.push(changelog);
    repository.lastGeneratedAt = new Date();
    await repository.save();
    
    // Verify the save
    const savedRepo = await Repository.findById(repository._id);
    console.log("Saved changelog length:", savedRepo.changelog.length);
    console.log("Latest changelog entry:", savedRepo.changelog[savedRepo.changelog.length - 1]);

    sendProgress(clientId, {
      progress: 100,
      step: "Changelog generated and saved",
    });

    return res.json({
      success: true,
      changelog: changelog,
    });
  } catch (error) {
    console.error("Error generating changelog:", error);
    sendProgress(clientId, {
      progress: 100,
      step: `Error: ${error.message}`,
    });
    res.status(500).json({ error: error.message });
  }
};
