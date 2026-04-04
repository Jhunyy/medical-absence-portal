const crypto       = require('crypto');
const User         = require('../models/User.model');
const emailService = require('../services/email.service');

// In-memory token store: token → { userId, expiresAt }
// Simple and sufficient for this project scale.
const resetTokens = new Map();

// Clean up expired tokens every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of resetTokens.entries()) {
    if (now > data.expiresAt) resetTokens.delete(token);
  }
}, 15 * 60 * 1000);

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Always return the same message — never reveal whether email exists
    if (!user || !user.isActive) {
      return res.json({
        success: true,
        message: 'If that email is registered, a reset link has been sent.'
      });
    }

    // Clear any existing token for this user first
    for (const [t, data] of resetTokens.entries()) {
      if (data.userId === user._id.toString()) resetTokens.delete(t);
    }

    const token     = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes
    resetTokens.set(token, { userId: user._id.toString(), expiresAt });

    // Send email — log error but still return success to avoid email enumeration
    try {
      await emailService.sendPasswordReset(user, token);
      console.log(`✅ Password reset email sent to ${user.email}`);
    } catch (emailErr) {
      console.error('❌ Failed to send password reset email:', emailErr.message);
      // Don't expose the email error to the client
    }

    res.json({
      success: true,
      message: 'If that email is registered, a reset link has been sent.'
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required.'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters.'
      });
    }

    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least one uppercase letter.'
      });
    }

    if (!/[0-9]/.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least one number.'
      });
    }

    const tokenData = resetTokens.get(token);

    if (!tokenData) {
      return res.status(400).json({
        success: false,
        message: 'Reset link is invalid. Please request a new one.'
      });
    }

    if (Date.now() > tokenData.expiresAt) {
      resetTokens.delete(token);
      return res.status(400).json({
        success: false,
        message: 'Reset link has expired. Please request a new one.'
      });
    }

    const user = await User.findById(tokenData.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.password = password; // pre-save hook in User.model.js hashes this
    await user.save();
    resetTokens.delete(token);

    console.log(`✅ Password reset successfully for ${user.email}`);
    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
};