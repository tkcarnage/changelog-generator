import express from "express";
import indexRouter from "./routes/index.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();

// Middleware for JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Setup routes
app.use("/api", indexRouter);

// Error handling middleware
app.use(errorHandler);

export default app;
