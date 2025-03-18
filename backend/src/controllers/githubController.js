import { Octokit } from "@octokit/rest";
import dotenv from "dotenv";

dotenv.config();

/**
 * Initialize Octokit with GitHub token
 * @returns {Octokit} Configured Octokit instance
 */
const createOctokit = () => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GitHub token is not configured in environment variables");
  }
  console.log("Creating Octokit instance with GitHub token from environment");
  return new Octokit({
    auth: token,
    headers: {
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
};

/**
 * Get repository information including default branch
 * @param {Octokit} octokit - Octokit instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Object>} Repository information
 */
export const getRepositoryInfo = async (octokit, owner, repo) => {
  console.log(`Fetching repository info for ${owner}/${repo}`);
  const { data: repoInfo } = await octokit.repos.get({
    owner,
    repo,
  });

  return {
    defaultBranch: repoInfo.default_branch,
    ...repoInfo,
  };
};

/**
 * Get PR information for a commit
 * @param {Octokit} octokit - Octokit instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} commitSha - Commit SHA
 * @returns {Promise<Object|null>} PR information or null if not found
 */
export const getPRForCommit = async (octokit, owner, repo, commitSha) => {
  try {
    console.log(`Fetching PR info for commit: ${commitSha}`);
    const { data: prs } = await octokit.repos.listPullRequestsAssociatedWithCommit({
      owner,
      repo,
      commit_sha: commitSha,
    });

    if (prs.length > 0) {
      const pr = prs[0];
      return {
        number: pr.number,
        title: pr.title,
        body: pr.body,
        mergedAt: pr.merged_at,
        labels: pr.labels.map((label) => label.name),
        author: pr.user.login,
        url: pr.html_url,
      };
    }
    return null;
  } catch (error) {
    console.error(`Error fetching PR for commit ${commitSha}:`, error);
    return null;
  }
};

/**
 * Get detailed file changes for a commit
 * @param {Octokit} octokit - Octokit instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} sha - Commit SHA
 * @returns {Promise<Object>} Commit details
 */
export const getCommitDetails = async (octokit, owner, repo, sha) => {
  try {
    console.log(`Fetching commit details for ${sha}`);
    const { data: commitData } = await octokit.repos.getCommit({
      owner,
      repo,
      ref: sha,
    });

    return {
      files: commitData.files.map((file) => ({
        filename: file.filename,
        status: file.status,
        changes: file.changes,
        additions: file.additions,
        deletions: file.deletions,
      })),
      stats: commitData.stats,
    };
  } catch (error) {
    console.error(`Error fetching commit details for ${sha}:`, error);
    return { files: [], stats: { additions: 0, deletions: 0, total: 0 } };
  }
};

export { createOctokit };
