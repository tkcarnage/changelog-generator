export const diffAnalysisSchema = {
  type: "object",
  properties: {
    technicalChanges: { 
      type: "string",
      description: "Description of technical modifications made"
    },
    potentialImpact: { 
      type: "string",
      description: "Assessment of the change's impact"
    },
    breakingChange: { 
      type: "boolean"
    },
    affectedComponents: {
      type: "array",
      items: { 
        type: "string",
        description: "List of affected components/files"
      }
    },
    suggestedChangelogEntry: { 
      type: "string",
      description: "A suggested entry for the changelog"
    },
    metadata: {
      type: "object",
      properties: {
        filesAnalyzed: { type: "number" },
        diffSize: { type: "number" }
      },
      required: ["filesAnalyzed", "diffSize"]
    }
  },
  required: [
    "technicalChanges",
    "potentialImpact",
    "breakingChange",
    "affectedComponents",
    "suggestedChangelogEntry",
    "metadata"
  ],
  additionalProperties: false
};
