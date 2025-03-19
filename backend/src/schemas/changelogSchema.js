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
                actionRequired: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      description: { type: "string" },
                      code: { type: "string" },
                      codeLanguage: { type: "string" },
                      link: {
                        type: "object",
                        properties: {
                          url: { type: "string" },
                          text: { type: "string" },
                        },
                        required: ["url", "text"],
                      },
                      deadline: { type: "string" },
                    },
                    required: ["description"],
                  },
                },
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
