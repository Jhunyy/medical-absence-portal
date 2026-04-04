const router = require('express').Router();
const { downloadBackup } = require('../controllers/backup.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.get('/download', protect, authorize('admin'), downloadBackup);

module.exports = router;