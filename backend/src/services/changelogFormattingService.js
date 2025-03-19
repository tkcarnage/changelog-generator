import { sendChatPrompt } from "./openaiService.js";
import { changelogSchema } from "../schemas/changelogSchema.js";
import { cleanLLMResponse, safeJSONParse } from "../utils/llmUtils.js";

/**
 * Converts filtered API changes into a user-readable changelog format.
 * @param {Object} apiChanges - The filtered API changes.
 * @returns {Promise<Object>} - The user-readable changelog.
 */
export const generateReadableChangelog = async (apiChanges) => {
  const prompt = `
You are an AI assistant tasked with converting API changes into a user-readable changelog format.
The users of this changelog are developers consuming the API provided by this codebase.
The changelog should follow a format similar to Stripe's changelog:
- Group changes by type (e.g., "New Features", "Bug Fixes", "Breaking Changes").
- Use a clear and concise title for each change.
- Provide a brief description of the change, including any relevant details.
- Indicate whether the change is a breaking change.
- Include steps developers need to take to update their code if necessary.

Here are examples of how the changelog should be formatted:

## New Features
- **Support for Webhooks in API v2**  
  Webhooks are now supported in API v2, allowing developers to receive real-time notifications for specific events.  
  **Action Required**: Update your integration to handle webhook events.

## Bug Fixes
- **Fixed Incorrect Error Codes for Payment Failures**  
  Resolved an issue where incorrect error codes were returned for certain payment failures.  
  **Action Required**: No action required.

## Breaking Changes
- **Deprecated Legacy Authentication Method**  
  The legacy authentication method has been deprecated and will be removed in the next major release.  
  **Action Required**: Migrate to the new OAuth-based authentication method before the deprecation date.

Here is the data for analysis:
${JSON.stringify(apiChanges, null, 2)}
  `;

  try {
    const changelogStr = await sendChatPrompt(
      prompt,
      "gpt-4o-mini",
      0.3,
      changelogSchema
    );
    console.log("Raw LLM response:", changelogStr);

    const cleanedResponse = cleanLLMResponse(changelogStr);
    console.log("Cleaned response:", cleanedResponse);

    const parsedChangelog = safeJSONParse(cleanedResponse);
    console.log("Parsed changelog:", parsedChangelog);

    return parsedChangelog;
  } catch (error) {
    console.error("Error generating readable changelog:", error);
    throw error;
  }
};
