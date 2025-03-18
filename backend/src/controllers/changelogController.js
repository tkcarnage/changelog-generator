import { Octokit } from "@octokit/rest";
import Repository from "../models/repository.js"; 
import Commit from "../models/commit.js";
import { filterApiChanges } from "../services/filterApiChangesService.js";
import { generateReadableChangelog } from "../services/changelogFormattingService.js";
import _ from "lodash";
import dotenv from "dotenv";
import { createOctokit, getRepositoryInfo, getPRForCommit, getCommitDetails } from "./githubController.js";
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
      const commitDetails = await getCommitDetails(octokit, owner, repo, commit.sha);

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
    sendProgress(clientId, { progress: 10, step: "Fetching repository info..." });

    const repoInfo = await getRepositoryInfo(octokit, owner, repo);
    sendProgress(clientId, { progress: 20, step: "Processing commits..." });

    // Get commits within date range
    const since = startDate || new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const until = endDate || new Date().toISOString();

    const { data: commits } = await octokit.repos.listCommits({
      owner,
      repo,
      since,
      until,
    });

    // Process commits in chunks
    const chunkSize = 5;
    const commitChunks = _.chunk(commits, chunkSize);
    const processedCommits = [];

    for (let i = 0; i < commitChunks.length; i++) {
      const chunk = commitChunks[i];
      const progress = Math.floor(20 + (60 * (i + 1)) / commitChunks.length);
      sendProgress(clientId, {
        progress,
        step: `Processing commits (${i * chunkSize + 1}-${
          Math.min((i + 1) * chunkSize, commits.length)
        } of ${commits.length})...`,
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

    // Update repository in database
    await Repository.findOneAndUpdate(
      { "owner.login": owner, name: repo },
      {
        $set: {
          lastChangelogDate: new Date(),
          lastChangelog: changelog,
        },
      },
      { new: true }
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
