export const apiChangesSchema = {
  type: "object",
  properties: {
    changes: {
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
                rawDiff: { type: "string" },
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
              required: ["sha", "message", "date", "rawDiff", "files"],
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
  required: ["actionRequired", "changes"],
  additionalProperties: false,
};
