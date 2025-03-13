import express from "express";
import { home } from "../controllers/homeController.js";
import { getCommitAndGenerateChangeLog, changelogProgress } from "../controllers/changelogController.js";
import {
  getRepositoriesByUsername,
  getStoredRepositories,
  getRepositoryById,
} from "../controllers/repositoryController.js";

const router = express.Router();

// Root endpoint
router.get("/", home);

// Changelog endpoints
router.post("/generate-changelog", getCommitAndGenerateChangeLog);
router.get("/generate-changelog/progress", changelogProgress);

// Repository endpoints
router.get("/repositories", getStoredRepositories);
router.get("/repositories/:id", getRepositoryById);
router.get("/github-repositories/:username", getRepositoriesByUsername);

export default router;
