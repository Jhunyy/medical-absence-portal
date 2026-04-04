const jwt  = require('jsonwebtoken');
const User = require('../models/User.model');

// ─── protect: verify JWT and attach user to req ───────────────────────────────
const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Please log in to continue.'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      const message = err.name === 'TokenExpiredError'
        ? 'Your session has expired. Please log in again.'
        : 'Invalid token. Please log in again.';
      return res.status(401).json({ success: false, message });
    }

    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact the clinic.'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ success: false, message: 'Authentication error.' });
  }
};

// ─── restrictTo / authorize: role-based gate ──────────────────────────────────
// Both names work — restrictTo is the cleaner API used in routes
const restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. This action requires one of these roles: ${roles.join(', ')}.`
    });
  }
  next();
};

// Keep 'authorize' as an alias so nothing breaks if it's used elsewhere
const authorize = restrictTo;

module.exports = { protect, restrictTo, authorize };