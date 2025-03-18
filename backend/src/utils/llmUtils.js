/**
 * Cleans up the LLM response by removing markdown code blocks and any extra whitespace
 * @param {string} response - The raw response from the LLM
 * @returns {string} - The cleaned response
 */
export const cleanLLMResponse = (response) => {
  // Remove markdown code blocks and any language specifiers
  const withoutCodeBlocks = response.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1');
  // Trim any extra whitespace
  return withoutCodeBlocks.trim();
};

/**
 * Safely parses JSON from a string
 * @param {string} str - The string to parse
 * @returns {Object} - The parsed JSON object
 */
export const safeJSONParse = (str) => {
  try {
    return JSON.parse(str);
  } catch (error) {
    console.error("Error parsing JSON:", error);
    console.error("Problematic string:", str);
    throw new Error("Failed to parse JSON");
  }
};
