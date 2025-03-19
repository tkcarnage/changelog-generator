import mongoose from "mongoose";

const CommitSchema = new mongoose.Schema(
  {
    sha: {
      type: String,
      required: true,
      unique: true,
    },
    message: {
      type: String,
      required: true,
    },
    repository: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
    },
    branchName: { type: String, required: true },
    commits: [
      {
        sha: { type: String, required: true },
        message: { type: String, required: true },
        author: { type: String },
        date: { type: Date, required: true },
        // rawDiff: { type: String },
        files: [
          {
            filename: { type: String },
            status: { type: String },
            changes: { type: Number },
          },
        ],
        isApiChange: { type: Boolean, default: false },
        apiChangeDescription: { type: String },
        breakingChange: { type: Boolean, default: false },
        actionRequired: { type: String },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Commit", CommitSchema);
