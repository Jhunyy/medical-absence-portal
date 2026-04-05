const jwt      = require('jsonwebtoken');
const User     = require('../models/User.model');
const AuditLog = require('../models/AuditLog.model');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

// ─── REGISTER ─────────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const {
      firstName, lastName, email, password,
      role, studentId, employeeId, department,
      clinicCode  // only required when role === 'health_officer'
    } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'firstName, lastName, email, and password are required.'
      });
    }

    const requestedRole = role || 'student';

    // Only student and health_officer can self-register
    if (!['student', 'health_officer'].includes(requestedRole)) {
      return res.status(403).json({
        success: false,
        message: 'Admin accounts can only be created by an existing administrator.'
      });
    }

    // ── Clinic code gate for health officers ──────────────────────────────────
    if (requestedRole === 'health_officer') {
      const validCode = process.env.CLINIC_REGISTRATION_CODE;

      if (!validCode) {
        // Safety net: if the env variable isn't set, block registration entirely
        console.error('❌ CLINIC_REGISTRATION_CODE is not set in .env');
        return res.status(500).json({
          success: false,
          message: 'Health officer registration is currently unavailable. Contact the administrator.'
        });
      }

      if (!clinicCode || clinicCode.trim() !== validCode) {
        return res.status(403).json({
          success: false,
          message: 'Invalid clinic registration code. Please contact the university clinic administrator.'
        });
      }
    }

    // Students must provide a student ID
    if (requestedRole === 'student' && !studentId?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required for student accounts.'
      });
    }

    // Check for duplicate email
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    // Check for duplicate student ID
    if (requestedRole === 'student' && studentId) {
      const existingStudent = await User.findOne({ studentId: studentId.trim() });
      if (existingStudent) {
        return res.status(409).json({ success: false, message: 'Student ID already registered.' });
      }
    }

    const user = await User.create({
      firstName:  firstName.trim(),
      lastName:   lastName.trim(),
      email:      email.toLowerCase().trim(),
      password,
      role:       requestedRole,
      studentId:  requestedRole === 'student'        ? studentId?.trim()  : undefined,
      employeeId: requestedRole === 'health_officer' ? employeeId?.trim() : undefined,
      department: department?.trim()
    });

    await AuditLog.create({
      user:      user._id,
      action:    'USER_REGISTERED',
      entity:    'User',
      entityId:  user._id.toString(),
      ipAddress: req.ip,
      details:   `Role: ${user.role} (self-registered${requestedRole === 'health_officer' ? ' with clinic code' : ''})`
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
  } catch { /* swallow */ }
  res.json({ success: true, message: 'Logged out successfully.' });
};

// ─── ADMIN: CREATE STAFF ACCOUNT ─────────────────────────────────────────────
exports.createStaffAccount = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, employeeId, department } = req.body;

    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'firstName, lastName, email, password, and role are required.'
      });
    }

    if (!['health_officer', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid staff role. Must be health_officer or admin.'
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
      department: department?.trim()
    });

    await AuditLog.create({
      user:      req.user._id,
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