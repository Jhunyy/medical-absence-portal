const router = require('express').Router();
const AbsenceRequest = require('../models/AbsenceRequest.model');

// Public route — professors can verify QR without login
router.get('/verify/:requestId', async (req, res) => {
  try {
    const request = await AbsenceRequest
      .findOne({ requestId: req.params.requestId, status: 'approved' })
      .populate('student', 'firstName lastName studentId');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Invalid or unverified request.' });
    }

    res.json({
      success: true,
      data: {
        requestId: request.requestId,
        student: request.student,
        absenceDateStart: request.absenceDateStart,
        absenceDateEnd: request.absenceDateEnd,
        affectedCourses: request.affectedCourses.map(c => ({
          courseCode: c.courseCode,
          courseName: c.courseName,
          acknowledged: c.acknowledged
        })),
        status: request.status,
        qrExpiresAt: request.qrCode?.expiresAt
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;