const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// Get all students (Admin only)
router.get('/', verifyToken, isAdmin, studentController.getAllStudents);

// Get specific student profile (Admin or the student themselves)
router.get('/:id', verifyToken, studentController.getStudentById);

// Update profile (Admin or student themselves)
router.put('/:id', verifyToken, studentController.updateStudent);

// Delete student (Admin only)
router.delete('/:id', verifyToken, isAdmin, studentController.deleteStudent);

module.exports = router;
