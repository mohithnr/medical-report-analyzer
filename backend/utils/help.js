const { GoogleGenerativeAI } = require("@google/generative-ai");

const processHealthReportWithGemini = async () => {
  try {
    const genAI = new GoogleGenerativeAI("AIzaSyCZfsorcLmb9R2S9eQUnBg_t8qj-zAykec"); // Replace with your actual API key

    const model = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // const prompt = `
    // Given the following problem details from Codeforces, provide the full problem description, input, output format, example test cases, and any additional notes if available:
    // {
//   "problems": [
    // {
    //   "contestId": 2063,
    //   "index": "F2",
    //   "name": "Считать не весело (Сложная версия)",
    //   "type": "PROGRAMMING",
    //   "points": 1500,
    //   "tags": [
        // "combinatorics",
        // "data structures",
        // "dfs and similar",
        // "dsu",
        // "graphs",
        // "implementation",
        // "trees"
    //   ]
    // }
//   ]
// }
// Please include all necessary details in a structured JSON format for ease of use
// `;
const prompt=`
Please retrieve the following details for the Codeforces problem located at the link below:
Problem link: https://codeforces.com/problemset/problem/566/A

Provide the following information in a structured JSON format:
1. Problem Description
2. Input format
3. Output format
4. Example Test Cases
5. Constraints
6. Tags (if available)
7. Any additional notes (if available)

Ensure the data is structured as follows:

{
  "name": "Problem Name",
  "contestId": "Contest ID",
  "index": "Problem Index",
  "description": "Problem description here",
  "input": "Input format here",
  "output": "Output format here",
  "examples": [
    {
      "input": "Example input here",
      "output": "Example output here"
    },
    {
      "input": "Another example input",
      "output": "Another example output"
    }
  ],
  "tags": ["tag1", "tag2", "tag3"],
  "constraints": "Problem constraints here"
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
