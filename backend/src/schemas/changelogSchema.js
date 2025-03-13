export const changelogSchema = {
  type: "object",
  properties: {
    repository: {
      type: "object",
      properties: {
        owner: { type: "string" },
        name: { type: "string" },
        full_name: { type: "string" }
      },
      required: ["owner", "name", "full_name"]
    },
    timestamp: { type: "string", format: "date-time" },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["New Features", "Bug Fixes", "Breaking Changes", "Documentation", "Other"] },
          changes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                actionRequired: { type: "string" },
                mergedAt: { type: "string", format: "date-time" },
                files: {
                  type: "array",
                  items: { type: "string" }
                }
              },
              required: ["title", "description", "actionRequired"]
            }
          }
        },
        required: ["type", "changes"]
      }
    }
  },
  required: ["repository", "timestamp", "sections"],
  additionalProperties: false
};
