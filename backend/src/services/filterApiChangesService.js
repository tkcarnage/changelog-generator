import { sendChatPrompt } from "./openaiService.js";
import { apiChangesSchema } from "../schemas/apiChangesSchema.js";
import { cleanLLMResponse, safeJSONParse } from "../utils/llmUtils.js";

/**
 * Filters API changes relevant to customers based on detailed commit data.
 * @param {Array} commitData - The list of detailed commit data.
 * @returns {Promise<Object>} - The filtered API changes in a structured JSON format.
 */
export const filterApiChanges = async (commitData) => {
  if (!commitData || !Array.isArray(commitData)) {
    throw new Error("Invalid commit data format");
  }

  // Prepare a simplified version of commit data
  const formattedCommits = commitData.map((commit) => ({
    branchName: commit.branchName,
    prTitle: commit.prTitle,
    prDescription: commit.prDescription,
    mergedAt: commit.mergedAt,
    commits: commit.commits.map((c) => ({
      sha: c.sha,
      message: c.message,
      date: c.date,
      files: c.files.map((file) => ({
        filename: file.filename,
        status: file.status,
        changes: file.changes,
      })),
    })),
  }));

  // Construct the prompt
  const prompt = `
You are an AI assistant tasked with identifying **customer-facing API changes** from the provided commit data.
Focus on commits that:
1. Modify API endpoints, request/response formats, authentication, or error handling.
2. Introduce breaking changes or deprecate existing functionality.
3. Add new API routes, parameters, or features visible to customers.

Ignore commits unrelated to API consumers, such as:
- Internal refactoring or code cleanup.
- Changes to internal tools or build processes.
- Documentation updates that don't affect API behavior.
- Non-functional changes like formatting or comments.

Analyze the following commit data:
${JSON.stringify(formattedCommits, null, 2)}
`;

  try {
    const apiChangesStr = await sendChatPrompt(
      prompt,
      "gpt-4o-mini",
      0.3,
      apiChangesSchema
    );
    console.log("raw apiChangesStr:", apiChangesStr);

    const cleanedApiChangesStr = cleanLLMResponse(apiChangesStr);
    const parsed = safeJSONParse(cleanedApiChangesStr);

    // Ensure we return the correct structure
    return {
      changes: parsed.apiChanges || [],
    };
  } catch (error) {
    console.error("Error filtering API changes:", error);
    throw error;
  }
};
