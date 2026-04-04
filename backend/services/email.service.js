const nodemailer = require('nodemailer');

// ─── Transporter (Gmail via App Password) ─────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify().then(() => {
  console.log('✅ Email transporter ready');
}).catch(err => {
  console.warn('⚠️  Email transporter error:', err.message);
});

const FROM     = process.env.EMAIL_FROM || `"University Clinic" <${process.env.EMAIL_USER}>`;
const BASE_URL = process.env.CLIENT_URL || 'http://localhost:3000';

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

function emailShell(title, bodyHtml) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    body { margin:0; padding:0; background:#f4f4f4; font-family: Arial, sans-serif; }
    .wrapper { max-width:600px; margin:32px auto; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,.08); }
    .header  { background:#1a5276; padding:24px 32px; }
    .header h1 { margin:0; color:#fff; font-size:18px; font-weight:600; }
    .header p  { margin:4px 0 0; color:#aed6f1; font-size:13px; }
    .body    { padding:32px; color:#333; font-size:15px; line-height:1.6; }
    .body h2 { font-size:16px; color:#1a5276; margin-top:0; }
    .info-table { width:100%; border-collapse:collapse; margin:16px 0; font-size:14px; }
    .info-table td { padding:8px 12px; border-bottom:1px solid #eee; }
    .info-table td:first-child { font-weight:600; color:#555; width:40%; }
    .badge { display:inline-block; padding:4px 12px; border-radius:12px; font-size:13px; font-weight:600; }
    .badge-approved { background:#d4efdf; color:#1e8449; }
    .badge-rejected { background:#fadbd8; color:#a93226; }
    .badge-pending  { background:#fef9e7; color:#b7950b; }
    .btn { display:inline-block; margin-top:20px; padding:12px 24px; background:#1a5276; color:#fff; border-radius:6px; text-decoration:none; font-size:14px; font-weight:600; }
    .footer { padding:16px 32px; background:#f8f9fa; font-size:12px; color:#888; border-top:1px solid #eee; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>University Health Services</h1>
      <p>Medical Absence Portal</p>
    </div>
    <div class="body">
      <h2>${title}</h2>
      ${bodyHtml}
    </div>
    <div class="footer">
      This is an automated message from the University Medical Absence Portal.
      Do not reply to this email. For concerns, visit the clinic directly.
    </div>
  </div>
</body>
</html>`;
}

// ─── 1. Student status update (approved / rejected) ───────────────────────────
exports.sendStudentStatusUpdate = async (student, request, status) => {
  const isApproved = status === 'approved';
  const badgeClass = isApproved ? 'badge-approved' : 'badge-rejected';
  const badgeText  = isApproved ? 'APPROVED' : 'REJECTED';

  const body = `
    <p>Dear ${student.firstName},</p>
    <p>Your medical absence request has been reviewed by the clinic.</p>
    <table class="info-table">
      <tr><td>Request ID</td><td>${request.requestId}</td></tr>
      <tr><td>Absence Dates</td><td>${formatDate(request.absenceDateStart)} – ${formatDate(request.absenceDateEnd)}</td></tr>
      <tr><td>Status</td><td><span class="badge ${badgeClass}">${badgeText}</span></td></tr>
      ${!isApproved && request.rejectionReason
        ? `<tr><td>Reason</td><td>${request.rejectionReason}</td></tr>`
        : ''}
    </table>
    ${isApproved
      ? `<p>Your medical excuse has been approved and your professors have been notified.
         You can view your approved request and QR verification code below.</p>
         <a class="btn" href="${BASE_URL}/requests/${request._id}">View Your Request</a>`
      : `<p>If you believe this decision is incorrect or you have additional documentation,
         please visit the clinic in person.</p>`
    }
  `;

  await transporter.sendMail({
    from:    FROM,
    to:      student.email,
    subject: `Medical Absence Request ${badgeText} — ${request.requestId}`,
    html:    emailShell(`Your Request Has Been ${badgeText}`, body)
  });
};

// ─── 2. Professor privacy-safe notice ─────────────────────────────────────────
exports.sendProfessorNotices = async (request) => {
  const { student, affectedCourses, absenceDateStart, absenceDateEnd, requestId } = request;

  const notices = affectedCourses.map(async (course) => {
    if (!course.professorEmail) return;

    const body = `
      <p>Dear Professor,</p>
      <p>This is an official notice from the University Health Services confirming that
      a student was absent from your class due to a verified medical reason.</p>
      <table class="info-table">
        <tr><td>Student Name</td><td>${student.firstName} ${student.lastName}</td></tr>
        <tr><td>Student ID</td><td>${student.studentId || 'N/A'}</td></tr>
        <tr><td>Course</td><td>${course.courseCode} — ${course.courseName}</td></tr>
        <tr><td>Absence Dates</td><td>${formatDate(absenceDateStart)} – ${formatDate(absenceDateEnd)}</td></tr>
        <tr><td>Reference No.</td><td>${requestId}</td></tr>
      </table>
      <p>This absence has been verified by the University Clinic. The specific medical
      details are confidential and are not disclosed in accordance with student privacy policy.</p>
      <p>You may verify the authenticity of this notice by scanning the QR code provided
      to the student, or by visiting the clinic directly.</p>
    `;

    await transporter.sendMail({
      from:    FROM,
      to:      course.professorEmail,
      subject: `Medical Absence Notice — ${student.firstName} ${student.lastName} (${course.courseCode})`,
      html:    emailShell('Medical Absence Notice', body)
    });

    course.noticeSent   = true;
    course.noticeSentAt = new Date();
  });

  const results = await Promise.allSettled(notices);
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.error(`Failed to send notice for course ${affectedCourses[i]?.courseCode}:`, result.reason);
    }
  });
};

// ─── 3. Submission confirmation ───────────────────────────────────────────────
exports.sendSubmissionConfirmation = async (student, request) => {
  const body = `
    <p>Dear ${student.firstName},</p>
    <p>Your medical absence request has been submitted successfully and is now pending review
    by the University Clinic.</p>
    <table class="info-table">
      <tr><td>Request ID</td><td>${request.requestId}</td></tr>
      <tr><td>Submitted On</td><td>${formatDate(new Date())}</td></tr>
      <tr><td>Absence Dates</td><td>${formatDate(request.absenceDateStart)} – ${formatDate(request.absenceDateEnd)}</td></tr>
      <tr><td>Status</td><td><span class="badge badge-pending">PENDING REVIEW</span></td></tr>
    </table>
    <p>You will receive an email once your request has been reviewed.
    You can also check the status anytime through the portal.</p>
    <a class="btn" href="${BASE_URL}/requests/${request._id}">Track Your Request</a>
  `;

  await transporter.sendMail({
    from:    FROM,
    to:      student.email,
    subject: `Request Submitted — ${request.requestId}`,
    html:    emailShell('Request Submitted Successfully', body)
  });
};

// ─── 4. Password reset ────────────────────────────────────────────────────────
// IMPORTANT: token is passed as a query param (?token=) not a URL segment
// because ResetPassword.jsx uses useSearchParams() to read it.
exports.sendPasswordReset = async (user, resetToken) => {
  const resetUrl = `${BASE_URL}/reset-password?token=${resetToken}`;

  const body = `
    <p>Dear ${user.firstName},</p>
    <p>You requested a password reset for your Medical Absence Portal account.</p>
    <p>Click the button below to reset your password. This link expires in <strong>15 minutes</strong>.</p>
    <a class="btn" href="${resetUrl}">Reset Password</a>
    <p style="margin-top:20px;font-size:13px;color:#888;">
      If you did not request this, please ignore this email. Your password will not change.
    </p>
    <p style="margin-top:8px;font-size:12px;color:#aaa;">
      If the button doesn't work, copy and paste this link into your browser:<br/>
      <span style="color:#1a5276;">${resetUrl}</span>
    </p>
  `;

  await transporter.sendMail({
    from:    FROM,
    to:      user.email,
    subject: 'Password Reset Request — Medical Absence Portal',
    html:    emailShell('Reset Your Password', body)
  });
};