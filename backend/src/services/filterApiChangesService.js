import { sendChatPrompt } from "./openaiService.js";
import { apiChangesSchema } from "../schemas/apiChangesSchema.js";
import { cleanLLMResponse, safeJSONParse } from "../utils/llmUtils.js";

/**
 * Filters API changes relevant to customers based on detailed commit data.
 * @param {Array} commitData - The list of detailed commit data.
 * @returns {Promise<Object>} - The filtered API changes in a structured JSON format.
 */
export const filterApiChanges = async (commitData) => {
  if (!commitData || !Array.isArray(commitData)) {
    throw new Error("Invalid commit data format");
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
You are an AI assistant tasked with identifying changes in the repository that might be relevant to users or consumers of the codebase.

Consider including any changes that:
1. Modify or add new functionality
2. Change behavior or interfaces
3. Affect how users interact with the code
4. Update dependencies or configurations
5. Fix bugs or issues

Only exclude changes that are purely:
- Code formatting or style changes
- Internal comments
- Test files without implementation changes

If there are ANY potentially relevant changes, include them in the response. If truly nothing relevant is found, respond only with "No action required".

Return the response in this JSON structure:
{
  "apiChanges": [
    {
      "branchName": "string",
      "prTitle": "string",
      "prDescription": "string",
      "mergedAt": "date-time string",
      "summary": "string describing the change",
      "breakingChange": boolean,
      "commits": [
        {
          "sha": "string",
          "message": "string",
          "date": "date-time string",
          "rawDiff": "string",
          "files": [
            {
              "filename": "string",
              "status": "string",
              "changes": number
            }
          ]
        }
      ]
    }
  ]
}

Commit data to analyze:
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
    const parsed = safeJSONParse(cleanedApiChangesStr);
    
    // Ensure we return the correct structure
    return {
      changes: parsed.apiChanges || []
    };
  } catch (error) {
    console.error("Error filtering API changes:", error);
    throw error;
  }
};
