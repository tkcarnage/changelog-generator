import mongoose from "mongoose";

const CommitSchema = new mongoose.Schema(
  {
    sha: {
      type: String,  // This will store the PR's merge commit SHA
      required: true,
      unique: true,
    },
    repository: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
    },
    branchName: { type: String, required: true },
    prTitle: { type: String },
    prDescription: { type: String },
    prNumber: { type: Number },
    mergedAt: { type: Date },
    author: { type: String },
    commits: [
      {
        sha: { type: String, required: true },  // Individual commit SHA
        message: { type: String, required: true },
        date: { type: Date, required: true },
        files: [
          {
            filename: { type: String },
            status: { type: String },
            changes: { type: Number },
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Commit", CommitSchema);
