const express    = require('express');
const router     = express.Router();
const { protect, restrictTo } = require('../middleware/auth.middleware');
const dashboardController     = require('../controllers/dashboard.controller');

// All dashboard routes require authentication
router.use(protect);

// Students get their own stats; staff get system-wide stats (scoped in controller)
router.get('/', dashboardController.getDashboard);

module.exports = router;