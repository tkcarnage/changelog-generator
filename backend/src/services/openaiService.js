import { Configuration, OpenAIApi } from "openai";
import dotenv from "dotenv";
import { calculateTokenCount } from "../utils/tokenizer.js";

dotenv.config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const MODEL_NAME = "gpt-4o-mini";
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

const formatSystemPrompt = (basePrompt, jsonFormat) => {
  const systemPrompt = `Remember this is for a changelog generator app
${basePrompt}

Response Format:
${JSON.stringify(jsonFormat, null, 2)}

Remember: Return ONLY the JSON object, nothing else.`;
  return systemPrompt;
};

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

export const sendChatPrompt = async (
  prompt,
  model = MODEL_NAME,
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
    response_format: { type: "json_object" },
  };

  console.log(
    `Token count for the prompt: ${calculateTokenCount(systemPrompt)}`
  );
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

    try {
      JSON.parse(content);
      return content;
    } catch (parseError) {
      console.error("Invalid JSON response from OpenAI:", content);
      throw new Error("OpenAI response was not valid JSON");
    }
  });
};
