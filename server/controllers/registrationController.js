const db = require('../utils/db');

/**
 * Generate sequential Registration ID
 */
async function generateRegistrationId() {
  const registrations = await db.readData('registrations');
  if (registrations.length === 0) {
    return 'REG001';
  }
  const ids = registrations.map(r => {
    const num = parseInt(r.registrationId.replace('REG', ''), 10);
    return isNaN(num) ? 0 : num;
  });
  const maxId = Math.max(...ids);
  return `REG${(maxId + 1).toString().padStart(3, '0')}`;
}

/**
 * Get all registrations (Admin: all, Student: filter by their studentId)
 */
exports.getAllRegistrations = async (req, res) => {
  try {
    const registrations = await db.readData('registrations');
    const events = await db.readData('events');
    const students = await db.readData('students');

    // Combine data for display
    let joined = registrations.map(reg => {
      const event = events.find(e => e.eventId === reg.eventId) || null;
      const student = students.find(s => s.studentId === reg.studentId) || null;
      return {
        ...reg,
        event: event ? { eventName: event.eventName, date: event.date, status: event.status, venue: event.venue } : null,
        student: student ? { fullName: student.fullName, email: student.email, course: student.course, year: student.year } : null
      };
    });

    if (req.user.role === 'student') {
      joined = joined.filter(r => r.studentId === req.user.id);
    }

    res.status(200).json({ success: true, data: joined });
  } catch (error) {
    console.error('Get Registrations Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * Get registrations for a specific student
 */
exports.getStudentRegistrations = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (req.user.role === 'student' && req.user.id !== studentId) {
      return res.status(403).json({ success: false, message: 'Access Denied: Cannot view other student registrations' });
    }

    const registrations = await db.readData('registrations');
    const events = await db.readData('events');

    const studentRegs = registrations.filter(r => r.studentId === studentId);
    
    // Join event info
    const joined = studentRegs.map(reg => {
      const event = events.find(e => e.eventId === reg.eventId) || null;
      return {
        ...reg,
        event: event ? { eventName: event.eventName, date: event.date, startTime: event.startTime, venue: event.venue, status: event.status } : null
      };
    });

    res.status(200).json({ success: true, data: joined });
  } catch (error) {
    console.error('Get Student Registrations Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * Register for an event
 */
exports.createRegistration = async (req, res) => {
  try {
    const { eventId } = req.body;
    const studentId = req.user.id;

    if (!eventId) {
      return res.status(400).json({ success: false, message: 'Event ID is required' });
    }

    // 1. Check if event exists
    const event = await db.findById('events', 'eventId', eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // 2. Check registration status
    if (event.status !== 'Registration Open') {
      return res.status(400).json({ success: false, message: `Registration is not open for this event (Current Status: ${event.status})` });
    }

    // 3. Check registration deadline
    const today = new Date().toISOString().split('T')[0];
    if (event.registrationDeadline < today) {
      return res.status(400).json({ success: false, message: 'Registration deadline has passed' });
    }

    // 4. Check if student is already registered (not cancelled)
    const registrations = await db.readData('registrations');
    const duplicate = registrations.find(r => r.eventId === eventId && r.studentId === studentId && r.status !== 'Cancelled');
    if (duplicate) {
      return res.status(400).json({ success: false, message: 'You have already registered for this event' });
    }

    // 5. Check event capacity limits
    if (event.currentRegistrations >= event.maxCapacity) {
      return res.status(400).json({ success: false, message: 'Event is fully booked' });
    }

    // 6. Create Registration record
    const registrationId = await generateRegistrationId();
    const newReg = {
      registrationId,
      eventId,
      studentId,
      status: 'Registered',
      registeredAt: new Date().toISOString()
    };

    await db.createRecord('registrations', newReg);

    // 7. Increment current registrations on event
    await db.updateRecord('events', 'eventId', eventId, {
      currentRegistrations: event.currentRegistrations + 1
    });

    res.status(201).json({
      success: true,
      message: 'Successfully registered for event',
      data: newReg
    });
  } catch (error) {
    console.error('Register Event Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * Update registration status (Admin Only)
 * Can change to: Registered, Cancelled, Attended, Waitlisted
 */
exports.updateRegistration = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const reg = await db.findById('registrations', 'registrationId', id);
    if (!reg) {
      return res.status(404).json({ success: false, message: 'Registration record not found' });
    }

    const oldStatus = reg.status;
    const newStatus = status;

    if (oldStatus === newStatus) {
      return res.status(200).json({ success: true, message: 'Status unchanged', data: reg });
    }

    const event = await db.findById('events', 'eventId', reg.eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Associated event not found' });
    }

    // Handle Seat Counter updates:
    // If status becomes Cancelled, decrement currentRegistrations on the event
    if (newStatus === 'Cancelled' && oldStatus !== 'Cancelled') {
      if (event.currentRegistrations > 0) {
        await db.updateRecord('events', 'eventId', reg.eventId, {
          currentRegistrations: event.currentRegistrations - 1
        });
      }
    }
    // If status was Cancelled and is changing to an active status, verify capacity first, then increment
    else if (oldStatus === 'Cancelled' && newStatus !== 'Cancelled') {
      if (event.currentRegistrations >= event.maxCapacity) {
        return res.status(400).json({ success: false, message: 'Cannot reactivate registration: Event is at full capacity' });
      }
      await db.updateRecord('events', 'eventId', reg.eventId, {
        currentRegistrations: event.currentRegistrations + 1
      });
    }

    const updatedReg = await db.updateRecord('registrations', 'registrationId', id, { status: newStatus });

    res.status(200).json({
      success: true,
      message: 'Registration updated successfully',
      data: updatedReg
    });
  } catch (error) {
    console.error('Update Registration Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * Cancel own registration (Student request)
 */
exports.cancelRegistration = async (req, res) => {
  try {
    const { id } = req.params;
    const reg = await db.findById('registrations', 'registrationId', id);

    if (!reg) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }

    // Enforce authorization
    if (req.user.role === 'student' && reg.studentId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access Denied: Cannot cancel another student registration' });
    }

    if (reg.status === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Registration is already cancelled' });
    }

    // Decrement counter
    const event = await db.findById('events', 'eventId', reg.eventId);
    if (event && event.currentRegistrations > 0) {
      await db.updateRecord('events', 'eventId', reg.eventId, {
        currentRegistrations: event.currentRegistrations - 1
      });
    }

    const updatedReg = await db.updateRecord('registrations', 'registrationId', id, { status: 'Cancelled' });

    res.status(200).json({
      success: true,
      message: 'Registration cancelled successfully',
      data: updatedReg
    });
  } catch (error) {
    console.error('Cancel Registration Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
