import { sendChatPrompt } from "./openaiService.js";
import { apiChangesSchema } from "../schemas/apiChangesSchema.js";
import { cleanLLMResponse, safeJSONParse } from "../utils/llmUtils.js";

/**
 * Filters customer-impacting changes relevant to customers based on detailed commit data.
 * @param {Array} commitData - The list of detailed commit data.
 * @param {Object} repository - The repository information.
 * @returns {Promise<Object>} - The filtered customer-impacting changes in a structured JSON format.
 */
export const filterApiChanges = async (commitData, repository) => {
  if (!commitData || !Array.isArray(commitData)) {
    throw new Error("Invalid commit data format");
  }

  if (!repository || !repository.owner || !repository.repo) {
    throw new Error("Invalid repository information");
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
You are an AI assistant tasked with identifying **customer-impacting changes** for the repository.
Focus on commits that:
1. Modify API endpoints, request/response formats, authentication, or error handling.
2. Introduce breaking changes or deprecate existing functionality.
3. Add new features, parameters, or capabilities visible to customers.
4. Change behavior that could affect customer workflows.
5. Update dependencies that require customer action.
6. Modify configuration options or environment variables.
7. Change performance characteristics that impact users.

Ignore commits that are purely:
- Internal refactoring without behavioral changes
- Code cleanup or formatting
- Build process changes without user impact
- Documentation fixes for typos
- Test updates without feature changes

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
    return safeJSONParse(cleanedApiChangesStr);
  } catch (error) {
    console.error("Error filtering customer-impacting changes:", error);
    throw error;
  }
};
