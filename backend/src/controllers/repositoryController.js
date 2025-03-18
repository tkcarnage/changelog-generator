import fetch from "node-fetch";
import Repository from "../models/repository.js";

/**
 * Fetches all repositories stored in the database without their changelogs.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 */
export const getStoredRepositories = async (req, res, next) => {
  try {
    // Find all repositories and sort by lastGeneratedAt
    const repositories = await Repository.find({})
      .sort({ lastGeneratedAt: -1 })
      .lean();

    res.status(200).json(repositories);
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

    res.status(200).json(repository);
  } catch (error) {
    console.error("Error fetching repository:", error);
    next(error);
  }
};

/**
 * Adds a new repository to the database.
 * If a repository with the same owner and name already exists, it will be updated.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 */
export const addRepository = async (req, res, next) => {
  try {
    const { owner, name } = req.body;

    // Try to find existing repository
    const existingRepo = await Repository.findOne({ owner: owner, name: name });
    
    if (existingRepo) {
      // Update existing repository
      const updatedRepo = await Repository.findByIdAndUpdate(
        existingRepo._id,
        { 
          $set: { 
            ...req.body,
            lastGeneratedAt: existingRepo.lastGeneratedAt // Preserve the last generated time
          }
        },
        { new: true, runValidators: true }
      );
      res.json(updatedRepo);
    } else {
      // Create new repository
      const repository = new Repository(req.body);
      await repository.save();
      res.json(repository);
    }
  } catch (error) {
    console.error("Error adding repository:", error);
    next(error);
  }
};
