export const apiChangesSchema = {
  type: "object",
  properties: {
    apiChanges: {
      type: "array",
      items: {
        type: "object",
        properties: {
          branchName: { type: "string" },
          prTitle: { type: "string" },
          prDescription: { type: "string" },
          mergedAt: { type: "string", format: "date-time" },
          summary: { type: "string" },
          breakingChange: { type: "boolean" },
          commits: {
            type: "array",
            items: {
              type: "object",
              properties: {
                sha: { type: "string" },
                message: { type: "string" },
                date: { type: "string", format: "date-time" },
                diffAnalysis: {
                  type: "object",
                  properties: {
                    technicalChanges: { type: "string" },
                    potentialImpact: { type: "string" },
                    breakingChange: { type: "boolean" },
                    affectedComponents: {
                      type: "array",
                      items: { type: "string" }
                    },
                    suggestedChangelogEntry: { type: "string" },
                    metadata: {
                      type: "object",
                      properties: {
                        filesAnalyzed: { type: "number" },
                        diffSize: { type: "number" }
                      },
                      required: ["filesAnalyzed", "diffSize"]
                    }
                  },
                  required: ["technicalChanges", "potentialImpact", "breakingChange", "affectedComponents", "suggestedChangelogEntry", "metadata"]
                },
                files: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      filename: { type: "string" },
                      status: { type: "string" },
                      changes: { type: "number" },
                    },
                    required: ["filename", "status", "changes"],
                  },
                },
              },
              required: ["sha", "message", "date", "diffAnalysis", "files"],
            },
          },
        },
        required: [
          "branchName",
          "prTitle",
          "prDescription",
          "mergedAt",
          "summary",
          "breakingChange",
          "commits",
        ],
      },
    },
  },
  required: ["apiChanges"],
  additionalProperties: false,
};
