const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// Get student dashboard stats (Admin or student themselves)
router.get('/student/:id', verifyToken, dashboardController.getStudentDashboard);

// Get admin dashboard stats (Admin only)
router.get('/admin', verifyToken, isAdmin, dashboardController.getAdminDashboard);

module.exports = router;
