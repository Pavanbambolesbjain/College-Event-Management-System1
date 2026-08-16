const bcrypt = require('bcryptjs');
const db = require('../utils/db');

/**
 * Get all students (Admin Only)
 */
exports.getAllStudents = async (req, res) => {
  try {
    const students = await db.readData('students');
    // Hide passwords from list response
    const sanitizedStudents = students.map(({ password, ...s }) => s);
    res.status(200).json({ success: true, data: sanitizedStudents });
  } catch (error) {
    console.error('Get All Students Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * Get single student by ID (Admin or the student themselves)
 */
exports.getStudentById = async (req, res) => {
  try {
    const { id } = req.params;

    // Check authorization: Student can only view their own profile
    if (req.user.role === 'student' && req.user.id !== id) {
      return res.status(403).json({ success: false, message: 'Access Denied: Cannot view other profiles' });
    }

    const student = await db.findById('students', 'studentId', id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const { password, ...sanitizedStudent } = student;
    res.status(200).json({ success: true, data: sanitizedStudent });
  } catch (error) {
    console.error('Get Student Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * Update student profile (Admin or the student themselves)
 */
exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, mobile, college, course, year, password } = req.body;

    // Check authorization: Student can only update their own profile
    if (req.user.role === 'student' && req.user.id !== id) {
      return res.status(403).json({ success: false, message: 'Access Denied: Cannot update other profiles' });
    }

    // Find student
    const student = await db.findById('students', 'studentId', id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const updatedFields = {};

    if (fullName) updatedFields.fullName = fullName;
    if (mobile) updatedFields.mobile = mobile;
    if (college) updatedFields.college = college;
    if (course) updatedFields.course = course;
    if (year) updatedFields.year = year;

    // If updating email, check uniqueness
    if (email && email.toLowerCase() !== student.email.toLowerCase()) {
      const emailExists = await db.findByEmail('students', email);
      const adminEmailExists = await db.findByEmail('admins', email);
      if (emailExists || adminEmailExists) {
        return res.status(400).json({ success: false, message: 'Email is already taken' });
      }
      updatedFields.email = email.toLowerCase();
    }

    // If updating password, hash it
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      }
      const salt = await bcrypt.genSalt(10);
      updatedFields.password = await bcrypt.hash(password, salt);
    }

    const updatedStudent = await db.updateRecord('students', 'studentId', id, updatedFields);
    const { password: _, ...sanitizedStudent } = updatedStudent;

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: sanitizedStudent
    });
  } catch (error) {
    console.error('Update Student Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * Delete student (Admin Only)
 */
exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const studentExists = await db.findById('students', 'studentId', id);
    
    if (!studentExists) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Delete student
    await db.deleteRecord('students', 'studentId', id);

    // Delete student's registrations
    const registrations = await db.readData('registrations');
    const filteredRegistrations = registrations.filter(r => r.studentId !== id);
    
    // Decrement current registrations count in events for deleted registrations
    const deletedRegistrations = registrations.filter(r => r.studentId === id && r.status !== 'Cancelled');
    if (deletedRegistrations.length > 0) {
      const events = await db.readData('events');
      for (const reg of deletedRegistrations) {
        const eventIndex = events.findIndex(e => e.eventId === reg.eventId);
        if (eventIndex !== -1 && events[eventIndex].currentRegistrations > 0) {
          events[eventIndex].currentRegistrations -= 1;
        }
      }
      await db.writeData('events', events);
    }
    
    await db.writeData('registrations', filteredRegistrations);

    // Delete student's feedback
    const feedback = await db.readData('feedback');
    const filteredFeedback = feedback.filter(f => f.studentId !== id);
    await db.writeData('feedback', filteredFeedback);

    res.status(200).json({ success: true, message: 'Student and associated data deleted successfully' });
  } catch (error) {
    console.error('Delete Student Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
