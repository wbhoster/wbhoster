require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const db = require('./database');
const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const subscriptionRoutes = require('./routes/subscriptions');
const whatsappRoutes = require('./routes/whatsapp');
const { scheduleExpiryAlerts } = require('./services/alertService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname)));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Root route - serve admin portal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Initialize database and start server
db.initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 IPTV Admin Portal running on http://localhost:${PORT}`);
      console.log(`📊 Database initialized successfully`);
      
      // Start automated expiry alert checking (runs every hour)
      scheduleExpiryAlerts();
      console.log(`📱 WhatsApp alert service started`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

module.exports = app;
