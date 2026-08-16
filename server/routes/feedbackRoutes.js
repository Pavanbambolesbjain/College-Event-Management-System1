const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { verifyToken, isAdmin, isStudent } = require('../middleware/authMiddleware');

// Get all feedback (Admin gets all, Student gets their own)
router.get('/', verifyToken, feedbackController.getAllFeedback);

// Submit feedback (Student only)
router.post('/', verifyToken, isStudent, feedbackController.createFeedback);

// Delete feedback (Admin only)
router.delete('/:id', verifyToken, isAdmin, feedbackController.deleteFeedback);

module.exports = router;
