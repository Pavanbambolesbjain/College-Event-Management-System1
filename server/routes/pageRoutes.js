const express = require('express');
const path = require('path');
const router = express.Router();
const { protectStudentPage, protectAdminPage, redirectIfLoggedIn } = require('../middleware/authMiddleware');

const PAGES_DIR = path.join(__dirname, '../../frontend/pages');

// --- Public Pages ---
router.get('/', (req, res) => res.sendFile(path.join(PAGES_DIR, 'index.html')));
router.get('/about', (req, res) => res.sendFile(path.join(PAGES_DIR, 'about.html')));
router.get('/events', (req, res) => res.sendFile(path.join(PAGES_DIR, 'events.html')));
router.get('/event/:id', (req, res) => res.sendFile(path.join(PAGES_DIR, 'event-details.html')));
router.get('/contact', (req, res) => res.sendFile(path.join(PAGES_DIR, 'contact.html')));

// Auth pages (redirect if session is active)
router.get('/login', redirectIfLoggedIn, (req, res) => res.sendFile(path.join(PAGES_DIR, 'login.html')));
router.get('/register', redirectIfLoggedIn, (req, res) => res.sendFile(path.join(PAGES_DIR, 'register.html')));
router.get('/admin/login', redirectIfLoggedIn, (req, res) => res.sendFile(path.join(PAGES_DIR, 'admin-login.html')));

// --- Protected Student Pages ---
router.get('/student/dashboard', protectStudentPage, (req, res) => res.sendFile(path.join(PAGES_DIR, 'student-dashboard.html')));
router.get('/student/profile', protectStudentPage, (req, res) => res.sendFile(path.join(PAGES_DIR, 'profile.html')));
router.get('/student/my-registrations', protectStudentPage, (req, res) => res.sendFile(path.join(PAGES_DIR, 'my-registrations.html')));
router.get('/student/feedback', protectStudentPage, (req, res) => res.sendFile(path.join(PAGES_DIR, 'feedback.html')));
router.get('/student/settings', protectStudentPage, (req, res) => res.sendFile(path.join(PAGES_DIR, 'settings.html')));

// --- Protected Admin Pages ---
router.get('/admin/dashboard', protectAdminPage, (req, res) => res.sendFile(path.join(PAGES_DIR, 'admin-dashboard.html')));
router.get('/admin/manage-events', protectAdminPage, (req, res) => res.sendFile(path.join(PAGES_DIR, 'manage-events.html')));
router.get('/admin/manage-students', protectAdminPage, (req, res) => res.sendFile(path.join(PAGES_DIR, 'manage-students.html')));
router.get('/admin/manage-registrations', protectAdminPage, (req, res) => res.sendFile(path.join(PAGES_DIR, 'manage-registrations.html')));
router.get('/admin/analytics', protectAdminPage, (req, res) => res.sendFile(path.join(PAGES_DIR, 'analytics.html')));
router.get('/admin/manage-feedback', protectAdminPage, (req, res) => res.sendFile(path.join(PAGES_DIR, 'manage-feedback.html')));

// --- Utility Pages ---
router.get('/access-denied', (req, res) => res.sendFile(path.join(PAGES_DIR, 'access-denied.html')));
router.get('/loading', (req, res) => res.sendFile(path.join(PAGES_DIR, 'loading.html')));

module.exports = router;
