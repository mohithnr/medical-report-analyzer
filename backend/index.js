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
app.use(cors({
  origin: ['http://localhost:3000', 'https://medical-report-analyzer-uu5w.vercel.app/'],
  methods: ['GET', 'POST', 'DELETE'],
  credentials: true
}));
app.use("/pdfs", express.static(path.join(__dirname, "pdfs")));

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
// route to delete files
app.delete("/delete-files", async (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, "uploads");
    const pdfsDir = path.join(__dirname, "pdfs");

    // Delete all files in uploads folder
    fs.readdirSync(uploadsDir).forEach((file) => {
      fs.unlinkSync(path.join(uploadsDir, file));
    });

    // Delete all files in pdfs folder
    fs.readdirSync(pdfsDir).forEach((file) => {
      fs.unlinkSync(path.join(pdfsDir, file));
    });

    res.status(200).send({ message: "Files deleted successfully!" });
  } catch (error) {
    console.error("Error deleting files:", error);
    res.status(500).send({ message: "Error deleting files." });
  }
});



// Start server
app.listen(5000, () => console.log("Server running on port 5000"));
