const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registrationController');
const { verifyToken, isAdmin, isStudent } = require('../middleware/authMiddleware');

// Get registrations (Admin gets all, Student gets their own)
router.get('/', verifyToken, registrationController.getAllRegistrations);

// Get registrations for a specific student (Admin or the student themselves)
router.get('/student/:studentId', verifyToken, registrationController.getStudentRegistrations);

// Create registration (Student only)
router.post('/', verifyToken, isStudent, registrationController.createRegistration);

// Update registration status (Admin only)
router.put('/:id', verifyToken, isAdmin, registrationController.updateRegistration);

// Cancel registration (Student can cancel their own, Admin can cancel any)
router.delete('/:id', verifyToken, registrationController.cancelRegistration);

module.exports = router;
