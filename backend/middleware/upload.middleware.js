const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const crypto = require('crypto');

// ─── Ensure upload directory exists ──────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'medical-documents');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ─── Allowed file types ───────────────────────────────────────────────────────
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf'
];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

// ─── Max file size: 5 MB ──────────────────────────────────────────────────────
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// ─── Storage: randomised filename to prevent path traversal / enumeration ─────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext    = path.extname(file.originalname).toLowerCase();
    const random = crypto.randomBytes(16).toString('hex');
    const stamp  = Date.now();
    // e.g. 1718000000000-a3f9c2b1d4e78f60.pdf
    cb(null, `${stamp}-${random}${ext}`);
  }
});

// ─── File filter: validate MIME type AND extension (both must match) ──────────
const fileFilter = (req, file, cb) => {
  const ext         = path.extname(file.originalname).toLowerCase();
  const mimeAllowed = ALLOWED_MIME_TYPES.includes(file.mimetype);
  const extAllowed  = ALLOWED_EXTENSIONS.includes(ext);

  if (mimeAllowed && extAllowed) {
    return cb(null, true);
  }

  // Reject with a typed error so our error handler can give a clear message
  const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE');
  err.message =
    `Invalid file type. Only JPEG, PNG, WebP, and PDF files are allowed. ` +
    `Received: ${file.mimetype}`;
  cb(err, false);
};

// ─── Multer instance ──────────────────────────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize:  MAX_FILE_SIZE,
    files:     1,   // one medical document per request
    fields:    10,  // cap on non-file fields
    fieldSize: 1024 * 1024  // 1 MB max per text field
  }
});

// ─── Middleware: single file upload (field name: 'medicalDocument') ───────────
exports.uploadMedicalDocument = (req, res, next) => {
  const uploader = upload.single('medicalDocument');

  uploader(req, res, (err) => {
    if (!err) return next();

    // Multer-specific errors
    if (err instanceof multer.MulterError) {
      switch (err.code) {
        case 'LIMIT_FILE_SIZE':
          return res.status(400).json({
            success: false,
            message: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024} MB.`
          });
        case 'LIMIT_FILE_COUNT':
          return res.status(400).json({
            success: false,
            message: 'Only one file can be uploaded per request.'
          });
        case 'LIMIT_UNEXPECTED_FILE':
          return res.status(400).json({
            success: false,
            message: err.message || 'Unexpected file field.'
          });
        default:
          return res.status(400).json({
            success: false,
            message: `Upload error: ${err.message}`
          });
      }
    }

    // Unknown error
    return res.status(500).json({
      success: false,
      message: 'File upload failed. Please try again.'
    });
  });
};

// ─── Middleware: require that a file was actually uploaded ────────────────────
exports.requireFile = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'A medical document (JPEG, PNG, WebP, or PDF) is required.'
    });
  }
  next();
};

// ─── Middleware: file is optional (for draft saves / edits) ──────────────────
exports.optionalFile = (req, res, next) => {
  // Does nothing — just a semantic label so routes are self-documenting
  next();
};