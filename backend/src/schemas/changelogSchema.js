export const changelogSchema = {
  type: "object",
  properties: {
    sections: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: [
              "New Features",
              "Bug Fixes",
              "Breaking Changes",
              "Documentation",
              "Other",
            ],
          },
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
                  items: { type: "string" },
                },
              },
              required: ["title", "description"],
            },
          },
        },
        required: ["type", "changes"],
      },
      uniqueItems: true,
    },
  },
  required: ["sections"],
  additionalProperties: false,
};
