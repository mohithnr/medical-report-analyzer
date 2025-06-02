const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

// Get API key from environment variables with validation
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not defined in environment variables');
}

const processHealthReportWithGemini = async (extractedText, language) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
  Summarize the following medical report in ${language}. Ensure the summary includes:
  - Key findings,
  - abnormalities,
  - Recommended next steps or treatments,
  - Relevant health advice or follow-up actions.
  
  Medical Report:
  ${extractedText.rawText}
  
  Please respond in the following structured JSON format:
  {
    "keyFindings": "Summary of abnormalities or notable results.",
    "abnormalities": [
      {
        "test": "Name of the test",
        "result": "Result of the test",
        "normalRange": "Normal range for the test",
        "abnormality": "Explanation of why the result is abnormal"
      }
    ],
    "recommendedSteps": "Suggestions for next steps or treatment.",
    "healthAdvice": "General health advice or follow-ups."
  }
`;

    const result = await model.generateContent(prompt);
    const responseContent = result?.response?.text() || "No response provided";

    // Parse and validate the response
    const parseResponse = (content) => {
      try {
        // Clean up the response text (remove markdown if present)
        const cleanContent = content.replace(/```json\s*|\s*```/g, '').trim();
        const parsed = JSON.parse(cleanContent);

        // Validate and structure the response
        return {
          keyFindings: typeof parsed.keyFindings === 'string' ? parsed.keyFindings.trim() : '',
          abnormalities: Array.isArray(parsed.abnormalities) ? 
            parsed.abnormalities.map(item => ({
              test: (item.test || '').trim(),
              result: (item.result || '').trim(),
              normalRange: (item.normalRange || '').trim(),
              abnormality: (item.abnormality || '').trim()
            })) : [],
          recommendedSteps: typeof parsed.recommendedSteps === 'string' ? parsed.recommendedSteps.trim() : '',
          healthAdvice: typeof parsed.healthAdvice === 'string' ? parsed.healthAdvice.trim() : ''
        };
      } catch (parseError) {
        console.error("Error parsing Gemini response:", parseError);
        throw new Error("Failed to parse medical report summary");
      }
    };

    // Parse and validate the response
    const parsedSummary = parseResponse(responseContent);
    
    console.log("Parsed Summary:", parsedSummary.keyFindings);

    // Validate the parsed summary has content
    if (!parsedSummary.keyFindings && 
        !parsedSummary.abnormalities.length && 
        !parsedSummary.recommendedSteps && 
        !parsedSummary.healthAdvice) {
      throw new Error("Generated summary is empty or invalid");
    }

    return {
      summary: parsedSummary // Send structured object instead of raw text
    };

  } catch (error) {
    console.error("Error generating content with Gemini API:", error.message);
    throw error;
  }
};

module.exports = { processHealthReportWithGemini };