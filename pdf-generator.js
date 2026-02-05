/**
 * PDF Generator for Service Reports and Validation Reports
 * Uses pdfkit to generate professional PDF documents
 */

const PDFDocument = require('pdfkit');

// Color constants
const COLORS = {
  primary: '#045E9F',
  accent: '#00205A',
  gray: '#666666',
  lightGray: '#999999',
  darkGray: '#333333',
  black: '#000000',
  tableBg: '#f5f5f5',
  headerBg: '#e0e0e0'
};

/**
 * Generate a Service Report PDF
 * @param {Object} reportData - The service report data
 * @param {string} technicianName - Name of the technician who created the report
 * @returns {Promise<Buffer>} PDF as a Buffer
 */
async function generateServiceReportPDF(reportData, technicianName) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margin: 50,
        bufferPages: true
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const reportDate = new Date(reportData.serviceCompletionDate || reportData.createdAt || Date.now()).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Header
      doc.fontSize(14).fillColor(COLORS.primary).font('Helvetica-Bold');
      doc.text('THRIVE 365 LABS', 50, 30);
      doc.text('SERVICE REPORT', 400, 30, { align: 'right' });

      doc.moveTo(50, 55).lineTo(562, 55).strokeColor(COLORS.primary).lineWidth(2).stroke();

      // Report ID
      doc.fontSize(9).fillColor(COLORS.gray).font('Helvetica');
      doc.text(`Report ID: ${reportData.id || 'N/A'}`, 50, 65);

      // CLIENT INFORMATION Section
      let y = 95;
      doc.fontSize(11).fillColor(COLORS.accent).font('Helvetica-Bold');
      doc.text('CLIENT INFORMATION', 50, y);
      doc.moveTo(50, y + 15).lineTo(200, y + 15).strokeColor(COLORS.accent).lineWidth(1).stroke();
      y += 25;

      // Client info table
      const clientFields = [
        ['Client/Facility', reportData.clientFacilityName || '-', 'Service Date', reportDate],
        ['Customer Name', reportData.customerName || '-', 'Ticket #', reportData.hubspotTicketNumber || '-'],
        ['Address', reportData.address || '-'],
        ['Analyzer Model', reportData.analyzerModel || '-', 'Serial Number', reportData.analyzerSerialNumber || '-'],
        ['Service Provider', reportData.serviceProviderName || technicianName || '-']
      ];

      y = drawFieldTable(doc, clientFields, 50, y);

      // SERVICE PERFORMED Section
      y += 20;
      doc.fontSize(11).fillColor(COLORS.accent).font('Helvetica-Bold');
      doc.text('SERVICE PERFORMED', 50, y);
      doc.moveTo(50, y + 15).lineTo(200, y + 15).strokeColor(COLORS.accent).lineWidth(1).stroke();
      y += 25;

      // Service type
      drawFieldRow(doc, 'Service Type', reportData.serviceType || '-', 50, y);
      y += 20;

      // Conditional content based on service type
      if (reportData.serviceType === 'Validations') {
        // Validation-specific fields
        if (reportData.validationStartDate || reportData.validationEndDate) {
          drawFieldRow(doc, 'Start Date', reportData.validationStartDate || '-', 50, y, 'End Date', reportData.validationEndDate || '-');
          y += 20;
        }

        // Analyzers validated table
        if (reportData.analyzersValidated && reportData.analyzersValidated.length > 0) {
          doc.fontSize(9).fillColor(COLORS.darkGray).font('Helvetica-Bold');
          doc.text('Analyzers Validated:', 50, y);
          y += 15;
          y = drawAnalyzersTable(doc, reportData.analyzersValidated, 50, y);
        }

        if (reportData.trainingProvided) {
          drawFieldRow(doc, 'Training Provided', reportData.trainingProvided, 50, y);
          y += 20 + Math.ceil(reportData.trainingProvided.length / 80) * 12;
        }

        if (reportData.validationResults) {
          drawFieldRow(doc, 'Validation Results', reportData.validationResults, 50, y);
          y += 20 + Math.ceil(reportData.validationResults.length / 80) * 12;
        }

        if (reportData.recommendations) {
          drawFieldRow(doc, 'Recommendations', reportData.recommendations, 50, y);
          y += 20 + Math.ceil(reportData.recommendations.length / 80) * 12;
        }
      } else {
        // Regular service fields
        if (reportData.descriptionOfWork) {
          drawFieldRow(doc, 'Description of Work', reportData.descriptionOfWork, 50, y);
          y += 20 + Math.ceil(reportData.descriptionOfWork.length / 80) * 12;
        }

        if (reportData.materialsUsed) {
          drawFieldRow(doc, 'Materials Used', reportData.materialsUsed, 50, y);
          y += 20 + Math.ceil(reportData.materialsUsed.length / 80) * 12;
        }

        if (reportData.solution) {
          drawFieldRow(doc, 'Solution', reportData.solution, 50, y);
          y += 20 + Math.ceil(reportData.solution.length / 80) * 12;
        }

        if (reportData.outstandingIssues) {
          drawFieldRow(doc, 'Final Recommendations', reportData.outstandingIssues, 50, y);
          y += 20 + Math.ceil(reportData.outstandingIssues.length / 80) * 12;
        }
      }

      // Check if we need a new page for signatures
      if (y > 600) {
        doc.addPage();
        y = 50;
      }

      // SIGNATURES Section
      y += 20;
      doc.fontSize(11).fillColor(COLORS.accent).font('Helvetica-Bold');
      doc.text('SIGNATURES', 50, y);
      doc.moveTo(50, y + 15).lineTo(150, y + 15).strokeColor(COLORS.accent).lineWidth(1).stroke();
      y += 30;

      // Customer signature
      doc.fontSize(9).fillColor(COLORS.darkGray).font('Helvetica-Bold');
      doc.text('Customer Signature:', 50, y);
      doc.rect(50, y + 15, 200, 50).strokeColor(COLORS.gray).stroke();

      if (reportData.customerSignature && reportData.customerSignature.startsWith('data:image')) {
        try {
          doc.image(reportData.customerSignature, 55, y + 20, { width: 190, height: 40 });
        } catch (e) {
          doc.fontSize(10).fillColor(COLORS.lightGray).font('Helvetica-Oblique');
          doc.text('(Signature image unavailable)', 70, y + 35);
        }
      } else {
        doc.fontSize(10).fillColor(COLORS.lightGray).font('Helvetica-Oblique');
        doc.text('(Not signed)', 120, y + 35);
      }
      // Customer name
      const customerName = [reportData.customerFirstName, reportData.customerLastName].filter(Boolean).join(' ');
      if (customerName) {
        doc.fontSize(9).fillColor(COLORS.darkGray).font('Helvetica');
        doc.text(customerName, 50, y + 68);
        doc.fontSize(8).fillColor(COLORS.gray).font('Helvetica');
        doc.text(`Date: ${reportData.customerSignatureDate || '-'}`, 50, y + 82);
      } else {
        doc.fontSize(8).fillColor(COLORS.gray).font('Helvetica');
        doc.text(`Date: ${reportData.customerSignatureDate || '-'}`, 50, y + 70);
      }

      // Technician signature
      doc.fontSize(9).fillColor(COLORS.darkGray).font('Helvetica-Bold');
      doc.text('Technician Signature:', 300, y);
      doc.rect(300, y + 15, 200, 50).strokeColor(COLORS.gray).stroke();

      if (reportData.technicianSignature && reportData.technicianSignature.startsWith('data:image')) {
        try {
          doc.image(reportData.technicianSignature, 305, y + 20, { width: 190, height: 40 });
        } catch (e) {
          doc.fontSize(10).fillColor(COLORS.lightGray).font('Helvetica-Oblique');
          doc.text('(Signature image unavailable)', 320, y + 35);
        }
      } else {
        doc.fontSize(10).fillColor(COLORS.lightGray).font('Helvetica-Oblique');
        doc.text('(Not signed)', 370, y + 35);
      }
      // Technician name
      const techName = [reportData.technicianFirstName, reportData.technicianLastName].filter(Boolean).join(' ');
      if (techName) {
        doc.fontSize(9).fillColor(COLORS.darkGray).font('Helvetica');
        doc.text(techName, 300, y + 68);
        doc.fontSize(8).fillColor(COLORS.gray).font('Helvetica');
        doc.text(`Date: ${reportData.technicianSignatureDate || '-'}`, 300, y + 82);
      } else {
        doc.fontSize(8).fillColor(COLORS.gray).font('Helvetica');
        doc.text(`Date: ${reportData.technicianSignatureDate || '-'}`, 300, y + 70);
      }

      // Footer
      doc.fontSize(8).fillColor(COLORS.lightGray).font('Helvetica-Oblique');
      doc.text(`Generated on ${new Date().toLocaleString()}`, 50, 720, { align: 'center', width: 512 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Draw a field row with label and value
 */
function drawFieldRow(doc, label1, value1, x, y, label2 = null, value2 = null) {
  doc.fontSize(9).fillColor(COLORS.darkGray).font('Helvetica-Bold');
  doc.text(label1 + ':', x, y);
  doc.fontSize(10).fillColor(COLORS.black).font('Helvetica');
  doc.text(value1, x + 120, y, { width: label2 ? 130 : 380 });

  if (label2) {
    doc.fontSize(9).fillColor(COLORS.darkGray).font('Helvetica-Bold');
    doc.text(label2 + ':', 300, y);
    doc.fontSize(10).fillColor(COLORS.black).font('Helvetica');
    doc.text(value2, 420, y, { width: 130 });
  }
}

/**
 * Draw a table of client info fields
 */
function drawFieldTable(doc, rows, x, startY) {
  let y = startY;

  rows.forEach(row => {
    if (row.length === 4) {
      drawFieldRow(doc, row[0], row[1], x, y, row[2], row[3]);
      // Calculate row height based on longest value text in the row
      const val1Width = 130;
      const val2Width = 130;
      const val1Height = doc.fontSize(10).font('Helvetica').heightOfString(row[1] || '-', { width: val1Width });
      const val2Height = doc.fontSize(10).font('Helvetica').heightOfString(row[3] || '-', { width: val2Width });
      y += Math.max(18, Math.max(val1Height, val2Height) + 4);
    } else if (row.length === 2) {
      drawFieldRow(doc, row[0], row[1], x, y);
      const valHeight = doc.fontSize(10).font('Helvetica').heightOfString(row[1] || '-', { width: 380 });
      y += Math.max(18, valHeight + 4);
    }
  });

  return y;
}

/**
 * Draw analyzers validated table
 */
function drawAnalyzersTable(doc, analyzers, x, startY) {
  let y = startY;

  // Header
  doc.rect(x, y, 460, 18).fillColor(COLORS.headerBg).fill();
  doc.fontSize(9).fillColor(COLORS.darkGray).font('Helvetica-Bold');
  doc.text('Model', x + 5, y + 4);
  doc.text('Serial Number', x + 160, y + 4);
  doc.text('Status', x + 320, y + 4);
  y += 18;

  // Rows
  doc.font('Helvetica').fontSize(9);
  analyzers.forEach((a, i) => {
    if (i % 2 === 0) {
      doc.rect(x, y, 460, 16).fillColor(COLORS.tableBg).fill();
    }
    doc.fillColor(COLORS.black);
    doc.text(a.model || '-', x + 5, y + 3);
    doc.text(a.serialNumber || '-', x + 160, y + 3);
    doc.text(a.status || a.validationStatus || '-', x + 320, y + 3);
    y += 16;
  });

  return y + 10;
}

/**
 * Generate a Validation Report PDF (Multi-day service report)
 * @param {Object} reportData - The validation report data
 * @param {string} technicianName - Name of the technician who created the report
 * @returns {Promise<Buffer>} PDF as a Buffer
 */
async function generateValidationReportPDF(reportData, technicianName) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margin: 50,
        bufferPages: true
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const startDate = new Date(reportData.startDate || reportData.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const endDate = new Date(reportData.endDate || reportData.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Header
      doc.fontSize(14).fillColor(COLORS.primary).font('Helvetica-Bold');
      doc.text('THRIVE 365 LABS', 50, 30);
      doc.text('VALIDATION REPORT', 400, 30, { align: 'right' });

      doc.moveTo(50, 55).lineTo(562, 55).strokeColor(COLORS.primary).lineWidth(2).stroke();

      // Report ID
      doc.fontSize(9).fillColor(COLORS.gray).font('Helvetica');
      doc.text(`Report ID: ${reportData.id || 'N/A'}`, 50, 65);

      // VALIDATION SUMMARY Section
      let y = 95;
      doc.fontSize(11).fillColor(COLORS.accent).font('Helvetica-Bold');
      doc.text('VALIDATION SUMMARY', 50, y);
      doc.moveTo(50, y + 15).lineTo(220, y + 15).strokeColor(COLORS.accent).lineWidth(1).stroke();
      y += 25;

      // Summary fields
      drawFieldRow(doc, 'Client/Facility', reportData.clientFacilityName || '-', 50, y);
      y += 18;
      drawFieldRow(doc, 'Start Date', startDate, 50, y, 'End Date', endDate);
      y += 18;
      drawFieldRow(doc, 'Days On-Site', String(reportData.daysOnSite || '-'), 50, y, 'Service Provider', reportData.serviceProviderName || technicianName || '-');
      y += 25;

      // ANALYZERS VALIDATED Section
      if (reportData.analyzersValidated && reportData.analyzersValidated.length > 0) {
        doc.fontSize(11).fillColor(COLORS.accent).font('Helvetica-Bold');
        doc.text('ANALYZERS VALIDATED', 50, y);
        doc.moveTo(50, y + 15).lineTo(220, y + 15).strokeColor(COLORS.accent).lineWidth(1).stroke();
        y += 25;
        y = drawAnalyzersTable(doc, reportData.analyzersValidated, 50, y);
      }

      // TRAINING PROVIDED Section
      if (reportData.trainingProvided) {
        y += 10;
        doc.fontSize(11).fillColor(COLORS.accent).font('Helvetica-Bold');
        doc.text('TRAINING PROVIDED', 50, y);
        doc.moveTo(50, y + 15).lineTo(200, y + 15).strokeColor(COLORS.accent).lineWidth(1).stroke();
        y += 25;
        doc.fontSize(10).fillColor(COLORS.black).font('Helvetica');
        doc.text(reportData.trainingProvided, 50, y, { width: 500 });
        y += Math.ceil(reportData.trainingProvided.length / 80) * 14 + 10;
      }

      // VALIDATION RESULTS Section
      if (reportData.validationResults) {
        y += 10;
        doc.fontSize(11).fillColor(COLORS.accent).font('Helvetica-Bold');
        doc.text('VALIDATION RESULTS', 50, y);
        doc.moveTo(50, y + 15).lineTo(200, y + 15).strokeColor(COLORS.accent).lineWidth(1).stroke();
        y += 25;
        doc.fontSize(10).fillColor(COLORS.black).font('Helvetica');
        doc.text(reportData.validationResults, 50, y, { width: 500 });
        y += Math.ceil(reportData.validationResults.length / 80) * 14 + 10;
      }

      // OUTSTANDING ITEMS Section
      if (reportData.outstandingItems) {
        y += 10;
        doc.fontSize(11).fillColor(COLORS.accent).font('Helvetica-Bold');
        doc.text('OUTSTANDING ITEMS', 50, y);
        doc.moveTo(50, y + 15).lineTo(200, y + 15).strokeColor(COLORS.accent).lineWidth(1).stroke();
        y += 25;
        doc.fontSize(10).fillColor(COLORS.black).font('Helvetica');
        doc.text(reportData.outstandingItems, 50, y, { width: 500 });
        y += Math.ceil(reportData.outstandingItems.length / 80) * 14 + 10;
      }

      // NEXT STEPS Section
      if (reportData.nextSteps) {
        y += 10;
        doc.fontSize(11).fillColor(COLORS.accent).font('Helvetica-Bold');
        doc.text('NEXT STEPS', 50, y);
        doc.moveTo(50, y + 15).lineTo(150, y + 15).strokeColor(COLORS.accent).lineWidth(1).stroke();
        y += 25;
        doc.fontSize(10).fillColor(COLORS.black).font('Helvetica');
        doc.text(reportData.nextSteps, 50, y, { width: 500 });
        y += Math.ceil(reportData.nextSteps.length / 80) * 14 + 10;
      }

      // Check if we need a new page for signatures
      if (y > 580) {
        doc.addPage();
        y = 50;
      }

      // SIGNATURES Section
      y += 20;
      doc.fontSize(11).fillColor(COLORS.accent).font('Helvetica-Bold');
      doc.text('SIGNATURES', 50, y);
      doc.moveTo(50, y + 15).lineTo(150, y + 15).strokeColor(COLORS.accent).lineWidth(1).stroke();
      y += 30;

      // Customer signature
      doc.fontSize(9).fillColor(COLORS.darkGray).font('Helvetica-Bold');
      doc.text('Customer Signature:', 50, y);
      doc.rect(50, y + 15, 200, 50).strokeColor(COLORS.gray).stroke();

      if (reportData.customerSignature && reportData.customerSignature.startsWith('data:image')) {
        try {
          doc.image(reportData.customerSignature, 55, y + 20, { width: 190, height: 40 });
        } catch (e) {
          doc.fontSize(10).fillColor(COLORS.lightGray).font('Helvetica-Oblique');
          doc.text('(Signature image unavailable)', 70, y + 35);
        }
      } else {
        doc.fontSize(10).fillColor(COLORS.lightGray).font('Helvetica-Oblique');
        doc.text('(Not signed)', 120, y + 35);
      }
      // Customer name
      const customerName = [reportData.customerFirstName, reportData.customerLastName].filter(Boolean).join(' ');
      if (customerName) {
        doc.fontSize(9).fillColor(COLORS.darkGray).font('Helvetica');
        doc.text(customerName, 50, y + 68);
        doc.fontSize(8).fillColor(COLORS.gray).font('Helvetica');
        doc.text(`Date: ${reportData.customerSignatureDate || '-'}`, 50, y + 82);
      } else {
        doc.fontSize(8).fillColor(COLORS.gray).font('Helvetica');
        doc.text(`Date: ${reportData.customerSignatureDate || '-'}`, 50, y + 70);
      }

      // Technician signature
      doc.fontSize(9).fillColor(COLORS.darkGray).font('Helvetica-Bold');
      doc.text('Technician Signature:', 300, y);
      doc.rect(300, y + 15, 200, 50).strokeColor(COLORS.gray).stroke();

      if (reportData.technicianSignature && reportData.technicianSignature.startsWith('data:image')) {
        try {
          doc.image(reportData.technicianSignature, 305, y + 20, { width: 190, height: 40 });
        } catch (e) {
          doc.fontSize(10).fillColor(COLORS.lightGray).font('Helvetica-Oblique');
          doc.text('(Signature image unavailable)', 320, y + 35);
        }
      } else {
        doc.fontSize(10).fillColor(COLORS.lightGray).font('Helvetica-Oblique');
        doc.text('(Not signed)', 370, y + 35);
      }
      // Technician name
      const techName = [reportData.technicianFirstName, reportData.technicianLastName].filter(Boolean).join(' ');
      if (techName) {
        doc.fontSize(9).fillColor(COLORS.darkGray).font('Helvetica');
        doc.text(techName, 300, y + 68);
        doc.fontSize(8).fillColor(COLORS.gray).font('Helvetica');
        doc.text(`Date: ${reportData.technicianSignatureDate || '-'}`, 300, y + 82);
      } else {
        doc.fontSize(8).fillColor(COLORS.gray).font('Helvetica');
        doc.text(`Date: ${reportData.technicianSignatureDate || '-'}`, 300, y + 70);
      }

      // Footer
      doc.fontSize(8).fillColor(COLORS.lightGray).font('Helvetica-Oblique');
      doc.text(`Generated on ${new Date().toLocaleString()}`, 50, 720, { align: 'center', width: 512 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generateServiceReportPDF,
  generateValidationReportPDF
};
