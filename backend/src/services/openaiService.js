import { Configuration, OpenAIApi } from "openai";
import dotenv from "dotenv";
import { calculateTokenCount } from "../utils/tokenizer.js";

dotenv.config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Constants
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MODEL_NAME = "gpt-4o-mini"; // Standardized model name

/**
 * Implements exponential backoff retry logic
 * @param {Function} operation - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} initialDelay - Initial delay in milliseconds
 * @returns {Promise<any>} - Result of the operation
 */
const withRetry = async (
  operation,
  maxRetries = MAX_RETRIES,
  initialDelay = INITIAL_RETRY_DELAY
) => {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) break;

      // Check if error is rate limit related
      const isRateLimit =
        error.response?.status === 429 ||
        error.message.toLowerCase().includes("rate limit");

      if (!isRateLimit) throw error;

      const delay = initialDelay * Math.pow(2, attempt);
      console.log(
        `Rate limit hit. Retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxRetries})`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

/**
 * Formats the system prompt to ensure proper JSON response
 * @param {string} basePrompt - The base prompt content
 * @param {Object} jsonFormat - The expected JSON format
 * @returns {string} - The formatted system prompt
 */
const formatSystemPrompt = (basePrompt, jsonFormat) => {
  const systemPrompt = `

${basePrompt}

Response Format:
${JSON.stringify(jsonFormat, null, 2)}

Remember: Return ONLY the JSON object, nothing else.`;

  return systemPrompt;
};

/**
 * Sends a prompt to OpenAI's chat completions endpoint and returns the response content.
 * @param {string} prompt - The prompt content.
 * @param {string} [model=MODEL_NAME] - The model to use.
 * @param {number} [temperature=0.3] - The sampling temperature.
 * @param {Object} [jsonFormat] - The expected JSON format to include in the prompt.
 * @returns {Promise<string>} - The message content from OpenAI's response.
 */
export const sendChatPrompt = async (
  prompt,
  model = MODEL_NAME,
  temperature = 0.1,
  jsonFormat
) => {
  const systemPrompt = jsonFormat
    ? formatSystemPrompt(prompt, jsonFormat)
    : prompt;

  const messages = [
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: "Generate the json following the exact format specified.",
    },
  ];

  const payload = {
    model,
    messages,
    temperature,
    response_format: { type: "json_object" },
  };

  // Log token count for debugging
  const tokenCount = calculateTokenCount(systemPrompt);
  console.log(`Token count for the prompt: ${tokenCount}`);
  console.log(
    "Payload being sent to OpenAI:",
    JSON.stringify(payload, null, 2)
  );

  return await withRetry(async () => {
    const response = await openai.createChatCompletion(payload);
    const content = response.data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No content received from OpenAI");
    }

    // Validate that the response is JSON
    try {
      JSON.parse(content);
      return content;
    } catch (parseError) {
      console.error("Invalid JSON response from OpenAI:", content);
      throw new Error("OpenAI response was not valid JSON");
    }
  });
};
