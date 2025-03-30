const express = require("express");
const multer = require("multer");
const { extractTextFromImage } = require("./utils/ocr");
const { processHealthReportWithGemini } = require("./utils/gemini");
const { generatePDF } = require("./utils/pdfGenerator");
const fs = require("fs");
const cors = require('cors');
const path = require("path");

const app = express();
const upload = multer({ dest: "uploads/" });

// CORS configuration
app.use(cors({ 
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

app.use(express.json());

// Ensure directories exist
const ensureDirectories = () => {
  ['uploads', 'pdfs'].forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
};

ensureDirectories();

app.use("/pdfs", express.static(path.join(__dirname, "pdfs")));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    origin: req.headers.origin,
    timestamp: new Date().toISOString(),
   
  });
});

// Upload endpoint
app.post("/upload", upload.single("report"), async (req, res) => {
  try {
    // Step 1: Extract text using OCR
    const extractedText = await extractTextFromImage(req.file.path);
    // console.log( "in server:....",extractedText);

    // Step 2: Process text with Gemini API
    const { summary, abnormalities, recommendations } =
      await processHealthReportWithGemini(extractedText, req.body.language);

    // Step 3: Generate PDF
    const pdfPath = await generatePDF({
      text: summary,
      abnormalities,
      recommendations,
      language: req.body.language,
    });

    // Respond with analysis and PDF link
    res.json({
      summary,
      abnormalities,
      recommendations,
      pdfPath:pdfPath,
    });

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: "An error occurred while processing the report.",
      details: error.message
    });
  }
});

// Delete files endpoint
app.delete("/delete-files", async (req, res) => {
  console.log('Delete request received from:', req.headers.origin);
  
  try {
    const uploadsDir = path.join(__dirname, "uploads");
    const pdfsDir = path.join(__dirname, "pdfs");

    // Ensure directories exist
    [uploadsDir, pdfsDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // Delete files in uploads folder
    if (fs.existsSync(uploadsDir)) {
      fs.readdirSync(uploadsDir).forEach((file) => {
        fs.unlinkSync(path.join(uploadsDir, file));
      });
    }

    // Delete files in pdfs folder
    if (fs.existsSync(pdfsDir)) {
      fs.readdirSync(pdfsDir).forEach((file) => {
        fs.unlinkSync(path.join(pdfsDir, file));
      });
    }

    res.status(200).json({ message: "Files deleted successfully!" });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ 
      error: "Error deleting files",
      details: error.message
    });
  }
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
