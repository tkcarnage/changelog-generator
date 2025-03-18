import mongoose from "mongoose";

const RepositorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    owner: {
      login: { type: String, required: true },
      avatar_url: { type: String },
      html_url: { type: String },
      type: { type: String }
    },
    full_name: { type: String },
    description: { type: String },
    stargazers_count: { type: Number, default: 0 },
    language: { type: String },
    topics: [{ type: String }],
    created_at: { type: Date },
    updated_at: { type: Date },
    html_url: { type: String },
    default_branch: { type: String },
    lastGeneratedAt: { type: Date },
    license: {
      name: { type: String },
      url: { type: String },
    },
    changelog: [{
      timestamp: { 
        type: Date, 
        required: true 
      },
      sections: [{
        type: { 
          type: String,
          enum: ['New Features', 'Bug Fixes', 'Breaking Changes', 'Documentation', 'Other'],
          required: true
        },
        changes: [{
          title: { type: String },
          description: { type: String },
          prNumber: { type: Number },
          prUrl: { type: String },
          mergedAt: { type: Date },
          files: [{ type: String }],
          actionRequired: { type: String }
        }]
      }],
      _id: false  // Disable automatic _id for subdocuments
    }],
  },
  { 
    timestamps: true
  }
);

// Compound index to prevent duplicate repositories
RepositorySchema.index({ 'owner.login': 1, 'name': 1 }, { unique: true });

export default mongoose.model("Repository", RepositorySchema);
