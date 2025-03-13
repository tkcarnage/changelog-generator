import mongoose from "mongoose";

const RepositorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    full_name: { type: String, required: true },
    description: { type: String },
    owner: {
      login: { type: String, required: true },
      avatar_url: { type: String },
    },
    stargazers_count: { type: Number, default: 0 },
    language: { type: String },
    topics: [{ type: String }],
    updated_at: { type: Date },
    html_url: { type: String, required: true },
    default_branch: { type: String, required: true },
    license: {
      name: { type: String },
      url: { type: String },
    },
    changelog: [{
      timestamp: { type: Date },
      sections: [{
        type: { type: String },
        changes: [{
          title: { type: String },
          description: { type: String },
          prNumber: { type: Number, required: false },
          prUrl: { type: String, required: false },
          mergedAt: { type: Date, required: false },
          files: [{ type: mongoose.Schema.Types.Mixed }],  // More flexible file structure
          actionRequired: { type: String, required: false }
        }]
      }],
      _id: false  // Disable automatic _id for subdocuments
    }],
  },
  { 
    timestamps: true,
    strict: false  // Allow fields not specified in the schema
  }
);

export default mongoose.model("Repository", RepositorySchema);
