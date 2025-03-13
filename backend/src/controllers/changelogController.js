import { Octokit } from '@octokit/rest';
import Repository from "../models/repository.js"; // Added this line
import Commit from "../models/commit.js";
import { filterApiChanges } from "../services/filterApiChangesService.js";
import { generateReadableChangelog } from "../services/changelogFormattingService.js";
import _ from "lodash";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Store active SSE clients
const clients = new Map();

// Helper function to send progress updates
const sendProgress = (clientId, data) => {
  const client = clients.get(clientId);
  if (client) {
    if (data.progress !== undefined) {
      data.progress = Math.min(Math.max(Math.round(data.progress), 0), 100);
    }
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  }
};

// SSE endpoint for progress updates
export const changelogProgress = (req, res) => {
  const { owner, repo } = req.query;
  const clientId = `${owner}/${repo}`;

  // Return error if owner/repo not provided
  if (!owner || !repo) {
    res.status(400).json({ error: 'Owner and repo parameters are required' });
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  // Send initial progress
  sendProgress(clientId, { progress: 0, step: 'Initializing...' });

  // Store client connection
  clients.set(clientId, res);

  req.on('close', () => {
    clients.delete(clientId);
  });
};

// Initialize Octokit with GitHub token
const createOctokit = () => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GitHub token is not configured in environment variables");
  }
  console.log('Creating Octokit instance with GitHub token from environment');
  return new Octokit({
    auth: token,
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });
};

// Get default branch and repository info
const getRepositoryInfo = async (octokit, owner, repo) => {
  console.log(`Fetching repository info for ${owner}/${repo}`);
  const { data: repoInfo } = await octokit.repos.get({
    owner,
    repo,
  });

  // Update repository in database with latest info
  await Repository.findOneAndUpdate(
    { name: repo, 'owner.login': owner },
    {
      name: repoInfo.name,
      full_name: repoInfo.full_name,
      description: repoInfo.description,
      owner: {
        login: repoInfo.owner.login,
        avatar_url: repoInfo.owner.avatar_url,
      },
      stargazers_count: repoInfo.stargazers_count,
      language: repoInfo.language,
      topics: repoInfo.topics,
      updated_at: repoInfo.updated_at,
      html_url: repoInfo.html_url,
      default_branch: repoInfo.default_branch,
      license: repoInfo.license ? {
        name: repoInfo.license.name,
        url: repoInfo.license.url,
      } : undefined,
    },
    { upsert: true, new: true }
  );

  return {
    defaultBranch: repoInfo.default_branch,
    ...repoInfo
  };
};

// Get PR information for a commit
const getPRForCommit = async (octokit, owner, repo, commitSha) => {
  try {
    console.log(`Fetching PR info for commit: ${commitSha}`);
    const { data: prs } = await octokit.repos.listPullRequestsAssociatedWithCommit({
      owner,
      repo,
      commit_sha: commitSha,
    });

    if (prs.length > 0) {
      const pr = prs[0]; // Get the first PR that contains this commit
      return {
        number: pr.number,
        title: pr.title,
        body: pr.body,
        mergedAt: pr.merged_at,
        labels: pr.labels.map(label => label.name),
        author: pr.user.login,
        url: pr.html_url
      };
    }
    return null;
  } catch (error) {
    console.error(`Error fetching PR for commit ${commitSha}:`, error);
    return null;
  }
};

// Get detailed file changes for a commit
const getCommitDetails = async (octokit, owner, repo, sha) => {
  try {
    console.log(`Fetching commit details for ${sha}`);
    const { data: commitData } = await octokit.repos.getCommit({
      owner,
      repo,
      ref: sha,
    });

    return {
      files: commitData.files.map(file => ({
        filename: file.filename,
        status: file.status,
        changes: file.changes,
        additions: file.additions,
        deletions: file.deletions,
        // rawDiff: file.patch || ''
      })),
      stats: commitData.stats
    };
  } catch (error) {
    console.error(`Error fetching commit details for ${sha}:`, error);
    return { files: [], stats: { additions: 0, deletions: 0, total: 0 } };
  }
};

// Process commits in chunks for parallel processing
const processCommitChunk = async (commits, repository, octokit, owner, repo, defaultBranch) => {
  try {
    console.log(`Processing chunk of ${commits.length} commits`);
    const processedCommits = await Promise.all(commits.map(async (commit) => {
      console.log(`Processing commit: ${commit.sha}`);
      const [prInfo, commitDetails] = await Promise.all([
        getPRForCommit(octokit, owner, repo, commit.sha),
        getCommitDetails(octokit, owner, repo, commit.sha)
      ]);

      // Ensure all required fields are present
      return {
        branchName: defaultBranch,
        prTitle: prInfo?.title || commit.commit.message.split('\n')[0],
        prDescription: prInfo?.body || commit.commit.message,
        prNumber: prInfo?.number || null,
        prUrl: prInfo?.url || `https://github.com/${owner}/${repo}/commit/${commit.sha}`,
        prLabels: prInfo?.labels || [],
        prAuthor: prInfo?.author || commit.commit.author.name,
        mergedAt: prInfo?.mergedAt || commit.commit.author.date,
        commits: [{
          sha: commit.sha,
          message: commit.commit.message,
          date: commit.commit.author.date,
          author: commit.commit.author.name,
          files: commitDetails.files.map(file => ({
            filename: file.filename,
            status: file.status,
            changes: file.changes || 0,
            additions: file.additions || 0,
            deletions: file.deletions || 0
          })),
          stats: commitDetails.stats
        }]
      };
    }));

    // Filter and categorize API changes
    console.log('Filtering and categorizing API changes');
    const apiChanges = await filterApiChanges(processedCommits);
    console.log('API changes:', JSON.stringify(apiChanges, null, 2));
    
    return apiChanges;
  } catch (error) {
    console.error('Error processing commit chunk:', error);
    throw error;
  }
};

