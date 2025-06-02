const PDFDocument = require('pdfkit');

async function generatePDF(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      
      // Parse data if it's still in JSON format
      const parsedData = typeof data.summary.keyFindings === 'string' 
        ? JSON.parse(data.summary.keyFindings.replace(/```json|```/g, '').trim())
        : data.summary.keyFindings;

      // Title
      doc.font('Helvetica-Bold')
         .fontSize(24)
         .text('Medical Report Analysis', { align: 'center' })
         .moveDown();

      // Date
      doc.font('Helvetica')
         .fontSize(12)
         .text(`Generated on: ${new Date().toLocaleString()}`, { align: 'right' })
         .moveDown(2);

      // Key Findings
      doc.font('Helvetica-Bold')
         .fontSize(18)
         .text('Key Findings')
         .moveDown(0.5);
      
      doc.font('Helvetica')
         .fontSize(12)
         .text(parsedData.keyFindings)
         .moveDown(2);

      // Abnormalities
      doc.font('Helvetica-Bold')
         .fontSize(18)
         .text('Abnormalities')
         .moveDown(0.5);

      if (parsedData.abnormalities && parsedData.abnormalities.length > 0) {
        parsedData.abnormalities.forEach((item, index) => {
          doc.font('Helvetica-Bold')
             .fontSize(14)
             .text(item.test)
             .moveDown(0.3);

          doc.font('Helvetica')
             .fontSize(12)
             .text(`Result: ${item.result}`)
             .text(`Normal Range: ${item.normalRange}`)
             .text(`Finding: ${item.abnormality}`)
             .moveDown();

          // Add extra space between items except for the last one
          if (index < parsedData.abnormalities.length - 1) {
            doc.moveDown(0.5);
          }
        });
      }
      doc.moveDown();

      // Recommendations
      doc.font('Helvetica-Bold')
         .fontSize(18)
         .text('Recommendations')
         .moveDown(0.5);

      doc.font('Helvetica')
         .fontSize(12)
         .text(parsedData.recommendedSteps, {
           align: 'justify',
           width: 500
         })
         .moveDown(2);

      // Health Advice
      doc.font('Helvetica-Bold')
         .fontSize(18)
         .text('Health Advice')
         .moveDown(0.5);

      doc.font('Helvetica')
         .fontSize(12)
         .text(parsedData.healthAdvice, {
           align: 'justify',
           width: 500
         })
         .moveDown(2);

      // Footer
      doc.fontSize(10)
         .font('Helvetica-Oblique')
         .text('This report is computer-generated and should be reviewed by a healthcare professional.', {
           align: 'center',
           bottom: 30
         });

      doc.end();

    } catch (error) {
      console.error('PDF Generation Error:', error);
      reject(error);
    }
  });
}

module.exports = { generatePDF };