import fetch from "node-fetch";
import Repository from "../models/repository.js";

/**
 * Fetches repositories from GitHub for a given username.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 */
export const getRepositoriesByUsername = async (req, res, next) => {
  try {
    const { username } = req.params;
    const headers = {
      'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
    
    const response = await fetch(`https://api.github.com/users/${username}/repos`, { headers });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`GitHub API responded with status ${response.status}: ${errorData.message}`);
    }

    const repositories = await response.json();
    res.status(200).json(repositories);
  } catch (error) {
    console.error("Error fetching GitHub repositories:", error);
    next(error);
  }
};

/**
 * Fetches all repositories stored in the database without their changelogs.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 */
export const getStoredRepositories = async (req, res, next) => {
  try {
    const repositories = await Repository.find({}).lean();

    // Format repositories to match frontend Repository type
    const formattedRepos = repositories.map((repo) => ({
      _id: repo._id.toString(),
      name: repo.name,
      full_name: repo.full_name || `${repo.owner}/${repo.name}`, // Use full_name if available
      description: repo.description || "",
      owner: {
        avatar_url: repo.owner?.avatar_url || "",
        login: repo.owner?.login || repo.owner, // Use owner.login if available
      },
      stargazers_count: repo.stargazers_count || 0,
      language: repo.language || "",
      topics: repo.topics || [],
      updated_at: repo.updated_at || new Date().toISOString(),
      html_url: repo.html_url || `https://github.com/${repo.owner}/${repo.name}`,
    }));

    res.status(200).json(formattedRepos);
  } catch (error) {
    console.error("Error fetching stored repositories:", error);
    next(error);
  }
};

/**
 * Fetches a single repository by its ID.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 */
export const getRepositoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const repository = await Repository.findById(id).lean();

    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    // Format repository to match frontend Repository type
    const formattedRepo = {
      _id: repository._id.toString(),
      name: repository.name,
      full_name: repository.full_name || `${repository.owner}/${repository.name}`, // Use full_name if available
      description: repository.description || "",
      owner: {
        avatar_url: repository.owner?.avatar_url || "",
        login: repository.owner?.login || repository.owner, // Use owner.login if available
      },
      stargazers_count: repository.stargazers_count || 0,
      language: repository.language || "",
      topics: repository.topics || [],
      updated_at: repository.updated_at || new Date().toISOString(),
      html_url: repository.html_url || `https://github.com/${repository.owner}/${repository.name}`,
      changelog: repository.changelog || [], // Include changelog data
    };

    res.status(200).json(formattedRepo);
  } catch (error) {
    console.error("Error fetching repository:", error);
    next(error);
  }
};