export const getCommitAndGenerateChangeLog = async (req, res) => {
  const { username: owner, repo, startDate, endDate } = req.body;
  const clientId = `${owner}/${repo}`;

  if (!owner || !repo) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  // Set default dates if not provided
  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
  
  const effectiveStartDate = startDate ? new Date(startDate) : twoWeeksAgo;
  const effectiveEndDate = endDate ? new Date(endDate) : now;

  try {
    // Initial progress
    sendProgress(clientId, { progress: 10, step: 'Starting changelog generation...' });

    const octokit = createOctokit();

    sendProgress(clientId, { progress: 20, step: 'Fetching repository information...' });
    const repoInfo = await getRepositoryInfo(octokit, owner, repo);
    
    sendProgress(clientId, { progress: 30, step: 'Fetching commits...' });

    // Fetch commits between dates
    const { data: commits } = await octokit.repos.listCommits({
      owner: owner,
      repo: repo,
      since: effectiveStartDate.toISOString(),
      until: effectiveEndDate.toISOString(),
      per_page: 100,
    });

    // Find or create repository
    const repository = await Repository.findOneAndUpdate(
      { full_name: repoInfo.full_name },
      {
        name: repoInfo.name,
        full_name: repoInfo.full_name,
        description: repoInfo.description,
        owner: {
          login: repoInfo.owner.login,
          avatar_url: repoInfo.owner.avatar_url,
        },
        html_url: repoInfo.html_url,
        default_branch: repoInfo.default_branch
      },
      { upsert: true, new: true }
    );

    // Process commits in parallel chunks
    const CHUNK_SIZE = 10; 
    const commitChunks = _.chunk(commits, CHUNK_SIZE);
    const totalChunks = commitChunks.length;
    
    // Allocate progress ranges for different stages
    const COMMIT_PROCESSING_START = 30;
    const COMMIT_PROCESSING_END = 80;
    const progressPerChunk = (COMMIT_PROCESSING_END - COMMIT_PROCESSING_START) / totalChunks;

    let allApiChanges = {};
    let currentChangelog = null;

    // Process chunks in parallel with batching
    const PARALLEL_BATCH_SIZE = 3; 
    for (let i = 0; i < commitChunks.length; i += PARALLEL_BATCH_SIZE) {
      const currentBatch = commitChunks.slice(i, i + PARALLEL_BATCH_SIZE);
      const currentProgress = COMMIT_PROCESSING_START + (progressPerChunk * i);
      
      sendProgress(clientId, { 
        progress: currentProgress,
        step: `Processing commits (${Math.min(i + PARALLEL_BATCH_SIZE, commitChunks.length)}/${commitChunks.length})...` 
      });

      // Process each chunk in the batch in parallel
      const batchResults = await Promise.all(
        currentBatch.map(chunk => 
          processCommitChunk(chunk, repository, octokit, owner, repo, repoInfo.default_branch)
        )
      );

      // Merge results from all chunks in this batch
      batchResults.forEach(apiChanges => {
        Object.entries(apiChanges).forEach(([key, value]) => {
          if (!allApiChanges[key]) allApiChanges[key] = [];
          allApiChanges[key].push(...value);
        });
      });

      // Generate and save intermediate changelog after each batch
      const intermediateChangelog = await generateReadableChangelog(allApiChanges);
      currentChangelog = {
        ...intermediateChangelog,
        repository: {
          owner: owner,
          name: repo,
          full_name: `${owner}/${repo}`
        },
        timestamp: new Date()
      };

      // Update repository with new changelog entry
      await Repository.findByIdAndUpdate(
        repository._id,
        {
          $set: {
            'changelog': [{
              timestamp: new Date(),
              sections: currentChangelog.sections
            }]
          }
        },
        { runValidators: true }
      );
    }

    sendProgress(clientId, { progress: 90, step: 'Finalizing changelog...' });

    // Send final progress update
    sendProgress(clientId, { progress: 100, step: 'Complete' });

    // Return the actual changelog data in the response
    res.json(currentChangelog);
  } catch (error) {
    console.error('Error generating changelog:', error);
    sendProgress(clientId, { error: error.message });
    res.status(500).json({ error: error.message });
  } finally {
    // Clean up client connection after a short delay to ensure the last message is sent
    setTimeout(() => {
      clients.delete(clientId);
    }, 1000);
  }
};
