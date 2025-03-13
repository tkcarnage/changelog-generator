import { Configuration, OpenAIApi } from "openai";
import dotenv from "dotenv";
import { calculateTokenCount } from "../utils/tokenizer.js";

dotenv.config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

/**
 * Formats the system prompt to ensure proper JSON response
 * @param {string} basePrompt - The base prompt content
 * @param {Object} jsonFormat - The expected JSON format
 * @returns {string} - The formatted system prompt
 */
const formatSystemPrompt = (basePrompt, jsonFormat) => {
  const systemPrompt = `You are a helpful assistant that generates a JSON object based on the provided prompt.

${basePrompt}

Response Format:
${JSON.stringify(jsonFormat, null, 2)}

Remember: Return ONLY the JSON object, nothing else.`;

  return systemPrompt;
};

/**
 * Sends a prompt to OpenAI's chat completions endpoint and returns the response content.
 * @param {string} prompt - The prompt content.
 * @param {string} [model="o3-mini"] - The model to use.
 * @param {number} [temperature=0.3] - The sampling temperature.
 * @param {Object} [jsonFormat] - The expected JSON format to include in the prompt.
 * @returns {Promise<string>} - The message content from OpenAI's response.
 */
export const sendChatPrompt = async (
  prompt,
  model = "o3-mini",
  temperature = 0.3,
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
      content: "Generate the changelog following the exact format specified.",
    },
  ];

  const payload = {
    model,
    messages,
    temperature,
    response_format: { type: "json_object" }, // Request JSON response
  };

  try {
    // Log token count and payload for debugging
    const tokenCount = calculateTokenCount(systemPrompt);
    console.log(`Token count for the prompt: ${tokenCount}`);
    console.log(
      "Payload being sent to OpenAI:",
      JSON.stringify(payload, null, 2)
    );

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
  } catch (error) {
    console.error("OpenAI API Error:", error);
    throw new Error(`OpenAI API Error: ${error.message}`);
  }
};
