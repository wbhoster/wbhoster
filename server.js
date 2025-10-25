require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const db = require('./database');

// Import routes
const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const subscriptionRoutes = require('./routes/subscriptions');
const whatsappRoutes = require('./routes/whatsapp');
const hostUrlRoutes = require('./routes/hostUrls');
const templateRoutes = require('./routes/templates');

// Import services
const { scheduleAlertChecks } = require('./services/alertService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware (optional)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Serve static files (HTML/CSS/JS frontend)
app.use(express.static(__dirname));
console.log('✅ Serving static frontend from', __dirname);

// Serve invoices directory (protected - requires authentication would be better)
app.use('/invoices', express.static(path.join(__dirname, 'invoices')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/host-urls', hostUrlRoutes);
app.use('/api/templates', templateRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// System info endpoint (for debugging)
app.get('/api/system-info', (req, res) => {
  res.json({
    node_version: process.version,
    platform: process.platform,
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Serve index.html for all other routes (SPA support)
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'index.html');
  if (require('fs').existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'Frontend files not found' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Something went wrong!',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Initialize database and start server
db.initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎉 IPTV Admin Portal Server Started');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🌐 Server running on: http://localhost:${PORT}`);
      console.log(`📊 Database: MySQL (${process.env.DB_NAME || 'iptv_admin'})`);
      console.log(`🔐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      
      // Start automated alert checking (backup scheduler)
      scheduleAlertChecks();
      console.log('📱 WhatsApp alert scheduler initialized');
      console.log('💡 For production: Set up cPanel cron job');
      console.log('   Command: curl -X POST https://yourdomain.com/api/whatsapp/cron/check-expiry -H "Authorization: Bearer YOUR_CRON_SECRET"');
      console.log('   Schedule: */10 * * * * (every 10 minutes)');
      console.log('');
    });
  })
  .catch(err => {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ Failed to start server');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('Error:', err.message);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await db.closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  await db.closePool();
  process.exit(0);
});

module.exports = app;
