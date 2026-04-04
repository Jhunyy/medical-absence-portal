const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action:    { type: String, required: true },
  entity:    { type: String }, // e.g., 'AbsenceRequest', 'User'
  entityId:  { type: String },
  details:   { type: String },
  ipAddress: { type: String },
  userAgent: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);