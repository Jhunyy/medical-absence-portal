const { body, param, query, validationResult } = require('express-validator');

// ─── Helper ───────────────────────────────────────────────────────────────────
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  return res.status(400).json({
    success: false,
    message: 'Validation failed.',
    errors:  errors.array().map(e => ({ field: e.path, message: e.msg }))
  });
};

// ─── Auth validators ──────────────────────────────────────────────────────────

exports.validateRegister = [
  body('firstName')
    .trim().notEmpty().withMessage('First name is required.')
    .isLength({ max: 50 }).withMessage('First name must be 50 characters or less.'),

  body('lastName')
    .trim().notEmpty().withMessage('Last name is required.')
    .isLength({ max: 50 }).withMessage('Last name must be 50 characters or less.'),

  body('email')
    .trim().notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
    .matches(/[0-9]/).withMessage('Password must contain at least one number.'),

  body('role')
    .optional()
    .isIn(['student', 'health_officer'])
    .withMessage('Invalid role. Must be student or health_officer.'),

  // clinicCode is required when role is health_officer
  body('clinicCode')
    .if(body('role').equals('health_officer'))
    .notEmpty().withMessage('Clinic registration code is required for health officer accounts.'),

  body('studentId')
    .optional()
    .trim()
    .isLength({ max: 20 }).withMessage('Student ID must be 20 characters or less.'),

  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Department name is too long.'),
];

exports.validateLogin = [
  body('email')
    .trim().notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.'),
];

exports.validateCreateStaff = [
  body('firstName').trim().notEmpty().withMessage('First name is required.'),
  body('lastName').trim().notEmpty().withMessage('Last name is required.'),
  body('email')
    .trim().notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Invalid email address.')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
  body('role')
    .notEmpty().withMessage('Role is required.')
    .isIn(['health_officer', 'admin'])
    .withMessage('Invalid role. Must be health_officer or admin.'),
];

// ─── Absence request validators ───────────────────────────────────────────────

exports.validateCreateRequest = [
  body('absenceDateStart')
    .notEmpty().withMessage('Absence start date is required.')
    .isISO8601().withMessage('Invalid start date format. Use YYYY-MM-DD.')
    .toDate(),

  body('absenceDateEnd')
    .notEmpty().withMessage('Absence end date is required.')
    .isISO8601().withMessage('Invalid end date format. Use YYYY-MM-DD.')
    .toDate()
    .custom((endDate, { req }) => {
      if (endDate < new Date(req.body.absenceDateStart)) {
        throw new Error('End date must be on or after the start date.');
      }
      return true;
    }),

  body('reason')
    .notEmpty().withMessage('Reason is required.')
    .isIn(['illness', 'medical_procedure', 'mental_health', 'emergency', 'other'])
    .withMessage('Invalid reason.'),

  body('affectedCourses')
    .notEmpty().withMessage('At least one affected course is required.')
    .custom((value) => {
      const courses = typeof value === 'string' ? JSON.parse(value) : value;
      if (!Array.isArray(courses) || courses.length === 0) {
        throw new Error('affectedCourses must be a non-empty array.');
      }
      if (courses.length > 10) {
        throw new Error('A maximum of 10 courses can be listed per request.');
      }
      for (const c of courses) {
        if (!c.courseCode || typeof c.courseCode !== 'string')
          throw new Error('Each course must have a courseCode.');
        if (!c.courseName || typeof c.courseName !== 'string')
          throw new Error('Each course must have a courseName.');
        if (!c.professorEmail || !/^\S+@\S+\.\S+$/.test(c.professorEmail))
          throw new Error(`Course ${c.courseCode} must have a valid professorEmail.`);
      }
      return true;
    }),

  body('status')
    .optional()
    .isIn(['draft', 'submitted']).withMessage('Status must be draft or submitted.'),
];

exports.validateUpdateRequest = [
  param('id').isMongoId().withMessage('Invalid request ID.'),
  body('absenceDateStart').optional().isISO8601().withMessage('Invalid start date format.').toDate(),
  body('absenceDateEnd').optional().isISO8601().withMessage('Invalid end date format.').toDate(),
  body('reason').optional()
    .isIn(['illness', 'medical_procedure', 'mental_health', 'emergency', 'other'])
    .withMessage('Invalid reason value.'),
  body('affectedCourses').optional().custom((value) => {
    const courses = typeof value === 'string' ? JSON.parse(value) : value;
    if (!Array.isArray(courses) || courses.length === 0)
      throw new Error('affectedCourses must be a non-empty array.');
    for (const c of courses) {
      if (!c.courseCode) throw new Error('Each course must have a courseCode.');
      if (!c.courseName) throw new Error('Each course must have a courseName.');
      if (!c.professorEmail || !/^\S+@\S+\.\S+$/.test(c.professorEmail))
        throw new Error(`Course ${c.courseCode} must have a valid professorEmail.`);
    }
    return true;
  }),
  body('status').optional()
    .isIn(['draft', 'submitted']).withMessage('Status can only be set to draft or submitted.'),
];

exports.validateReview = [
  param('id').isMongoId().withMessage('Invalid request ID.'),
  body('status')
    .notEmpty().withMessage('Review status is required.')
    .isIn(['approved', 'rejected', 'under_review'])
    .withMessage('Status must be approved, rejected, or under_review.'),
  body('reviewNotes').optional()
    .isLength({ max: 1000 }).withMessage('Review notes must be 1000 characters or less.'),
  body('rejectionReason').optional()
    .isLength({ max: 500 }).withMessage('Rejection reason must be 500 characters or less.')
    .custom((value, { req }) => {
      if (req.body.status === 'rejected' && !value)
        throw new Error('A rejection reason is required when rejecting a request.');
      return true;
    }),
];

exports.validateMongoId = [
  param('id').isMongoId().withMessage('Invalid ID format.'),
];

exports.validateSearchQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer.').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100.').toInt(),
  query('status').optional()
    .isIn(['draft', 'submitted', 'under_review', 'approved', 'rejected'])
    .withMessage('Invalid status filter.'),
  query('startDate').optional().isISO8601().withMessage('Invalid startDate format.').toDate(),
  query('endDate').optional().isISO8601().withMessage('Invalid endDate format.').toDate(),
];