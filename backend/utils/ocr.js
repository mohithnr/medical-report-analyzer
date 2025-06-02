const Tesseract = require('tesseract.js');
const { createWorker } = Tesseract;

async function extractTextFromImage(buffer) {
    try {
        const worker = await createWorker('eng');
        const { data: { text } } = await worker.recognize(buffer);
        await worker.terminate();

        const cleanedText = text
            .replace(/\n+/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/[^\x00-\x7F]/g, '')
            .trim();

        const results = parseTestResults(cleanedText);
        return results;

    } catch (error) {
        console.error('OCR Error:', error);
        throw new Error(`Failed to extract text from image: ${error.message}`);
    }
}

function parseTestResults(text) {
    try {
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
