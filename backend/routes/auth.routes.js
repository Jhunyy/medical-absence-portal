const express  = require('express');
const router   = express.Router();

const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware'); 
const {
  validateRegister,
  validateLogin,
  validateCreateStaff,
  validate
} = require('../middleware/validate.middleware');

// ─── Public routes ────────────────────────────────────────────────────────────
router.post('/register',  validateRegister,  validate, authController.register);
router.post('/login',     validateLogin,     validate, authController.login);

// ─── Protected routes ─────────────────────────────────────────────────────────
router.get( '/me',     authMiddleware.protect, authController.getMe);
router.post('/logout', authMiddleware.protect, authController.logout);

// ─── Admin only: create health_officer / professor / admin accounts ───────────
router.post(
  '/create-staff',
  authMiddleware.protect,
  authMiddleware.restrictTo('admin'),   // only admins can hit this
  validateCreateStaff,
  validate,
  authController.createStaffAccount
);

// ─── Password reset routes (public) ─────────────────────────────────────────
const forgotPasswordController = require('../controllers/forgotPassword.controller');
 
router.post('/forgot-password', forgotPasswordController.forgotPassword);
router.post('/reset-password',  forgotPasswordController.resetPassword);

module.exports = router;