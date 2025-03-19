import { sendChatPrompt } from "./openaiService.js";
import { changelogSchema } from "../schemas/changelogSchema.js";
import { cleanLLMResponse, safeJSONParse } from "../utils/llmUtils.js";

/**
 * Converts filtered API changes into a user-readable changelog format.
 * @param {Object} apiChanges - The filtered API changes.
 * @returns {Promise<Object>} - The user-readable changelog.
 */
export const generateReadableChangelog = async (apiChanges) => {
  // Validate repository information
  // if (!repository || !repository.owner || !repository.owner.login || !repository.name) {
  //   throw new Error("Invalid repository information. Repository must include owner.login and name properties.");
  // }

  const prompt = `
You are an AI assistant tasked with converting API changes into a user-readable changelog format.
The users of this changelog are developers consuming the API provided by this codebase.

IMPORTANT: Categorize each change into these sections:

1. "New Features" - New endpoints, parameters, or functionality
2. "Bug Fixes" - Corrections to API behavior, error handling, or performance
3. "Breaking Changes" - Changes requiring client code updates (removed/renamed endpoints, modified parameters/responses)
4. "Documentation" - API docs, examples, guides, or schema updates
5. "Other" - Internal changes without API impact

For each change, provide:
1. Clear, concise title summarizing the change
2. Detailed description including:
   - What changed (parameters, types, behavior)
   - Why it changed (context)
   - Impact on API consumers
   - Important limitations or notes
   - Performance implications if relevant
3. Action Required section:
   - "No action required" if no changes needed
   - Step-by-step instructions if action needed

Format each change as:
## Category
- **Title**
  Description: [detailed explanation]
  **Action Required**: [steps or "No action required"]

Here is the data for analysis:
${JSON.stringify(apiChanges, null, 2)}
`;

  try {
    const response = await sendChatPrompt(
      prompt,
      "gpt-4o-mini",
      0.3,
      changelogSchema
    );
    console.log("Raw LLM response:", response);

    const cleanedResponse = cleanLLMResponse(response);
    console.log("Cleaned response:", cleanedResponse);

    const parsedChangelog = safeJSONParse(cleanedResponse);
    console.log("Parsed changelog:", parsedChangelog);

    return parsedChangelog;
  } catch (error) {
    console.error("Error generating readable changelog:", error);
    throw error;
  }
};
