const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'campusconnect_super_secret_key_2026_taei';

/**
 * API Middleware: Verifies the JWT token from cookie or Authorization header.
 */
function verifyToken(req, res, next) {
  const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access Denied: No Token Provided' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified; // Contains id, email, role, fullName
    next();
  } catch (error) {
    res.clearCookie('token');
    return res.status(401).json({ success: false, message: 'Invalid Token' });
  }
}

/**
 * API Middleware: Checks if user role is student.
 */
function isStudent(req, res, next) {
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).json({ success: false, message: 'Access Denied: Students Only' });
  }
  next();
}

/**
 * API Middleware: Checks if user role is admin.
 */
function isAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access Denied: Admins Only' });
  }
  next();
}

/**
 * Page Guard: Redirects student page requests to login if unauthenticated.
 */
function protectStudentPage(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.redirect('/login?error=Please log in to access this page');
  }
  try {
    const verified = jwt.verify(token, JWT_SECRET);
    if (verified.role !== 'student') {
      return res.redirect('/access-denied');
    }
    req.user = verified;
    next();
  } catch (error) {
    res.clearCookie('token');
    return res.redirect('/login?error=Session expired. Please log in again');
  }
}

/**
 * Page Guard: Redirects admin page requests to admin-login if unauthenticated.
 */
function protectAdminPage(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.redirect('/admin/login?error=Please log in as Administrator');
  }
  try {
    const verified = jwt.verify(token, JWT_SECRET);
    if (verified.role !== 'admin') {
      return res.redirect('/access-denied');
    }
    req.user = verified;
    next();
  } catch (error) {
    res.clearCookie('token');
    return res.redirect('/admin/login?error=Session expired. Please log in again');
  }
}

/**
 * Page Guard: If user is already logged in, redirects them away from login/register pages.
 */
function redirectIfLoggedIn(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return next();
  }
  try {
    const verified = jwt.verify(token, JWT_SECRET);
    if (verified.role === 'admin') {
      return res.redirect('/admin/dashboard');
    } else if (verified.role === 'student') {
      return res.redirect('/student/dashboard');
    }
    next();
  } catch (error) {
    res.clearCookie('token');
    next();
  }
}

module.exports = {
  verifyToken,
  isStudent,
  isAdmin,
  protectStudentPage,
  protectAdminPage,
  redirectIfLoggedIn
};
