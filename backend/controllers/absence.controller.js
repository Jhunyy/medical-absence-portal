const AbsenceRequest = require('../models/AbsenceRequest.model');
const AuditLog = require('../models/AuditLog.model');
const emailService = require('../services/email.service');
const qrService = require('../services/qr.service');
const path = require('path');
const fs = require('fs');

// ─── CREATE (Student submits a request) ──────────────────────────────────────
exports.createRequest = async (req, res) => {
  try {
    const { absenceDateStart, absenceDateEnd, reason, affectedCourses } = req.body;

    const parsedCourses = typeof affectedCourses === 'string'
      ? JSON.parse(affectedCourses)
      : affectedCourses;

    const requestData = {
      student: req.user._id,
      absenceDateStart, absenceDateEnd, reason,
      affectedCourses: parsedCourses,
      status: req.body.status === 'submitted' ? 'submitted' : 'draft',
      auditLog: [{
        action: 'REQUEST_CREATED',
        performedBy: req.user._id,
        details: `Request created as ${req.body.status || 'draft'}`
      }]
    };

    if (req.file) {
      requestData.medicalDocument = {
        originalName: req.file.originalname,
        storedName:   req.file.filename,
        filePath:     req.file.path,
        fileType:     req.file.mimetype,
        fileSize:     req.file.size,
        uploadedAt:   new Date()
      };
    }

    const request = await AbsenceRequest.create(requestData);
    await AuditLog.create({
      user: req.user._id, action: 'ABSENCE_REQUEST_CREATED',
      entity: 'AbsenceRequest', entityId: request._id.toString(), ipAddress: req.ip
    });

    res.status(201).json({ success: true, message: 'Request created successfully.', data: request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── READ ALL (with search, filter, pagination) ───────────────────────────────
exports.getRequests = async (req, res) => {
  try {
    const {
      page = 1, limit = 10, status, studentId,
      courseCode, startDate, endDate, search
    } = req.query;

    let query = {};

    // Role-based filtering
    if (req.user.role === 'student') {
      query.student = req.user._id;
    } else if (req.user.role === 'professor') {
      query['affectedCourses.courseCode'] = { $in: req.user.courses };
      query.status = 'approved';
    }

    // Filters
    if (status)     query.status = status;
    if (courseCode) query['affectedCourses.courseCode'] = courseCode;
    if (startDate || endDate) {
      query.absenceDateStart = {};
      if (startDate) query.absenceDateStart.$gte = new Date(startDate);
      if (endDate)   query.absenceDateStart.$lte = new Date(endDate);
    }

    const options = {
      page: parseInt(page), limit: parseInt(limit),
      sort: { createdAt: -1 },
      populate: [
        { path: 'student', select: 'firstName lastName studentId email department' },
        { path: 'reviewedBy', select: 'firstName lastName' }
      ]
    };

    const result = await AbsenceRequest.paginate(query, options);

    // Strip medical document details for non-authorized roles
    if (!['health_officer', 'admin'].includes(req.user.role)) {
      result.docs = result.docs.map(doc => {
        const obj = doc.toObject();
        delete obj.medicalDocument;
        delete obj.reviewNotes;
        return obj;
      });
    }

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── READ ONE ─────────────────────────────────────────────────────────────────
exports.getRequestById = async (req, res) => {
  try {
    const request = await AbsenceRequest
      .findById(req.params.id)
      .populate('student', 'firstName lastName studentId email department')
      .populate('reviewedBy', 'firstName lastName');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    // Students can only see their own
    if (req.user.role === 'student' &&
        request.student._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const data = request.toObject();
    // Strip sensitive data from professors
    if (req.user.role === 'professor') {
      delete data.medicalDocument;
      delete data.reviewNotes;
    }

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── UPDATE (Student edits draft) ────────────────────────────────────────────
exports.updateRequest = async (req, res) => {
  try {
    const request = await AbsenceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });

    if (request.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    if (request.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Only draft requests can be edited.' });
    }

    const { absenceDateStart, absenceDateEnd, reason, affectedCourses, status } = req.body;
    if (absenceDateStart)  request.absenceDateStart = absenceDateStart;
    if (absenceDateEnd)    request.absenceDateEnd = absenceDateEnd;
    if (reason)            request.reason = reason;
    if (affectedCourses)   request.affectedCourses = typeof affectedCourses === 'string'
                             ? JSON.parse(affectedCourses) : affectedCourses;
    if (status === 'submitted') request.status = 'submitted';

    if (req.file) {
      // Remove old file
      if (request.medicalDocument?.filePath &&
          fs.existsSync(request.medicalDocument.filePath)) {
        fs.unlinkSync(request.medicalDocument.filePath);
      }
      request.medicalDocument = {
        originalName: req.file.originalname, storedName: req.file.filename,
        filePath: req.file.path, fileType: req.file.mimetype,
        fileSize: req.file.size, uploadedAt: new Date()
      };
    }

    request.auditLog.push({
      action: 'REQUEST_UPDATED', performedBy: req.user._id,
      details: 'Student updated the request'
    });

    await request.save();
    res.json({ success: true, message: 'Request updated.', data: request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── DELETE (Student deletes draft) ──────────────────────────────────────────
exports.deleteRequest = async (req, res) => {
  try {
    const request = await AbsenceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });

    const isOwner = request.student.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    if (request.status !== 'draft' && !isAdmin) {
      return res.status(400).json({ success: false, message: 'Only draft requests can be deleted.' });
    }

    // Delete associated file
    if (request.medicalDocument?.filePath &&
        fs.existsSync(request.medicalDocument.filePath)) {
      fs.unlinkSync(request.medicalDocument.filePath);
    }

    await request.deleteOne();
    await AuditLog.create({
      user: req.user._id, action: 'ABSENCE_REQUEST_DELETED',
      entity: 'AbsenceRequest', entityId: req.params.id, ipAddress: req.ip
    });

    res.json({ success: true, message: 'Request deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── REVIEW (Health Officer approves/rejects) ─────────────────────────────────
exports.reviewRequest = async (req, res) => {
  try {
    const { status, reviewNotes, rejectionReason } = req.body;

    if (!['approved', 'rejected', 'under_review'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid review status.' });
    }

    const request = await AbsenceRequest.findById(req.params.id)
      .populate('student', 'firstName lastName email studentId');

    if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });

    request.status = status;
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    if (reviewNotes)     request.reviewNotes = reviewNotes;
    if (rejectionReason) request.rejectionReason = rejectionReason;

    // Generate QR code for approved requests
    if (status === 'approved') {
      const qrData = await qrService.generateQR(request.requestId);
      request.qrCode = {
        code: qrData.code, imageData: qrData.imageData,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      };

      // Send notices to professors (privacy-safe)
      await emailService.sendProfessorNotices(request);

      // Notify student
      await emailService.sendStudentStatusUpdate(request.student, request, status);
    }

    if (status === 'rejected') {
      await emailService.sendStudentStatusUpdate(request.student, request, status);
    }

    request.auditLog.push({
      action: `REQUEST_${status.toUpperCase()}`,
      performedBy: req.user._id,
      details: reviewNotes || rejectionReason || `Status changed to ${status}`
    });

    await request.save();
    await AuditLog.create({
      user: req.user._id, action: `ABSENCE_REQUEST_${status.toUpperCase()}`,
      entity: 'AbsenceRequest', entityId: request._id.toString(), ipAddress: req.ip
    });

    res.json({ success: true, message: `Request ${status} successfully.`, data: request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PROFESSOR ACKNOWLEDGES ───────────────────────────────────────────────────
exports.professorAcknowledge = async (req, res) => {
  try {
    const { requestId, courseCode, notes } = req.body;

    const request = await AbsenceRequest.findOne({ requestId });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });
    if (request.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Request is not yet approved.' });
    }

    const course = request.affectedCourses.find(c => c.courseCode === courseCode);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found in this request.' });

    course.acknowledged = true;
    course.acknowledgedAt = new Date();
    if (notes) course.professorNotes = notes;

    request.auditLog.push({
      action: 'PROFESSOR_ACKNOWLEDGED', performedBy: req.user._id,
      details: `Professor acknowledged for course ${courseCode}`
    });

    await request.save();
    res.json({ success: true, message: 'Acknowledged successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── SEARCH ───────────────────────────────────────────────────────────────────
exports.searchRequests = async (req, res) => {
  try {
    const { q, status, courseCode, startDate, endDate, page = 1, limit = 10 } = req.query;
    let query = {};

    if (req.user.role === 'student') query.student = req.user._id;

    if (status)     query.status = status;
    if (courseCode) query['affectedCourses.courseCode'] = new RegExp(courseCode, 'i');
    if (startDate || endDate) {
      query.absenceDateStart = {};
      if (startDate) query.absenceDateStart.$gte = new Date(startDate);
      if (endDate)   query.absenceDateStart.$lte = new Date(endDate);
    }

    const result = await AbsenceRequest.paginate(query, {
      page: parseInt(page), limit: parseInt(limit),
      sort: { createdAt: -1 },
      populate: { path: 'student', select: 'firstName lastName studentId email' }
    });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};