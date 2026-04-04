const PDFDocument = require('pdfkit');

// ─── Generates a professional excuse letter PDF as a Buffer ──────────────────
// Called by the route: GET /api/absences/:id/excuse-letter
// Only available for approved requests.
exports.generateExcuseLetter = (request) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc    = new PDFDocument({ margin: 72, size: 'LETTER' });

    doc.on('data',  chunk => chunks.push(chunk));
    doc.on('end',   ()    => resolve(Buffer.concat(chunks)));
    doc.on('error', err   => reject(err));

    const { student, absenceDateStart, absenceDateEnd,
            requestId, affectedCourses, qrCode, reviewedAt } = request;

    const blue    = '#1a5276';
    const gray    = '#555555';
    const light   = '#aed6f1';
    const pageW   = doc.page.width;
    const margin  = 72;
    const contentW = pageW - margin * 2;

    const fmt = (date) => new Date(date).toLocaleDateString('en-PH', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    // ── Header bar ────────────────────────────────────────────────────────
    doc.rect(0, 0, pageW, 90).fill(blue);
    doc.fillColor('#ffffff')
      .font('Helvetica-Bold').fontSize(18)
      .text('UNIVERSITY HEALTH SERVICES', margin, 22, { width: contentW });
    doc.font('Helvetica').fontSize(11)
      .text('Medical Absence Portal  ·  Official Document', margin, 46, { width: contentW });

    // ── "OFFICIAL EXCUSE LETTER" title ────────────────────────────────────
    doc.moveDown(3.5);
    doc.fillColor(blue).font('Helvetica-Bold').fontSize(14)
      .text('OFFICIAL MEDICAL EXCUSE LETTER', { align: 'center' });

    // thin rule under title
    const ruleY = doc.y + 6;
    doc.moveTo(margin, ruleY).lineTo(pageW - margin, ruleY)
      .strokeColor(light).lineWidth(1).stroke();

    doc.moveDown(1.5);

    // ── Date + reference ──────────────────────────────────────────────────
    doc.fillColor(gray).font('Helvetica').fontSize(10);
    const dateStr  = fmt(reviewedAt || new Date());
    doc.text(`Date Issued: ${dateStr}`, margin, doc.y, { continued: true });
    doc.text(`Reference No.: ${requestId}`, { align: 'right' });
    doc.moveDown(1.5);

    // ── Opening ───────────────────────────────────────────────────────────
    doc.fillColor('#222222').font('Helvetica').fontSize(11)
      .text('To Whom It May Concern,', margin, doc.y);
    doc.moveDown(0.8);

    doc.text(
      `This letter certifies that the following student has been formally excused from class ` +
      `due to a verified medical reason, as assessed and approved by the University Health Services.`,
      margin, doc.y, { width: contentW, align: 'justify' }
    );
    doc.moveDown(1.5);

    // ── Student info box ──────────────────────────────────────────────────
    const boxY = doc.y;
    doc.rect(margin, boxY, contentW, 110).fill('#eaf4fb').stroke('#aed6f1');

    doc.fillColor(blue).font('Helvetica-Bold').fontSize(10)
      .text('STUDENT INFORMATION', margin + 16, boxY + 14);

    const col1 = margin + 16;
    const col2 = margin + contentW / 2;
    const rowH  = 22;
    let   rowY  = boxY + 32;

    const infoRow = (label, value, x, y) => {
      doc.fillColor(gray).font('Helvetica').fontSize(9).text(label, x, y);
      doc.fillColor('#111111').font('Helvetica-Bold').fontSize(10)
        .text(value || '—', x, y + 11);
    };

    infoRow('Full Name',   `${student.firstName} ${student.lastName}`, col1, rowY);
    infoRow('Student ID',  student.studentId || '—',                   col2, rowY);
    rowY += rowH + 12;
    infoRow('Department',  student.department || '—',                  col1, rowY);
    infoRow('Email',       student.email,                              col2, rowY);

    doc.y = boxY + 116;
    doc.moveDown(1.2);

    // ── Absence period ────────────────────────────────────────────────────
    const absBoxY = doc.y;
    doc.rect(margin, absBoxY, contentW, 66).fill('#eafaf1').stroke('#a9dfbf');
    doc.fillColor('#1e8449').font('Helvetica-Bold').fontSize(10)
      .text('ABSENCE PERIOD', margin + 16, absBoxY + 14);

    const startStr = fmt(absenceDateStart);
    const endStr   = fmt(absenceDateEnd);
    const days     = Math.ceil(
      (new Date(absenceDateEnd) - new Date(absenceDateStart)) / 86_400_000
    ) + 1;

    doc.fillColor('#111111').font('Helvetica').fontSize(10)
      .text(`${startStr}  to  ${endStr}  (${days} day${days !== 1 ? 's' : ''})`,
        margin + 16, absBoxY + 32);

    doc.y = absBoxY + 72;
    doc.moveDown(1.2);

    // ── Affected courses ──────────────────────────────────────────────────
    doc.fillColor(blue).font('Helvetica-Bold').fontSize(10)
      .text('AFFECTED COURSES', margin, doc.y);
    doc.moveDown(0.5);

    affectedCourses.forEach((c, i) => {
      const rowBg = i % 2 === 0 ? '#f0f8ff' : '#ffffff';
      const cRowY = doc.y;
      doc.rect(margin, cRowY - 2, contentW, 20).fill(rowBg);
      doc.fillColor('#111111').font('Helvetica-Bold').fontSize(10)
        .text(c.courseCode, margin + 8, cRowY + 2, { continued: true });
      doc.font('Helvetica').fillColor(gray)
        .text(`  —  ${c.courseName}`, { continued: true });
      if (c.professorEmail) {
        doc.fillColor('#aaaaaa').fontSize(9)
          .text(`  (${c.professorEmail})`);
      } else {
        doc.text('');
      }
      doc.moveDown(0.6);
    });

    doc.moveDown(1);

    // ── Privacy notice ────────────────────────────────────────────────────
    doc.rect(margin, doc.y, contentW, 38)
      .fill('#fef9e7').stroke('#f9ca24');
    doc.fillColor('#7d6608').font('Helvetica-Oblique').fontSize(9)
      .text(
        'CONFIDENTIALITY NOTICE: The specific medical diagnosis and clinical details of this case are ' +
        'confidential and are not disclosed in this document in accordance with student medical privacy policy. ' +
        'This letter serves only to confirm that the absence was verified and approved by the clinic.',
        margin + 10, doc.y + 6, { width: contentW - 20 }
      );
    doc.moveDown(3.5);

    // ── Signature block ───────────────────────────────────────────────────
    const sigY = doc.y;
    doc.moveTo(margin, sigY + 40).lineTo(margin + 200, sigY + 40)
      .strokeColor('#333333').lineWidth(0.5).stroke();
    doc.fillColor('#111111').font('Helvetica-Bold').fontSize(10)
      .text('University Health Officer', margin, sigY + 44);
    doc.fillColor(gray).font('Helvetica').fontSize(9)
      .text('University Health Services', margin, sigY + 57);

    // ── QR code (if available) ────────────────────────────────────────────
    if (qrCode?.imageData) {
      const base64 = qrCode.imageData.replace(/^data:image\/png;base64,/, '');
      const imgBuf = Buffer.from(base64, 'base64');
      const qrX    = pageW - margin - 90;
      doc.image(imgBuf, qrX, sigY, { width: 90, height: 90 });
      doc.fillColor(gray).font('Helvetica').fontSize(8)
        .text('Scan to verify', qrX, sigY + 93, { width: 90, align: 'center' });
    }

    // ── Footer ────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 48;
    doc.rect(0, footerY, pageW, 48).fill(blue);
    doc.fillColor('#aed6f1').font('Helvetica').fontSize(8)
      .text(
        `This is an official document generated by the MedAbsence Portal.  ` +
        `Verify at: ${process.env.CLIENT_URL || 'http://localhost:3000'}/verify/${requestId}`,
        margin, footerY + 10, { width: contentW, align: 'center' }
      );
    doc.fillColor('#ffffff').fontSize(7)
      .text(`Generated: ${new Date().toLocaleString()}  |  Ref: ${requestId}`,
        margin, footerY + 26, { width: contentW, align: 'center' });

    doc.end();
  });
};