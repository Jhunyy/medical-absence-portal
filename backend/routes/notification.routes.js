const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const AbsenceRequest = require('../models/AbsenceRequest.model');

router.get('/', protect, async (req, res) => {
  try {
    let notifications = [];

    if (req.user.role === 'student') {
      const requests = await AbsenceRequest
        .find({ student: req.user._id })
        .sort({ updatedAt: -1 })
        .limit(20);

      notifications = requests.map(r => ({
        id: r._id, requestId: r.requestId, status: r.status,
        message: `Your request ${r.requestId} is ${r.status}`,
        updatedAt: r.updatedAt
      }));
    }

    if (['health_officer', 'admin'].includes(req.user.role)) {
      const pending = await AbsenceRequest
        .find({ status: 'submitted' })
        .populate('student', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(20);

      notifications = pending.map(r => ({
        id: r._id, requestId: r.requestId, status: r.status,
        message: `New submission from ${r.student.firstName} ${r.student.lastName}`,
        createdAt: r.createdAt
      }));
    }

    res.json({ success: true, data: notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;