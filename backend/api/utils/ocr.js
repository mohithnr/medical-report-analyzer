const Tesseract = require("tesseract.js");

const extractTextFromImage = async (imagePath) => {
  const { data } = await Tesseract.recognize(imagePath, "eng");
  // console.log("in ocr:",data.text);
  return data.text;
};

module.exports = { extractTextFromImage };
