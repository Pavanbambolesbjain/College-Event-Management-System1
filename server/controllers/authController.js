const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../utils/db');

const JWT_SECRET = process.env.JWT_SECRET || 'campusconnect_super_secret_key_2026_taei';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 24 * 60 * 60 * 1000 // 1 day
};

/**
 * Helper to generate sequential Student ID
 */
async function generateStudentId() {
  const students = await db.readData('students');
  const yearStr = new Date().getFullYear().toString();
  
  if (students.length === 0) {
    return `STU${yearStr}01`;
  }
  
  // Filter students from the current year to increment
  const yearPrefix = `STU${yearStr}`;
  const yearStudents = students.filter(s => s.studentId && s.studentId.startsWith(yearPrefix));
  
  if (yearStudents.length === 0) {
    return `${yearPrefix}01`;
  }
  
  // Extract number from last student ID and increment
  const ids = yearStudents.map(s => parseInt(s.studentId.replace(yearPrefix, ''), 10));
  const maxId = Math.max(...ids);
  const nextId = maxId + 1;
  
  // Format with leading zeros
  return `${yearPrefix}${nextId.toString().padStart(2, '0')}`;
}

exports.studentRegister = async (req, res) => {
  try {
    const { fullName, email, mobile, college, course, year, password } = req.body;

    // Simple Server-side Validations
    if (!fullName || !email || !mobile || !college || !course || !year || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    // Check duplicate email
    const existingStudent = await db.findByEmail('students', email);
    if (existingStudent) {
      return res.status(400).json({ success: false, message: 'Email is already registered' });
    }

    // Check duplicate in admins (prevent admin email hijacking)
    const existingAdmin = await db.findByEmail('admins', email);
    if (existingAdmin) {
      return res.status(400).json({ success: false, message: 'Email belongs to an administrator' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate unique ID
    const studentId = await generateStudentId();

    const newStudent = {
      studentId,
      fullName,
      email: email.toLowerCase(),
      mobile,
      college,
      course,
      year,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    // Save record
    await db.createRecord('students', newStudent);

    // Create JWT
    const token = jwt.sign(
      { id: studentId, email: newStudent.email, role: 'student', fullName },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Set cookie
    res.cookie('token', token, COOKIE_OPTIONS);

    // Exclude password in response
    const { password: _, ...studentProfile } = newStudent;

    res.status(214).json({ // 201 Created -> using 201
      success: true,
      message: 'Registration successful',
      user: studentProfile
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error during registration' });
  }
};

// Map res.status(201) correctly since status 214 might be custom, let's change 214 to 201 to follow HTTP standard specs
exports.studentRegister = async (req, res) => {
  try {
    const { fullName, email, mobile, college, course, year, password } = req.body;

    if (!fullName || !email || !mobile || !college || !course || !year || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    const existingStudent = await db.findByEmail('students', email);
    if (existingStudent) {
      return res.status(400).json({ success: false, message: 'Email is already registered' });
    }

    const existingAdmin = await db.findByEmail('admins', email);
    if (existingAdmin) {
      return res.status(400).json({ success: false, message: 'Email belongs to an administrator' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const studentId = await generateStudentId();

    const newStudent = {
      studentId,
      fullName,
      email: email.toLowerCase(),
      mobile,
      college,
      course,
      year,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    await db.createRecord('students', newStudent);

    const token = jwt.sign(
      { id: studentId, email: newStudent.email, role: 'student', fullName },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.cookie('token', token, COOKIE_OPTIONS);

    const { password: _, ...studentProfile } = newStudent;

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: studentProfile
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error during registration' });
  }
};

exports.studentLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const student = await db.findByEmail('students', email);
    if (!student) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: student.studentId, email: student.email, role: 'student', fullName: student.fullName },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.cookie('token', token, COOKIE_OPTIONS);

    const { password: _, ...studentProfile } = student;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: studentProfile
    });
  } catch (error) {
    console.error('Student Login Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error during login' });
  }
};

exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const admin = await db.findByEmail('admins', email);
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: admin.adminId, email: admin.email, role: 'admin', fullName: admin.fullName },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.cookie('token', token, COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      message: 'Admin login successful',
      user: {
        adminId: admin.adminId,
        fullName: admin.fullName,
        email: admin.email,
        role: 'admin'
      }
    });
  } catch (error) {
    console.error('Admin Login Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error during admin login' });
  }
};

exports.logout = (req, res) => {
  res.clearCookie('token');
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};
