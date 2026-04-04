const AbsenceRequest = require('../models/AbsenceRequest.model');
const User = require('../models/User.model');
const AuditLog = require('../models/AuditLog.model');

exports.downloadBackup = async (req, res) => {
  try {
    const [requests, users, auditLogs] = await Promise.all([
      AbsenceRequest.find().populate('student', 'firstName lastName studentId email'),
      User.find().select('-password'),
      AuditLog.find().sort({ createdAt: -1 }).limit(1000)
    ]);

    const backup = {
      exportedAt: new Date().toISOString(),
      exportedBy: req.user.email,
      version: '1.0.0',
      data: {
        absenceRequests: requests,
        users,
        auditLogs
      },
      summary: {
        totalRequests: requests.length,
        totalUsers: users.length,
        totalLogs: auditLogs.length
      }
    };

    await AuditLog.create({
      user: req.user._id, action: 'DATA_BACKUP_DOWNLOADED',
      entity: 'System', ipAddress: req.ip
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition',
      `attachment; filename=backup-${new Date().toISOString().split('T')[0]}.json`);
    res.send(JSON.stringify(backup, null, 2));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};