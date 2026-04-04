const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const courseNoticeSchema = new mongoose.Schema({
  courseCode:   { type: String, required: true },
  courseName:   { type: String, required: true },
  professorId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  professorEmail: { type: String },
  noticeSent:   { type: Boolean, default: false },
  noticeSentAt: { type: Date },
  acknowledged: { type: Boolean, default: false },
  acknowledgedAt: { type: Date },
  professorNotes: { type: String }
}, { _id: false });

const absenceRequestSchema = new mongoose.Schema({
  requestId: {
    type: String,
    unique: true,
    default: () => `REQ-${Date.now()}-${Math.random().toString(36).substr(2,6).toUpperCase()}`
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Dates of absence
  absenceDateStart: { type: Date, required: true },
  absenceDateEnd:   { type: Date, required: true },
  reason: {
    type: String,
    enum: ['illness', 'medical_procedure', 'mental_health', 'emergency', 'other'],
    required: true
  },
  // Medical document (stored securely, not shared with professors)
  medicalDocument: {
    originalName: String,
    storedName:   String,
    filePath:     String,
    fileType:     String,
    fileSize:     Number,
    uploadedAt:   Date
  },
  // Status lifecycle: draft → submitted → under_review → approved / rejected
  status: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected'],
    default: 'draft'
  },
  // Health Officer review
  reviewedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt:   { type: Date },
  reviewNotes:  { type: String }, // INTERNAL — not shared with professors
  rejectionReason: { type: String },

  // Courses affected & professor notification tracking
  affectedCourses: [courseNoticeSchema],

  // QR code for verified notice
  qrCode: {
    code:      String,
    imageData: String, // base64 QR image
    expiresAt: Date
  },

  // Audit trail
  auditLog: [{
    action:    String,
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now },
    details:   String
  }]
}, {
  timestamps: true
});

absenceRequestSchema.plugin(mongoosePaginate);

// Indexes for search
absenceRequestSchema.index({ student: 1, status: 1 });
absenceRequestSchema.index({ absenceDateStart: 1 });
absenceRequestSchema.index({ 'affectedCourses.courseCode': 1 });

module.exports = mongoose.model('AbsenceRequest', absenceRequestSchema);