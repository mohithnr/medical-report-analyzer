const Tesseract = require('tesseract.js');
const { createWorker } = Tesseract;

async function extractTextFromImage(imagePath) {
    try {
        // Create a new worker
        const worker = await createWorker('eng');

        // Recognize text from image
        const { data: { text } } = await worker.recognize(imagePath);

        // Terminate worker
        await worker.terminate();

        // Clean and format the extracted text
        const cleanedText = text
            .replace(/\n+/g, ' ')          // Replace multiple newlines with space
            .replace(/\s+/g, ' ')          // Replace multiple spaces with single space
            .replace(/[^\x00-\x7F]/g, '')  // Remove non-ASCII characters
            .trim();                        // Remove leading/trailing whitespace

        // Extract test results
        const results = parseTestResults(cleanedText);

        return results;
    } catch (error) {
        console.error('OCR Error:', error);
        throw new Error(`Failed to extract text from image: ${error.message}`);
    }
}

function parseTestResults(text) {
    try {
        // Regular expression to match test patterns
        const testPattern = /([A-Za-z\s,]+):\s*([\d.]+)\s*([A-Za-z/%]+)\s*\((?:Reference Range|Normal Range|Range):\s*([\d.-]+)\s*(?:to|-)?\s*([\d.]+)\s*([A-Za-z/%]+)\)/g;
        
        let matches;
        const results = [];

        while ((matches = testPattern.exec(text)) !== null) {
            results.push({
                test: matches[1].trim(),
                value: matches[2],
                unit: matches[3],
                range: {
                    min: matches[4],
                    max: matches[5],
                    unit: matches[6]
                }
            });
        }

        return {
            rawText: text,
            parsedResults: results
        };
    } catch (error) {
        console.error('Parsing Error:', error);
        return {
            rawText: text,
            parsedResults: []
        };
    }
}

module.exports = { extractTextFromImage };