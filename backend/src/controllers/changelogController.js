import { Octokit } from "@octokit/rest";
import Repository from "../models/repository.js";
import Commit from "../models/commit.js";
import { filterApiChanges } from "../services/filterApiChangesService.js";
import { generateReadableChangelog } from "../services/changelogFormattingService.js";
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

    const repoInfo = await getRepositoryInfo(octokit, owner, repo);
    sendProgress(clientId, { progress: 20, step: "Processing commits..." });

    // Get commits within date range
    const since =
      startDate ||
      new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const until = endDate || new Date().toISOString();

    const { data: commits } = await octokit.repos.listCommits({
      owner,
      repo,
      since,
      until,
    });

    // First save/update the repository to get its ID
    const repository = await Repository.findOneAndUpdate(
      { "owner.login": owner, name: repo },
      {
        $set: {
          name: repoInfo.name,
          full_name: `${owner}/${repo}`,
          description: repoInfo.description,
          "owner.login": owner,
          "owner.avatar_url": repoInfo.owner.avatar_url,
          html_url: repoInfo.html_url,
          stargazers_count: repoInfo.stargazers_count,
          language: repoInfo.language,
          topics: repoInfo.topics,
          updated_at: repoInfo.updated_at,
          default_branch: repoInfo.default_branch,
          license: repoInfo.license
            ? {
                name: repoInfo.license.name,
                url: repoInfo.license.url,
              }
            : null,
        },
      },
      { new: true, upsert: true }
    );

    // Save all raw commits before processing
    const commitSavePromises = commits.map(async (commit) => {
      const prInfo = await getPRForCommit(octokit, owner, repo, commit.sha);
      const commitDetails = await getCommitDetails(
        octokit,
        owner,
        repo,
        commit.sha
      );

      return Commit.findOneAndUpdate(
        { sha: commit.sha },
        {
          $set: {
            sha: commit.sha,
            message: commit.commit.message,
            repository: repository._id,
            branchName: repoInfo.default_branch,
            commits: [
              {
                sha: commit.sha,
                message: commit.commit.message,
                date: commit.commit.author.date,
                files: commitDetails.files.map((f) => ({
                  filename: f.filename,
                  status: f.status,
                  changes: f.changes,
                })),
              },
            ],
            prTitle: prInfo?.title || "",
            prDescription: prInfo?.body || "",
            mergedAt: prInfo?.mergedAt || commit.commit.author.date,
          },
        },
        { new: true, upsert: true }
      );
    });

    // Save commits in parallel
    await Promise.all(commitSavePromises);

    // Process commits in chunks
    const chunkSize = 5;
    const commitChunks = _.chunk(commits, chunkSize);
    const processedCommits = [];

    for (let i = 0; i < commitChunks.length; i++) {
      const chunk = commitChunks[i];
      const progress = Math.floor(20 + (60 * (i + 1)) / commitChunks.length);
      sendProgress(clientId, {
        progress,
        step: `Processing commits (${i * chunkSize + 1}-${Math.min(
          (i + 1) * chunkSize,
          commits.length
        )} of ${commits.length})...`,
      });

      const processedChunk = await processCommitChunk(
        chunk,
        repoInfo,
        octokit,
        owner,
        repo,
        repoInfo.defaultBranch
      );
      processedCommits.push(...processedChunk);
    }

    sendProgress(clientId, {
      progress: 80,
      step: "Filtering API changes...",
    });

    const apiChanges = await filterApiChanges(processedCommits);

    sendProgress(clientId, {
      progress: 90,
      step: "Generating readable changelog...",
    });

    const changelog = await generateReadableChangelog(apiChanges);
    console.log("Generated changelog:", changelog);

    // Find existing repository to get current changelog
    const existingRepo = await Repository.findOne({
      "owner.login": owner,
      name: repo,
    });

    // Get existing sections or create new ones
    let sections;
    if (existingRepo?.changelog?.[0]?.sections) {
      sections = existingRepo.changelog[0].sections;
      // Add new changes to existing sections
      changelog.sections.forEach((newSection) => {
        const existingSection = sections.find(
          (s) => s.type === newSection.type
        );
        if (existingSection && newSection.changes) {
          existingSection.changes = [
            ...existingSection.changes,
            ...newSection.changes,
          ];
        }
      });
    } else {
      // Create new sections if none exist
      sections = [
        {
          type: "New Features",
          changes:
            changelog.sections.find((s) => s.type === "New Features")
              ?.changes || [],
        },
        {
          type: "Bug Fixes",
          changes:
            changelog.sections.find((s) => s.type === "Bug Fixes")?.changes ||
            [],
        },
        {
          type: "Breaking Changes",
          changes:
            changelog.sections.find((s) => s.type === "Breaking Changes")
              ?.changes || [],
        },
        {
          type: "Documentation",
          changes:
            changelog.sections.find((s) => s.type === "Documentation")
              ?.changes || [],
        },
        {
          type: "Other",
          changes:
            changelog.sections.find((s) => s.type === "Other")?.changes || [],
        },
      ];
    }

    // Update repository in database
    await Repository.findOneAndUpdate(
      { "owner.login": owner, name: repo },
      {
        $set: {
          changelog: [
            {
              timestamp: new Date(),
              sections: sections,
            },
          ],
          lastGeneratedAt: new Date()
        },
      },
      { new: true, upsert: true }
    );

    sendProgress(clientId, {
      progress: 100,
      step: "Complete",
    });

    res.json({
      success: true,
      changelog,
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
