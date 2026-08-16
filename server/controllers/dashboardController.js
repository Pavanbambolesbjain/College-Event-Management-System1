const db = require('../utils/db');

/**
 * Get Student Dashboard Stats
 */
exports.getStudentDashboard = async (req, res) => {
  try {
    const { id } = req.params;

    // Authorization check
    if (req.user.role === 'student' && req.user.id !== id) {
      return res.status(403).json({ success: false, message: 'Access Denied' });
    }

    const student = await db.findById('students', 'studentId', id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const registrations = await db.readData('registrations');
    const events = await db.readData('events');
    const feedback = await db.readData('feedback');

    // Filter registrations for this student
    const studentRegs = registrations.filter(r => r.studentId === id);

    // Sub-counts
    const totalRegistrations = studentRegs.length;
    const cancelledRegistrations = studentRegs.filter(r => r.status === 'Cancelled').length;

    // Join events to get upcoming / completed registrations
    let upcomingCount = 0;
    let completedCount = 0;
    const recentRegDetails = [];

    const todayStr = new Date().toISOString().split('T')[0];

    for (const reg of studentRegs) {
      const event = events.find(e => e.eventId === reg.eventId);
      if (event) {
        if (reg.status !== 'Cancelled') {
          if (event.date >= todayStr && event.status !== 'Completed') {
            upcomingCount++;
          } else {
            completedCount++;
          }
        }
        recentRegDetails.push({
          registrationId: reg.registrationId,
          eventId: event.eventId,
          eventName: event.eventName,
          date: event.date,
          venue: event.venue,
          status: reg.status,
          registeredAt: reg.registeredAt
        });
      }
    }

    // Sort recent registrations by date descending
    recentRegDetails.sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));

    // Feedback submitted count
    const feedbackSubmitted = feedback.filter(f => f.studentId === id).length;

    // Available events: registration open, not registered, deadline not passed
    const registeredEventIds = new Set(studentRegs.filter(r => r.status !== 'Cancelled').map(r => r.eventId));
    const availableEvents = events.filter(e => 
      e.status === 'Registration Open' && 
      e.registrationDeadline >= todayStr &&
      !registeredEventIds.has(e.eventId)
    );

    res.status(200).json({
      success: true,
      data: {
        studentName: student.fullName,
        stats: {
          totalRegistrations,
          upcomingEvents: upcomingCount,
          completedEvents: completedCount,
          cancelledRegistrations,
          feedbackSubmitted
        },
        recentRegistrations: recentRegDetails.slice(0, 5),
        availableEvents: availableEvents.slice(0, 4) // Show top 4
      }
    });
  } catch (error) {
    console.error('Student Dashboard Stats Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * Get Admin Dashboard Stats
 */
exports.getAdminDashboard = async (req, res) => {
  try {
    const students = await db.readData('students');
    const events = await db.readData('events');
    const registrations = await db.readData('registrations');
    const feedback = await db.readData('feedback');

    const totalStudents = students.length;
    const totalEvents = events.length;
    const totalRegistrations = registrations.length;

    // Event counts by status
    const upcomingEvents = events.filter(e => e.status === 'Upcoming' || e.status === 'Registration Open').length;
    const completedEvents = events.filter(e => e.status === 'Completed').length;
    const cancelledEvents = events.filter(e => e.status === 'Cancelled').length;

    // Registrations status counts
    const activeRegs = registrations.filter(r => r.status === 'Registered' || r.status === 'Attended').length;
    const cancelledRegsCount = registrations.filter(r => r.status === 'Cancelled').length;

    // Events by Category distribution
    const categoriesCount = {};
    events.forEach(e => {
      categoriesCount[e.category] = (categoriesCount[e.category] || 0) + 1;
    });

    // Most popular events (by currentRegistrations)
    const sortedEvents = [...events].sort((a, b) => b.currentRegistrations - a.currentRegistrations);
    const popularEvents = sortedEvents.slice(0, 5).map(e => ({
      eventId: e.eventId,
      eventName: e.eventName,
      category: e.category,
      capacity: e.maxCapacity,
      registrations: e.currentRegistrations,
      utilization: e.maxCapacity > 0 ? Math.round((e.currentRegistrations / e.maxCapacity) * 100) : 0
    }));

    // Recent registrations join
    const recentRegs = [...registrations]
      .sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt))
      .slice(0, 5)
      .map(reg => {
        const student = students.find(s => s.studentId === reg.studentId);
        const event = events.find(e => e.eventId === reg.eventId);
        return {
          registrationId: reg.registrationId,
          studentName: student ? student.fullName : 'Unknown Student',
          eventName: event ? event.eventName : 'Unknown Event',
          registeredAt: reg.registeredAt,
          status: reg.status
        };
      });

    // Feedback rating statistics
    const totalRatings = feedback.length;
    const avgRating = totalRatings > 0 
      ? parseFloat((feedback.reduce((sum, f) => sum + f.rating, 0) / totalRatings).toFixed(1))
      : 0;

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalStudents,
          totalEvents,
          totalRegistrations,
          upcomingEvents,
          completedEvents,
          cancelledEvents,
          activeRegistrations: activeRegs,
          cancelledRegistrations: cancelledRegsCount,
          averageRating: avgRating,
          feedbackCount: totalRatings
        },
        categoryDistribution: categoriesCount,
        popularEvents,
        recentRegistrations: recentRegs
      }
    });
  } catch (error) {
    console.error('Admin Dashboard Stats Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
