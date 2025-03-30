const express = require("express");
const multer = require("multer");
const { extractTextFromImage } = require("./utils/ocr");
const { processHealthReportWithGemini } = require("./utils/gemini");
const { generatePDF } = require("./utils/pdfGenerator");
const cors = require('cors');

const app = express();

// Configure multer to use memory storage instead of disk storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(cors({ 
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Modified upload endpoint to work with memory storage
app.post("/upload", upload.single("report"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Use the buffer instead of file path
    const extractedText = await extractTextFromImage(req.file.buffer);
    
    const { summary, abnormalities, recommendations } =
      await processHealthReportWithGemini(extractedText, req.body.language);

    // Generate PDF in memory
    const pdfBuffer = await generatePDF({
      text: summary,
      abnormalities,
      recommendations,
      language: req.body.language,
    });

    // Send response with base64 encoded PDF
    res.json({
      summary,
      abnormalities,
      recommendations,
      pdfData: pdfBuffer.toString('base64')
    });

  } catch (error) {
    console.error("Error processing report:", error);
    res.status(500).json({ 
      error: "Error processing report", 
      details: error.message 
    });
  }
});

// Remove file system operations
app.delete("/delete-files", (req, res) => {
  res.status(200).json({ message: "Operation completed" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS error',
      message: 'Origin not allowed',
      origin: req.headers.origin
    });
  }
  res.status(500).json({
    error: 'Server error',
    message: err.message
  });
});

// Export the app instead of starting the server
module.exports = app;
