const express = require("express");
const multer = require("multer");
const { extractTextFromImage } = require("./utils/ocr");
const { processHealthReportWithGemini } = require("./utils/gemini");
const { generatePDF } = require("./utils/pdfGenerator");
const fs = require("fs");
const cors = require("cors");
const path = require("path");

const app = express();

// Multer memory storage for serverless compatibility
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

app.use(express.json());

// --- Asynchronous processing helper ---
const processReportAsync = async (fileBuffer, language) => {
  try {
    const extractedText = await extractTextFromImage(fileBuffer);
    const result = await processHealthReportWithGemini(extractedText, language);

    const summaryPayload = {
      keyFindings: result.summary,
      abnormalities: result.abnormalities,
      recommendedSteps: result.recommendations,
      healthAdvice: result.healthAdvice || ''
    };

    const pdfBuffer = await generatePDF({ summary: summaryPayload });

    return {
      summary: summaryPayload,
      pdfData: pdfBuffer.toString('base64')
    };
  } catch (error) {
    console.error("Error in async processing:", error);
    throw error;
  }
};

// --- Upload endpoint ---
app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const fileBuffer = req.file.buffer;
  const language = req.body.language || "en";

  try {
    // Optional: respond immediately and process in background
    // For now, let's still wait but allow long timeout on frontend
    const result = await processReportAsync(fileBuffer, language);

    res.json(result);
  } catch (error) {
    console.error("Error processing report:", error);
    res.status(500).json({
      error: "Error processing report",
      details: error.message
    });
  }
});

// --- Delete files endpoint ---
app.delete("/delete-files", (req, res) => {
  try {
    ['uploads', 'pdfs'].forEach(dir => {
      if (fs.existsSync(dir)) {
        fs.readdirSync(dir).forEach(file => {
          const filePath = path.join(dir, file);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        });
      }
    });
    res.json({ message: "Files deleted successfully" });
  } catch (error) {
    console.error("Error deleting files:", error);
    res.status(500).json({ error: "Failed to delete files" });
  }
});

// --- Error handling middleware ---
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    error: 'Server error',
    message: err.message
  });
});

// --- Start server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
