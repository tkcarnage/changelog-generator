import { encode } from "gpt-tokenizer";

/**
 * Calculates the token count of a given string using the gpt-tokenizer library.
 * @param {string} text - The input text to tokenize.
 * @returns {number} - The number of tokens in the input text.
 */
export const calculateTokenCount = (text) => {
  if (!text || typeof text !== "string") {
    throw new Error("Invalid input: text must be a non-empty string.");
  }

  const tokens = encode(text);
  return tokens.length;
};
