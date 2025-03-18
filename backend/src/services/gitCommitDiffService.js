import { sendChatPrompt } from "./openaiService.js";
import { cleanLLMResponse, safeJSONParse } from "../utils/llmUtils.js";
import { diffAnalysisSchema } from "../schemas/diffAnalysisSchema.js";

/**
 * Analyzes a git diff and provides a structured summary of the changes
 * @param {string} rawDiff - The raw git diff content
 * @returns {Promise<Object>} - Structured summary of the changes
 */
export const analyzeDiff = async (rawDiff) => {
  if (!rawDiff) {
    throw new Error("No diff content provided");
  }

  const fileChanges = rawDiff.split("diff --git").filter(Boolean);
  const affectedFiles = fileChanges.map((change) => {
    const lines = change.split("\n");
    const fileLine = lines[0].trim();
    return fileLine.split(" ")[1].replace("a/", "");
  });

  const prompt = `
You are an AI assistant tasked with analyzing git diffs to provide structured summaries.
Focus on:
1. Technical changes made and their implementation details
2. Potential impact on the system and its users
3. Detection of breaking changes
4. Identification of affected components and dependencies

The diff affects ${affectedFiles.length} files:
${affectedFiles.join("\n")}

Git Diff:
\`\`\`
${rawDiff}
\`\`\`
`;

  try {
    const analysisStr = await sendChatPrompt(
      prompt,
      "gpt-4o-mini",
      0.1,
      diffAnalysisSchema
    );
    console.log("Raw diff analysis:", analysisStr);

    const cleanedAnalysis = cleanLLMResponse(analysisStr);
    return safeJSONParse(cleanedAnalysis);
  } catch (error) {
    console.error("Error analyzing diff:", error);
    throw error;
  }
};
