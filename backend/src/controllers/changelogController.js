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
        sha: prInfo?.merge_commit_sha || commit?.sha, // Use PR's merge commit SHA if available
        branchName: defaultBranch,
        prTitle: prInfo?.title || "",
        prDescription: prInfo?.body || "",
        mergedAt: prInfo?.mergedAt || commit?.commit?.author?.date,
        commits: [
          {
            sha: commit?.sha, // This is the individual commit SHA
            message: commit?.commit?.message,
            date: commit?.commit?.author?.date,
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

    // First save/update the repository to get its ID
    const repository = await Repository.findOneAndUpdate(
      { "owner.login": owner, name: repo },
      {
        $set: {
          owner: {
            login: owner,
            avatar_url: repoInfo.owner.avatar_url,
          },
          name: repo,
          full_name: `${owner}/${repo}`,
          description: repoInfo.description,
          stargazers_count: repoInfo.stargazers_count,
          language: repoInfo.language,
          topics: repoInfo.topics,
          html_url: repoInfo.html_url,
          defaultBranch: repoInfo.default_branch,
          updated_at: repoInfo.updated_at,
          license: repoInfo.license
            ? {
                name: repoInfo.license.name,
                url: repoInfo.license.url,
              }
            : undefined,
        },
      },
      { new: true, upsert: true }
    );

    // Get all commits and process them in parallel
    const since = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const until = endDate ? new Date(endDate) : new Date();

    let allCommits = [];
    let page = 1;
    const per_page = 100; // Maximum allowed by GitHub API
    const MAX_PAGES = 1; // Limit to 100 most recent commits

    while (page <= MAX_PAGES) {
      const { data: commits } = await octokit.repos.listCommits({
        owner,
        repo,
        per_page,
        page,
      });

      // Process commits in parallel and filter by date range
      const processedCommits = await Promise.all(
        commits.map(async (commit) => {
          const prInfo = await getPRForCommit(octokit, owner, repo, commit.sha);
          const commitDetails = await getCommitDetails(
            octokit,
            owner,
            repo,
            commit.sha
          );

          // Only include commits with PRs within date range
          if (prInfo?.mergedAt) {
            const mergedAt = new Date(prInfo.mergedAt);
            if (mergedAt >= since && mergedAt <= until) {
              return {
                sha: prInfo?.merge_commit_sha || commit.sha, // Use PR's merge commit SHA if available
                repository: repository._id,
                branchName: repoInfo.default_branch,
                prTitle: prInfo.title,
                prDescription: prInfo.body,
                prNumber: prInfo.number,
                mergedAt: prInfo.mergedAt,
                author: prInfo.author,
                commits: [
                  {
                    sha: commit.sha, // This is the individual commit SHA
                    message: commit.commit.message,
                    date: commit.commit.author.date,
                    files: commitDetails.files,
                  },
                ],
              };
            }
          }
          return null;
        })
      );

      // Filter out null values and add to allCommits
      allCommits.push(...processedCommits.filter(Boolean));

      // If we got less than per_page items or hit max pages, we're done
      if (commits.length < per_page || page >= MAX_PAGES) {
        break;
      }
      page++;
    }

    // Save all processed commits
    await Promise.all(
      allCommits.map((commit) =>
        Commit.findOneAndUpdate(
          { sha: commit.sha },
          { $set: commit },
          { new: true, upsert: true }
        )
      )
    );

    // Process commits in chunks
    const chunkSize = 20;
    const commitChunks = _.chunk(allCommits, chunkSize);
    const processedCommits = [];

    for (let i = 0; i < commitChunks.length; i++) {
      const chunk = commitChunks[i];
      const progress = Math.floor(20 + (60 * (i + 1)) / commitChunks.length);
      sendProgress(clientId, {
        progress,
        step: `Processing commits (${i * chunkSize + 1}-${Math.min(
          (i + 1) * chunkSize,
          allCommits.length
        )} of ${allCommits.length})...`,
      });

      const processedChunk = await processCommitChunk(
        chunk,
        repoInfo,
        octokit,
        owner,
        repo,
        repoInfo.default_branch
      );
      processedCommits.push(...processedChunk);
    }

    sendProgress(clientId, {
      progress: 80,
      step: `Analyzing changes in parallel...`,
    });

    // Process API changes in chunks in parallel
    const chunkFilterSize = 10;
    const apiChangeChunks = _.chunk(processedCommits, chunkFilterSize);
    let allApiChanges = { changes: [] };

    console.log(
      `Processing ${apiChangeChunks.length} chunks of size ${chunkFilterSize}`
    );

    // Process all chunks in parallel
    const chunkPromises = apiChangeChunks.map(async (chunk, index) => {
      try {
        console.log(
          `\nProcessing chunk ${index + 1}/${apiChangeChunks.length}`
        );
        console.log(
          "Chunk commits:",
          chunk.map((c) => ({
            sha: (c.sha || "").substring(0, 7),
            message: (c.commits?.[0]?.message || "").split("\n")[0],
            prTitle: c.prTitle || "no title",
            mergedAt: c.mergedAt || "unknown",
          }))
        );

        const chunkChanges = await filterApiChanges(chunk);
        console.log(
          `Filtered changes from chunk ${index + 1}:`,
          chunkChanges?.changes?.map((c) => ({
            title: c.prTitle,
            mergedAt: c.mergedAt,
          })) || []
        );
        return chunkChanges?.changes || [];
      } catch (error) {
        console.error(
          `Error processing API changes chunk ${index + 1}:`,
          error
        );
        return [];
      }
    });

    // Wait for all chunks to be processed
    const allChanges = await Promise.all(chunkPromises);

    // Combine all changes
    allApiChanges.changes = allChanges.flat();

    console.log(
      "\nAll changes before sorting:",
      allApiChanges.changes.map((c) => ({
        title: c.prTitle,
        mergedAt: c.mergedAt,
      }))
    );

    // Sort changes by date
    allApiChanges.changes.sort((a, b) => {
      const dateA = new Date(a.mergedAt || 0);
      const dateB = new Date(b.mergedAt || 0);
      return dateB - dateA; // newest first
    });

    console.log(
      "\nChanges after sorting:",
      allApiChanges.changes.map((c) => ({
        title: c.prTitle,
        mergedAt: c.mergedAt,
      }))
    );

    sendProgress(clientId, {
      progress: 90,
      step: "Generating changelog...",
    });

    // Process changelog in chunks to avoid token limits
    const chunkChangelogSize = 10;
    const changelogChunks = _.chunk(allApiChanges.changes, chunkChangelogSize);
    const changelogSections = {
      "New Features": [],
      "Bug Fixes": [],
      "Breaking Changes": [],
      Documentation: [],
      Other: [],
    };

    // Process each chunk in parallel
    const changelogPromises = changelogChunks.map(async (chunk, index) => {
      try {
        console.log(
          `\nProcessing changelog chunk ${index + 1}/${changelogChunks.length}`
        );
        const chunkChangelog = await generateReadableChangelog({
          changes: chunk,
        });
        return chunkChangelog.sections;
      } catch (error) {
        console.error(`Error processing changelog chunk ${index + 1}:`, error);
        return [];
      }
    });

    // Wait for all changelog chunks
    const allChangelogSections = await Promise.all(changelogPromises);

    // Merge all sections
    allChangelogSections.forEach((sections) => {
      sections.forEach((section) => {
        changelogSections[section.type].push(...section.changes);
      });
    });

    // Create final changelog structure
    const changelog = {
      sections: Object.entries(changelogSections).map(([type, changes]) => ({
        type,
        changes: changes.sort(
          (a, b) => new Date(b.mergedAt || 0) - new Date(a.mergedAt || 0)
        ),
      })),
    };

    sendProgress(clientId, {
      progress: 100,
      step: "Changelog generated successfully!",
    });

    // Merge new changes with existing sections
    let mergedSections = [];
    if (repository?.changelog?.sections) {
      // Create a map of existing sections by type
      const sectionMap = new Map(
        repository.changelog.sections.map((section) => [section.type, section])
      );

      // Merge new sections with existing ones
      changelog.sections.forEach((newSection) => {
        const existingSection = sectionMap.get(newSection.type);
        if (existingSection) {
          // Merge changes into existing section
          existingSection.changes = [
            ...existingSection.changes,
            ...newSection.changes,
          ];
          sectionMap.set(newSection.type, existingSection);
        } else {
          // Add new section
          sectionMap.set(newSection.type, newSection);
        }
      });

      mergedSections = Array.from(sectionMap.values());
    } else {
      mergedSections = changelog.sections;
    }

    // Update repository in database
    await Repository.findOneAndUpdate(
      { "owner.login": owner, name: repo },
      {
        $set: {
          changelog: {
            lastUpdated: new Date(),
            sections: mergedSections,
          },
          lastGeneratedAt: new Date(),
        },
      },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      changelog: {
        lastUpdated: new Date(),
        sections: mergedSections,
      },
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
