const express = require("express");
const multer = require("multer");
const { extractTextFromImage } = require("./utils/ocr");
const { processHealthReportWithGemini } = require("./utils/gemini");
const { generatePDF } = require("./utils/pdfGenerator");
const fs = require("fs");
const cors = require('cors');
const path = require("path");

const app = express();

// Configure multer with disk storage for local development
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// CORS configuration
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

app.use(express.json());

// Ensure required directories exist
const ensureDirectories = () => {
  ['uploads', 'pdfs'].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

ensureDirectories();

// Serve PDFs statically
app.use("/pdfs", express.static("pdfs"));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Upload endpoint
app.post("/upload", upload.single("file"), async (req, res) => {
  const uploadedPath = req.file?.path;
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const extractedText = await extractTextFromImage(uploadedPath);
    const result = await processHealthReportWithGemini(extractedText, req.body.language);

    const summaryPayload = {
      keyFindings: result.summary,
      abnormalities: result.abnormalities,
      recommendedSteps: result.recommendations,
      healthAdvice: result.healthAdvice || ''
    };

    const pdfBuffer = await generatePDF({ summary: summaryPayload });

    if (fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);

    res.json({
      summary: summaryPayload,
      pdfData: pdfBuffer.toString('base64')
    });

  } catch (error) {
    console.error("Error processing report:", error);
    if (uploadedPath && fs.existsSync(uploadedPath)) {
      fs.unlinkSync(uploadedPath);
    }
    res.status(500).json({
      error: "Error processing report",
      details: error.message
    });
  }
});

// Delete files endpoint
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Server error',
    message: err.message
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
