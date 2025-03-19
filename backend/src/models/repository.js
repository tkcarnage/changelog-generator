import mongoose from "mongoose";

const RepositorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    owner: {
      type: Object,
      required: true,
    },
    full_name: { type: String },
    description: { type: String },
    stargazers_count: { type: Number },
    language: { type: String },
    topics: [{ type: String }],
    updated_at: { type: String },
    html_url: { type: String },
    default_branch: { type: String },
    license: {
      name: { type: String },
      url: { type: String },
    },
    changelog: [
      {
        timestamp: {
          type: Date,
          required: true,
        },
        sections: [
          {
            type: {
              type: String,
              enum: [
                "New Features",
                "Bug Fixes",
                "Breaking Changes",
                "Documentation",
                "Other",
              ],
              required: true,
            },
            changes: [
              {
                title: { type: String, required: true },
                description: { type: String, required: true },
                actionRequired: { type: String, required: true },
                mergedAt: { type: Date },
                prNumber: { type: Number },
                prUrl: { type: String },
                files: [{ type: String }],
              },
            ],
          },
        ],
        _id: false, // Disable automatic _id for subdocuments
      },
    ],
    lastGeneratedAt: { type: Date },
  },
  {
    timestamps: true,
    strict: false, // Allow fields not specified in the schema
  }
);

// Compound index to prevent duplicate repositories
RepositorySchema.index({ owner: 1, name: 1 }, { unique: true });

export default mongoose.model("Repository", RepositorySchema);
