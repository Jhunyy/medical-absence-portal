const express  = require('express');
const router   = express.Router();
const path     = require('path');
const fs       = require('fs');

const absenceController = require('../controllers/absence.controller');
const authMiddleware    = require('../middleware/auth.middleware');
const { generateExcuseLetter } = require('../services/pdf.service');
const {
  uploadMedicalDocument
} = require('../middleware/upload.middleware');
const {
  validateCreateRequest, validateUpdateRequest,
  validateReview, validateMongoId,
  validateSearchQuery, validate
} = require('../middleware/validate.middleware');

// ─── Allow token via query param for direct browser file links ────────────────
router.use((req, res, next) => {
  if (!req.headers.authorization && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
});

// All absence routes require authentication
router.use(authMiddleware.protect);

// ─── Student routes ───────────────────────────────────────────────────────────
router.post(
  '/',
  uploadMedicalDocument,
  validateCreateRequest,
  validate,
  (req, res, next) => {
    if (req.body.status === 'submitted' && !req.file) {
      return res.status(400).json({
        success: false,
        message: 'A medical document is required when submitting a request.'
      });
    }
    next();
  },
  absenceController.createRequest
);

router.get('/',         validateSearchQuery, validate, absenceController.getRequests);
router.get('/search',   validateSearchQuery, validate, absenceController.searchRequests);
router.get('/:id',      validateMongoId,     validate, absenceController.getRequestById);

router.put(
  '/:id',
  uploadMedicalDocument,
  validateUpdateRequest,
  validate,
  absenceController.updateRequest
);

router.delete('/:id', validateMongoId, validate, absenceController.deleteRequest);

// ─── View medical document (staff only) ──────────────────────────────────────
router.get(
  '/:id/document',
  authMiddleware.restrictTo('health_officer', 'admin'),
  async (req, res) => {
    try {
      const request = await require('../models/AbsenceRequest.model').findById(req.params.id);
      if (!request?.medicalDocument?.filePath) {
        return res.status(404).json({ success: false, message: 'Document not found.' });
      }
      if (!fs.existsSync(request.medicalDocument.filePath)) {
        return res.status(404).json({ success: false, message: 'File no longer exists on server.' });
      }
      res.setHeader('Content-Disposition', `inline; filename="${request.medicalDocument.originalName}"`);
      res.setHeader('Content-Type', request.medicalDocument.fileType);
      res.sendFile(path.resolve(request.medicalDocument.filePath));
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to retrieve document.' });
    }
  }
);

// ─── Download excuse letter PDF (approved requests only) ─────────────────────
router.get(
  '/:id/excuse-letter',
  async (req, res) => {
    try {
      const request = await require('../models/AbsenceRequest.model')
        .findById(req.params.id)
        .populate('student', 'firstName lastName studentId email department')
        .populate('reviewedBy', 'firstName lastName');

      if (!request) {
        return res.status(404).json({ success: false, message: 'Request not found.' });
      }
      if (request.status !== 'approved') {
        return res.status(400).json({
          success: false,
          message: 'Excuse letter is only available for approved requests.'
        });
      }

      const isOwner = request.student._id.toString() === req.user._id.toString();
      const isStaff = ['health_officer', 'admin'].includes(req.user.role);
      if (!isOwner && !isStaff) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }

      const pdfBuffer = await generateExcuseLetter(request);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="excuse-letter-${request.requestId}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (err) {
      console.error('PDF generation error:', err);
      res.status(500).json({ success: false, message: 'Failed to generate excuse letter.' });
    }
  }
);

// ─── Health Officer / Admin: review ──────────────────────────────────────────
router.patch(
  '/:id/review',
  authMiddleware.restrictTo('health_officer', 'admin'),
  validateReview,
  validate,
  absenceController.reviewRequest
);

// NOTE: Professor acknowledge route removed along with professor role.
// Professors now receive email notices only — no app login required.

module.exports = router;