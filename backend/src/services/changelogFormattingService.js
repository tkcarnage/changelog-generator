import { sendChatPrompt } from "./openaiService.js";
import { changelogSchema } from "../schemas/changelogSchema.js";
import { cleanLLMResponse, safeJSONParse } from "../utils/llmUtils.js";

/**
 * Converts filtered API changes into a user-readable changelog format.
 * @param {Object} apiChanges - The filtered API changes with diff analysis.
 * @returns {Promise<Object>} - The user-readable changelog.
 */
export const generateReadableChangelog = async (apiChanges) => {
  // Prepare a more structured format of changes for the LLM
  const structuredChanges = apiChanges.apiChanges.map(change => ({
    type: change.type || 'Unspecified',
    commits: change.commits.map(commit => ({
      sha: commit.sha,
      message: commit.message,
      analysis: commit.diffAnalysis ? {
        technicalChanges: commit.diffAnalysis.technicalChanges,
        potentialImpact: commit.diffAnalysis.potentialImpact,
        breakingChange: commit.diffAnalysis.breakingChange,
        affectedComponents: commit.diffAnalysis.affectedComponents,
        suggestedEntry: commit.diffAnalysis.suggestedChangelogEntry
      } : null,
      prInfo: commit.prInfo ? {
        number: commit.prInfo.number,
        title: commit.prInfo.title,
        url: commit.prInfo.html_url,
        mergedAt: commit.prInfo.mergedAt
      } : null,
      files: commit.files.map(file => ({
        filename: file.filename,
        changes: file.changes
      }))
    }))
  }));

  console.log('Structured changes for LLM:', JSON.stringify(structuredChanges, null, 2));

  const prompt = `
You are an AI assistant tasked with converting API changes into a user-readable changelog format.
The users of this changelog are developers consuming the API provided by this codebase.

For each change, you have:
1. Technical analysis of the changes
2. Assessment of potential impact
3. Whether it's a breaking change
4. Affected components
5. Suggested changelog entry
6. Pull request information

Group the changes into sections and format them according to our schema:
{
  "timestamp": "current date in ISO format",
  "sections": [
    {
      "type": "Breaking Changes" | "New Features" | "Bug Fixes" | "Documentation" | "Other",
      "changes": [
        {
          "title": "Title of the change (use suggestedEntry or PR title)",
          "description": "Technical description of the change",
          "actionRequired": "What developers need to do (if anything)",
          "mergedAt": "PR merge date in ISO format",
          "prNumber": "PR number if available",
          "prUrl": "PR URL if available",
          "files": ["list of affected files"]
        }
      ]
    }
  ]
}

Here is the analyzed change data:
${JSON.stringify(structuredChanges, null, 2)}
`;

  try {
    const changelogStr = await sendChatPrompt(prompt, "gpt-4o-mini", 0.3, changelogSchema);
    console.log("Raw LLM response:", changelogStr);
    
    const cleanedResponse = cleanLLMResponse(changelogStr);
    console.log("Cleaned response:", cleanedResponse);
    
    const parsedChangelog = safeJSONParse(cleanedResponse);
    console.log("Parsed changelog:", parsedChangelog);
    
    if (!parsedChangelog || !parsedChangelog.sections) {
      console.error("Invalid changelog format received from LLM");
      // Return a minimal valid changelog
      return {
        timestamp: new Date().toISOString(),
        sections: []
      };
    }
    
    return {
      ...parsedChangelog,
      timestamp: new Date().toISOString() // Ensure timestamp is current
    };
  } catch (error) {
    console.error("Error generating readable changelog:", error);
    // Return a minimal valid changelog instead of throwing
    return {
      timestamp: new Date().toISOString(),
      sections: []
    };
  }
};
