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

IMPORTANT: You MUST categorize ALL changes provided in the input. Do not skip or filter out any changes.
Each change MUST be placed into one of these categories: "New Features", "Bug Fixes", "Breaking Changes", "Documentation", or "Other".

The changelog should follow this format:
1. Group ALL changes by type into these sections:
   - New Features (new functionality, enhancements, additions)
   - Bug Fixes (error corrections, issue resolutions)
   - Breaking Changes (backward incompatible changes)
   - Documentation (docs, guides, examples)
   - Other (internal improvements, refactoring)

2. For EACH change in the input:
   - Write a clear, concise title
   - Provide a brief but informative description
   - Include any action required by developers
   - Preserve the original mergedAt date
   - List affected files

Here are examples of how the changelog should be formatted:

## New Features
- **Support for Webhooks in API v2**  
  Webhooks are now supported in API v2, allowing developers to receive real-time notifications for specific events.  
  **Action Required**: Update your integration to handle webhook events.

## Bug Fixes
- **Fixed Incorrect Error Codes for Payment Failures**  
  Resolved an issue where incorrect error codes were returned for certain payment failures.  
  **Action Required**: No action required.

Here is the data for analysis:
${JSON.stringify(apiChanges, null, 2)}
`;

  try {
    const response = await sendChatPrompt(
      prompt,
      "gpt-4o",
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
