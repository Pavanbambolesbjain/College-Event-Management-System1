const db = require('../utils/db');

/**
 * Generate sequential Event ID
 */
async function generateEventId() {
  const events = await db.readData('events');
  if (events.length === 0) {
    return 'EVT001';
  }
  const ids = events.map(e => {
    const num = parseInt(e.eventId.replace('EVT', ''), 10);
    return isNaN(num) ? 0 : num;
  });
  const maxId = Math.max(...ids);
  return `EVT${(maxId + 1).toString().padStart(3, '0')}`;
}

/**
 * Get all events with Search, Filter, and Sort (Public)
 */
exports.getAllEvents = async (req, res) => {
  try {
    let events = await db.readData('events');
    const { search, category, status, date, sort } = req.query;

    // 1. Search Query (Name, Organizer, Venue)
    if (search) {
      const query = search.toLowerCase();
      events = events.filter(e => 
        (e.eventName && e.eventName.toLowerCase().includes(query)) ||
        (e.organizer && e.organizer.toLowerCase().includes(query)) ||
        (e.venue && e.venue.toLowerCase().includes(query))
      );
    }

    // 2. Category Filter
    if (category && category !== 'All') {
      events = events.filter(e => e.category === category);
    }

    // 3. Status Filter
    if (status && status !== 'All') {
      events = events.filter(e => e.status === status);
    }

    // 4. Date Filter (matches specific date)
    if (date) {
      events = events.filter(e => e.date === date);
    }

    // 5. Sorting
    if (sort) {
      if (sort === 'newest') {
        events.sort((a, b) => b.eventId.localeCompare(a.eventId));
      } else if (sort === 'upcoming') {
        // Sort by date ascending (closest events first)
        events.sort((a, b) => new Date(a.date) - new Date(b.date));
      } else if (sort === 'most_registered') {
        events.sort((a, b) => b.currentRegistrations - a.currentRegistrations);
      }
    } else {
      // Default: sort by date ascending
      events.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    res.status(200).json({ success: true, data: events });
  } catch (error) {
    console.error('Get Events Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * Get single event by ID
 */
exports.getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await db.findById('events', 'eventId', id);
    
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    res.status(200).json({ success: true, data: event });
  } catch (error) {
    console.error('Get Event Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * Create event (Admin Only)
 */
exports.createEvent = async (req, res) => {
  try {
    const {
      eventName, description, category, organizer, date, startTime,
      endTime, venue, maxCapacity, registrationDeadline, image,
      eligibility, rules
    } = req.body;

    // Field Validations
    if (!eventName || !category || !organizer || !date || !startTime || !endTime || !venue || !maxCapacity || !registrationDeadline) {
      return res.status(400).json({ success: false, message: 'Required fields are missing' });
    }

    const eventId = await generateEventId();
    
    // Default status to 'Registration Open' or calculate based on dates
    let initialStatus = 'Registration Open';
    const today = new Date().toISOString().split('T')[0];
    if (registrationDeadline < today) {
      initialStatus = 'Registration Closed';
    }

    const newEvent = {
      eventId,
      eventName,
      description: description || '',
      category,
      organizer,
      date,
      startTime,
      endTime,
      venue,
      maxCapacity: parseInt(maxCapacity, 10),
      currentRegistrations: 0,
      registrationDeadline,
      status: initialStatus,
      image: image || '/images/default-event.jpg',
      eligibility: eligibility || 'Open to all',
      rules: rules || 'No rules specified.'
    };

    await db.createRecord('events', newEvent);

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: newEvent
    });
  } catch (error) {
    console.error('Create Event Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * Update event (Admin Only)
 */
exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await db.findById('events', 'eventId', id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const updateFields = { ...req.body };
    
    // Enforce numbers for capacity
    if (updateFields.maxCapacity) {
      updateFields.maxCapacity = parseInt(updateFields.maxCapacity, 10);
    }
    if (updateFields.currentRegistrations) {
      updateFields.currentRegistrations = parseInt(updateFields.currentRegistrations, 10);
    }

    const updatedEvent = await db.updateRecord('events', 'eventId', id, updateFields);

    res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      data: updatedEvent
    });
  } catch (error) {
    console.error('Update Event Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/**
 * Delete event (Admin Only)
 */
exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const eventExists = await db.findById('events', 'eventId', id);

    if (!eventExists) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    await db.deleteRecord('events', 'eventId', id);

    // Clean up registrations associated with this event
    const registrations = await db.readData('registrations');
    const filteredRegistrations = registrations.filter(r => r.eventId !== id);
    await db.writeData('registrations', filteredRegistrations);

    // Clean up feedback associated with this event
    const feedback = await db.readData('feedback');
    const filteredFeedback = feedback.filter(f => f.eventId !== id);
    await db.writeData('feedback', filteredFeedback);

    res.status(200).json({ success: true, message: 'Event and associated registrations/feedback deleted successfully' });
  } catch (error) {
    console.error('Delete Event Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
