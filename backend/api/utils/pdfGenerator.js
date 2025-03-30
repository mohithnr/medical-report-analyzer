const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const parseSummary = (summary) => {
  const cleanedSummary = summary.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(cleanedSummary); // Parse the cleaned string
  } catch (error) {
    console.error("Error parsing summary:", error);
    return null;
  }
};

// Update PDF generator to return buffer
const generatePDF = async (data) => {
  const { text, abnormalities, recommendations, language } = data;
  const parsedSummary = text ? parseSummary(text) : null;

  // Update the path to the correct font file
  const notoBoldFontPath = path.join(__dirname, '..', 'fonts', 'Noto_Sans', 'static', 'NotoSans_Condensed-Bold.ttf');
  const notoRegularFontPath = path.join(__dirname, '..', 'fonts', 'Noto_Sans', 'static', 'NotoSans-Regular.ttf');

  const doc = new PDFDocument();
  const buffers = [];
  doc.on('data', buffers.push.bind(buffers));
  doc.on('end', () => {
    const pdfData = Buffer.concat(buffers);
    return pdfData;
  });

  // Add header
  doc.fontSize(16).text("Medical Report Analysis", { align: "center" }).moveDown();
  doc.fontSize(12).text(`Language: ${language}`).moveDown();

  // Add Summary
  doc.fontSize(14).text("Summary:", { underline: true }).moveDown();
  if (parsedSummary) {
    Object.entries(parsedSummary).forEach(([key, value]) => {
      doc.fontSize(12).font(notoBoldFontPath).text(`${key}:`, { continued: true });
      doc.fontSize(12).font(notoRegularFontPath).text(` ${value}`).moveDown();
    });
  } else {
    doc.fontSize(12).text("No valid summary available.").moveDown();
  }
  doc.end();
};

module.exports = { generatePDF };
