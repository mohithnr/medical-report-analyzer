const { processHealthReportWithGemini } = require("./help");

(async () => {
  try {
    console.log("Calling the Gemini API...");
    const result = await processHealthReportWithGemini();
    console.log("Result:", result);
  } catch (error) {
    console.error("Error:", error.message);
  }
})();
