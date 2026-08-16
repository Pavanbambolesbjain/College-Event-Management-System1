const db = require('../utils/db');

/**
 * Generate sequential Feedback ID
 */
async function generateFeedbackId() {
  const feedback = await db.readData('feedback');
  if (feedback.length === 0) {
    return 'FB001';
  }
  const ids = feedback.map(f => {
    const num = parseInt(f.feedbackId.replace('FB', ''), 10);
    return isNaN(num) ? 0 : num;
  });
  const maxId = Math.max(...ids);
  return `FB${(maxId + 1).toString().padStart(3, '0')}`;
}

/**
 * Get all feedback (Admin: all, Student: filter by their studentId)
 */
exports.getAllFeedback = async (req, res) => {
  try {
    const feedback = await db.readData('feedback');
    const events = await db.readData('events');
    const students = await db.readData('students');

    // Combine data
    let joined = feedback.map(fb => {
      const event = events.find(e => e.eventId === fb.eventId) || null;
      const student = students.find(s => s.studentId === fb.studentId) || null;
      return {
        ...fb,
        event: event ? { eventName: event.eventName, date: event.date } : null,
        student: student ? { fullName: student.fullName, course: student.course, email: student.email } : null
      };
    });

    if (req.user.role === 'student') {
      joined = joined.filter(f => f.studentId === req.user.id);
    }

    res.status(200).json({ success: true, data: joined });
  } catch (error) {
    console.error('Get Feedback Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * Submit feedback (Student Only)
 */
exports.createFeedback = async (req, res) => {
  try {
    const { eventId, rating, comment } = req.body;
    const studentId = req.user.id;

    if (!eventId || !rating || !comment) {
      return res.status(400).json({ success: false, message: 'All feedback fields are required' });
    }

    const ratingVal = parseInt(rating, 10);
    if (isNaN(ratingVal) || ratingVal < 1 || ratingVal > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5' });
    }

    // Check if event exists
    const event = await db.findById('events', 'eventId', eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Check if student is registered for this event
    const registrations = await db.readData('registrations');
    const registration = registrations.find(r => r.eventId === eventId && r.studentId === studentId && r.status !== 'Cancelled');
    if (!registration) {
      return res.status(400).json({ success: false, message: 'You can only give feedback for events you registered for.' });
    }

    // Check if duplicate feedback
    const feedbackList = await db.readData('feedback');
    const duplicate = feedbackList.find(f => f.eventId === eventId && f.studentId === studentId);
    if (duplicate) {
      return res.status(400).json({ success: false, message: 'You have already submitted feedback for this event' });
    }

    const feedbackId = await generateFeedbackId();
    const newFeedback = {
      feedbackId,
      eventId,
      studentId,
      rating: ratingVal,
      comment,
      createdAt: new Date().toISOString()
    };

    await db.createRecord('feedback', newFeedback);

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: newFeedback
    });
  } catch (error) {
    console.error('Create Feedback Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * Delete feedback (Admin Only)
 */
exports.deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const exists = await db.findById('feedback', 'feedbackId', id);

    if (!exists) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }

    await db.deleteRecord('feedback', 'feedbackId', id);

    res.status(200).json({ success: true, message: 'Feedback deleted successfully' });
  } catch (error) {
    console.error('Delete Feedback Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
