const { GoogleGenerativeAI } = require("@google/generative-ai");

const processHealthReportWithGemini = async (extractedText, language) => {
  try {
    const genAI = new GoogleGenerativeAI("AIzaSyCZfsorcLmb9R2S9eQUnBg_t8qj-zAykec"); // Replace with your actual API key

    const model = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log("Extracted Text in gemini:", extractedText);
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

    console.log("Extracted Summary:", responseContent);

    return {
      summary: responseContent,
    };
  } catch (error) {
    console.error("Error generating content with Gemini API:", error.message);
    throw error;
  }
};

module.exports = { processHealthReportWithGemini };