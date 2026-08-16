require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const eventRoutes = require('./routes/eventRoutes');
const registrationRoutes = require('./routes/registrationRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const pageRoutes = require('./routes/pageRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static folders
// Serves everything inside public/ and frontend/ directories
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.static(path.join(__dirname, '../frontend')));

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Register Page Views
app.use('/', pageRoutes);

// 404 API Endpoint Handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'API Endpoint not found' });
});

// 404 Frontend Page Handler (Fallback)
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '../frontend/pages/404.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error. Please contact administrator.'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(` CampusConnect Server running on port ${PORT}`);
  console.log(` URL: http://localhost:${PORT}`);
  console.log(`==================================================`);
});
