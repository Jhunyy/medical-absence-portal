const AbsenceRequest = require('../models/AbsenceRequest.model');
const User           = require('../models/User.model');

// ─── GET /api/dashboard ───────────────────────────────────────────────────────
// Returns stats scoped to the caller's role:
//   student       → only their own requests
//   health_officer/admin → all requests system-wide
exports.getDashboard = async (req, res) => {
  try {
    const isStudent = req.user.role === 'student';

    // Base filter — students only see their own data
    const baseQuery = isStudent ? { student: req.user._id } : {};

    // ── Status counts ──────────────────────────────────────────────────────────
    const statusAgg = await AbsenceRequest.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const statusMap = statusAgg.reduce((acc, { _id, count }) => {
      acc[_id] = count;
      return acc;
    }, {});

    // ── Monthly trend (last 6 months) ─────────────────────────────────────────
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrend = await AbsenceRequest.aggregate([
      {
        $match: {
          ...baseQuery,
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year:  { $year:  '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // ── Recent requests (last 5) ───────────────────────────────────────────────
    const recentRequests = await AbsenceRequest
      .find(baseQuery)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('student', 'firstName lastName studentId')
      .select('requestId status createdAt student absenceDateStart');

    // ── Admin/health officer extras ────────────────────────────────────────────
    let extras = {};
    if (!isStudent) {
      const [totalStudents, pendingOldest] = await Promise.all([
        User.countDocuments({ role: 'student', isActive: true }),
        AbsenceRequest
          .findOne({ status: { $in: ['submitted', 'under_review'] } })
          .sort({ createdAt: 1 })
          .select('requestId createdAt')
      ]);

      extras = {
        totalStudents,
        // How many days the oldest pending request has been waiting
        oldestPendingDays: pendingOldest
          ? Math.floor((Date.now() - new Date(pendingOldest.createdAt)) / 86_400_000)
          : 0
      };
    }

    res.json({
      success: true,
      data: {
        // Status breakdown
        total:       Object.values(statusMap).reduce((a, b) => a + b, 0),
        approved:    statusMap['approved']     || 0,
        rejected:    statusMap['rejected']     || 0,
        pending:     statusMap['submitted']    || 0,
        underReview: statusMap['under_review'] || 0,
        draft:       statusMap['draft']        || 0,
        // Charts
        monthlyTrend,
        // Table
        recentRequests,
        // Staff-only extras
        ...extras
      }
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ success: false, message: 'Failed to load dashboard data.' });
  }
};