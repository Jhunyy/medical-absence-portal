const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const AuditLog = require('../models/AuditLog.model');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

// ─── Roles that can ONLY be assigned by an existing admin ─────────────────────
const SELF_REGISTERABLE_ROLES = ['student'];
const ADMIN_ONLY_ROLES        = ['health_officer', 'professor', 'admin'];

// ─── REGISTER ─────────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const {
      firstName, lastName, email, password,
      role, studentId, employeeId, department
    } = req.body;

    // ── Basic presence checks ──────────────────────────────────────────────────
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'firstName, lastName, email, and password are required.'
      });
    }

    // ── Role security: block privilege escalation on self-registration ─────────
    // If the request is NOT from an authenticated admin, only 'student' is allowed.
    const requestedRole = role || 'student';
    const callerIsAdmin = req.user?.role === 'admin'; // req.user is set by auth middleware

    if (ADMIN_ONLY_ROLES.includes(requestedRole) && !callerIsAdmin) {
      return res.status(403).json({
        success: false,
        message: `Role '${requestedRole}' can only be assigned by an administrator.`
      });
    }

    // ── Duplicate email check ──────────────────────────────────────────────────
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    // ── studentId uniqueness (only relevant for students) ─────────────────────
    if (requestedRole === 'student' && studentId) {
      const existingStudent = await User.findOne({ studentId: studentId.trim() });
      if (existingStudent) {
        return res.status(409).json({ success: false, message: 'Student ID already registered.' });
      }
    }

    // ── Create user ────────────────────────────────────────────────────────────
    const user = await User.create({
      firstName: firstName.trim(),
      lastName:  lastName.trim(),
      email:     email.toLowerCase().trim(),
      password,
      role:      requestedRole,
      studentId: studentId?.trim(),
      employeeId: employeeId?.trim(),
      department: department?.trim()
    });

    await AuditLog.create({
      user:      user._id,
      action:    'USER_REGISTERED',
      entity:    'User',
      entityId:  user._id.toString(),
      ipAddress: req.ip,
      details:   `Role assigned: ${user.role}${callerIsAdmin ? ' (by admin)' : ' (self-registered)'}`
    });

    const token = signToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      token,
      user: {
        id:         user._id,
        firstName:  user.firstName,
        lastName:   user.lastName,
        email:      user.email,
        role:       user.role,
        department: user.department
      }
    });
  } catch (err) {
    // Mongoose validation errors (e.g. invalid email format, minlength)
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(' ') });
    }
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
};

// ─── LOGIN ────────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    // Use a single generic message to prevent email enumeration attacks
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact the clinic.'
      });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    await AuditLog.create({
      user:      user._id,
      action:    'USER_LOGIN',
      entity:    'User',
      entityId:  user._id.toString(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    const token = signToken(user._id);

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id:         user._id,
        firstName:  user.firstName,
        lastName:   user.lastName,
        email:      user.email,
        role:       user.role,
        department: user.department
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
};

// ─── GET ME ───────────────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
exports.logout = async (req, res) => {
  try {
    await AuditLog.create({
      user:      req.user._id,
      action:    'USER_LOGOUT',
      entity:    'User',
      entityId:  req.user._id.toString(),
      ipAddress: req.ip
    });
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    // Logout should always succeed from the client's perspective
    res.json({ success: true, message: 'Logged out successfully.' });
  }
};

// ─── ADMIN: CREATE STAFF ACCOUNT ─────────────────────────────────────────────
// POST /api/auth/create-staff   (protected: admin only, via auth + restrictTo middleware)
exports.createStaffAccount = async (req, res) => {
  try {
    const {
      firstName, lastName, email, password,
      role, employeeId, department, courses
    } = req.body;

    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'firstName, lastName, email, password, and role are required.'
      });
    }

    if (!ADMIN_ONLY_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid staff role. Must be one of: ${ADMIN_ONLY_ROLES.join(', ')}.`
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const user = await User.create({
      firstName:  firstName.trim(),
      lastName:   lastName.trim(),
      email:      email.toLowerCase().trim(),
      password,
      role,
      employeeId: employeeId?.trim(),
      department: department?.trim(),
      courses:    role === 'professor' ? (courses || []) : []
    });

    await AuditLog.create({
      user:      req.user._id,  // the admin who created this
      action:    'STAFF_ACCOUNT_CREATED',
      entity:    'User',
      entityId:  user._id.toString(),
      ipAddress: req.ip,
      details:   `Admin created ${role} account for ${user.email}`
    });

    res.status(201).json({
      success: true,
      message: `${role} account created successfully.`,
      user: {
        id:         user._id,
        firstName:  user.firstName,
        lastName:   user.lastName,
        email:      user.email,
        role:       user.role,
        department: user.department
      }
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(' ') });
    }
    res.status(500).json({ success: false, message: 'Failed to create staff account.' });
  }
};