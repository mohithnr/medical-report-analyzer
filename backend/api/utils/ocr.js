const Tesseract = require("tesseract.js");

// Update OCR function to accept buffer
const extractTextFromImage = async (imageBuffer) => {
  // Modify OCR logic to work with buffer instead of file path
  const { data } = await Tesseract.recognize(imageBuffer, "eng");
  // console.log("in ocr:",data.text);
  return data.text;
};

module.exports = { extractTextFromImage };
