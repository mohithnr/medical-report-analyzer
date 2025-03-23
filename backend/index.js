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

app.use(express.json());

const allowedOrigins = [
  'http://localhost:3000',
  'https://medical-report-analyzer-uu5w.vercel.app',
  'https://medical-report-analyzer-seven.vercel.app'
];

// Update CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS not allowed'));
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Origin',
    'Accept'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  optionsSuccessStatus: 204,
  preflightContinue: false
}));

// Handle preflight requests
app.options('*', (req, res) => {
  res.status(204).send();
});

app.use("/pdfs", express.static(path.join(__dirname, "pdfs")));

// Add this before your other routes
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
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
    console.error(error);
    res.status(500).json({ error: "An error occurred while processing the report." });
  }
});
// Update your delete-files route
app.delete("/delete-files", async (req, res) => {
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
    console.error("Error deleting files:", error);
    res.status(500).json({ 
      error: "Error deleting files",
      details: error.message 
    });
  }
});

// Add this after all your routes but before app.listen
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err.message === 'CORS not allowed') {
    return res.status(403).json({
      error: 'CORS not allowed',
      origin: req.headers.origin
    });
  }
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message
  });
});

// Start server
app.listen(5000, () => console.log("Server running on port 5000"));
