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

IMPORTANT: You MUST analyze each change and categorize it into the MOST APPROPRIATE section based on these criteria:

1. "New Features" - ONLY for:
   - New API endpoints or routes
   - New parameters or fields added to existing endpoints
   - New functionality that didn't exist before

2. "Bug Fixes" - ONLY for:
   - Corrections to incorrect API behavior
   - Fixes for error handling or validation
   - Resolution of issues in existing endpoints
   - Performance fixes or optimizations

3. "Breaking Changes" - ONLY for:
   - Removed or renamed endpoints
   - Changed parameter types or requirements
   - Modified response formats
   - Changes that require client code updates

4. "Documentation" - ONLY for:
   - API documentation updates
   - New examples or guides
   - Clarifications to existing docs
   - Schema documentation changes

5. "Other" - ONLY for changes that don't fit above:
   - Internal refactoring without API impact
   - Development workflow changes
   - Non-functional improvements

For each change, you MUST:
1. Be specific about what exactly changed in the API
2. Explain the impact on API consumers
3. For "Action Required":
   - If no action is needed, simply write "No action required"
   - If action is needed, provide if you can:
     * Step-by-step instructions with code examples
     * Timeline for required changes
     * Links to relevant documentation

Here are examples of properly categorized changes:

## Bug Fixes
- **Fixed 500 Error in /users/create Endpoint**
  The endpoint was failing when processing unicode usernames due to incorrect character encoding.
  **Action Required**: No action required

## Breaking Changes
- **Changed Response Format of /orders/{id}**
  The 'status' field is now an enum instead of a string to ensure consistency across the API.
  **Action Required**:
  1. Update your client code to handle the new enum values:
     \`\`\`javascript
     // Before
     if (order.status === 'in_progress') { ... }

     // After
     const OrderStatus = {
       PENDING: 'pending',
       PROCESSING: 'processing',
       COMPLETED: 'completed',
       FAILED: 'failed'
     }
     if (order.status === OrderStatus.PROCESSING) { ... }
     \`\`\`
  2. Complete these changes by April 1st, 2025
  3. See migration guide: docs/migrations/order-status-enum.md

## New Features
- **Added Pagination to /products Endpoint**
  Added 'page' and 'limit' query parameters for paginated results to improve performance.
  **Action Required**:
  1. Optional: Update your code to use pagination:
     \`\`\`javascript
     // Before
     const products = await api.get('/products');

     // After
     const products = await api.get('/products', {
       params: { page: 1, limit: 50 }
     });
     \`\`\`
  2. See docs/api/pagination.md for details

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
