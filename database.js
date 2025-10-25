require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'iptv_admin',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw error;
  }
}

// Initialize database tables and default data
async function initDatabase() {
  try {
    await testConnection();
    
    // Check if default admin exists, if not create one
    const [admins] = await pool.query('SELECT id FROM admins LIMIT 1');
    
    if (admins.length === 0) {
      const defaultUsername = process.env.ADMIN_USERNAME || 'admin';
      const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      
      await pool.query(
        'INSERT INTO admins (username, password, email, full_name) VALUES (?, ?, ?, ?)',
        [defaultUsername, hashedPassword, 'admin@example.com', 'System Administrator']
      );
      
      console.log('✅ Default admin created:', defaultUsername);
    }
    
    // Check if default templates exist
    const [templates] = await pool.query('SELECT id FROM whatsapp_templates LIMIT 1');
    
    if (templates.length === 0) {
      const defaultTemplates = [
        {
          type: 'welcome',
          name: 'Welcome Message',
          content: '🎉 Welcome {CLIENT_NAME}!\n\nThank you for subscribing to our IPTV service! 📺\n\n✅ Your subscription is now ACTIVE\n\n📋 Subscription Details:\n━━━━━━━━━━━━━━━━━━━\n👤 Username: {USERNAME}\n🔐 Password: {PASSWORD}\n🌐 Host URL: {HOST_URL}\n📅 Valid From: {START_DATE}\n📅 Valid Until: {END_DATE}\n⏳ Duration: {PACKAGE_DURATION} month(s)\n━━━━━━━━━━━━━━━━━━━\n\n📱 Need help? Contact our support team!\n\nEnjoy unlimited entertainment! 🍿🎬',
          description: 'Sent when a new subscription is created',
          variables: JSON.stringify(['CLIENT_NAME', 'USERNAME', 'PASSWORD', 'HOST_URL', 'START_DATE', 'END_DATE', 'PACKAGE_DURATION'])
        },
        {
          type: 'pre_expiry',
          name: 'Pre-Expiry Reminder (7 days before)',
          content: '⏰ Renewal Reminder - {CLIENT_NAME}\n\nYour IPTV subscription will expire soon! ⚠️\n\n📋 Subscription Details:\n━━━━━━━━━━━━━━━━━━━\n👤 Username: {USERNAME}\n📅 Expiry Date: {END_DATE}\n⏳ Days Left: {DAYS_LEFT}\n━━━━━━━━━━━━━━━━━━━\n\n💳 Renew now to avoid service interruption!\n\n📞 Contact us today to renew your subscription and keep enjoying uninterrupted entertainment! 📺✨',
          description: 'Sent 7 days before subscription expires',
          variables: JSON.stringify(['CLIENT_NAME', 'USERNAME', 'END_DATE', 'DAYS_LEFT'])
        },
        {
          type: 'expiry_day',
          name: 'Expiry Day Alert',
          content: '🚨 URGENT - {CLIENT_NAME}\n\nYour IPTV subscription expires TODAY! ⚠️\n\n📋 Subscription Details:\n━━━━━━━━━━━━━━━━━━━\n👤 Username: {USERNAME}\n📅 Expiry Date: {END_DATE}\n━━━━━━━━━━━━━━━━━━━\n\n⚡ RENEW IMMEDIATELY to avoid service disconnection!\n\n📞 Contact us NOW to renew and continue enjoying your favorite channels! 📺',
          description: 'Sent on the day subscription expires',
          variables: JSON.stringify(['CLIENT_NAME', 'USERNAME', 'END_DATE'])
        },
        {
          type: 'renewal',
          name: 'Renewal Confirmation',
          content: '✅ Subscription Renewed Successfully!\n\nHello {CLIENT_NAME}! 🎉\n\nYour IPTV subscription has been renewed! 📺\n\n📋 Updated Subscription:\n━━━━━━━━━━━━━━━━━━━\n👤 Username: {USERNAME}\n🔐 Password: {PASSWORD}\n🌐 Host URL: {HOST_URL}\n📅 New Start Date: {START_DATE}\n📅 New Expiry Date: {END_DATE}\n⏳ Duration: {PACKAGE_DURATION} month(s)\n━━━━━━━━━━━━━━━━━━━\n\nThank you for continuing with us! 🙏\n\nEnjoy uninterrupted entertainment! 🍿🎬',
          description: 'Sent when subscription is renewed',
          variables: JSON.stringify(['CLIENT_NAME', 'USERNAME', 'PASSWORD', 'HOST_URL', 'START_DATE', 'END_DATE', 'PACKAGE_DURATION'])
        }
      ];
      
      for (const template of defaultTemplates) {
        await pool.query(
          'INSERT INTO whatsapp_templates (template_type, template_name, message_content, description, variables) VALUES (?, ?, ?, ?, ?)',
          [template.type, template.name, template.content, template.description, template.variables]
        );
      }
      
      console.log('✅ Default WhatsApp templates created');
    }
    
    // Check if default host URLs exist
    const [hosts] = await pool.query('SELECT id FROM host_urls LIMIT 1');
    
    if (hosts.length === 0) {
      const defaultHosts = [
        { name: 'Main Server', url: 'http://main-server.example.com:8080', description: 'Primary streaming server' },
        { name: 'Backup Server', url: 'http://backup-server.example.com:8080', description: 'Backup streaming server' }
      ];
      
      for (const host of defaultHosts) {
        await pool.query(
          'INSERT INTO host_urls (name, url, description) VALUES (?, ?, ?)',
          [host.name, host.url, host.description]
        );
      }
      
      console.log('✅ Default host URLs created');
    }
    
    console.log('✅ Database initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  }
}

// Helper function to execute queries
async function query(sql, params = []) {
  try {
    const [results] = await pool.query(sql, params);
    return results;
  } catch (error) {
    console.error('Query error:', error.message);
    throw error;
  }
}

// Helper function to get single row
async function getOne(sql, params = []) {
  try {
    const [results] = await pool.query(sql, params);
    return results[0] || null;
  } catch (error) {
    console.error('Query error:', error.message);
    throw error;
  }
}

// Helper function to get all rows
async function getAll(sql, params = []) {
  try {
    const [results] = await pool.query(sql, params);
    return results;
  } catch (error) {
    console.error('Query error:', error.message);
    throw error;
  }
}

// Helper function to execute insert/update/delete
async function execute(sql, params = []) {
  try {
    const [result] = await pool.query(sql, params);
    return result;
  } catch (error) {
    console.error('Execute error:', error.message);
    throw error;
  }
}

// Close pool (for graceful shutdown)
async function closePool() {
  try {
    await pool.end();
    console.log('Database pool closed');
  } catch (error) {
    console.error('Error closing pool:', error.message);
  }
}

// Generate unique numeric username
async function generateUsername() {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return timestamp.slice(-8) + random; // 11 digits
}

// Generate secure numeric password
function generatePassword(length = 10) {
  let password = '';
  for (let i = 0; i < length; i++) {
    password += Math.floor(Math.random() * 10);
  }
  return password;
}

module.exports = {
  pool,
  initDatabase,
  query,
  getOne,
  getAll,
  execute,
  closePool,
  testConnection,
  generateUsername,
  generatePassword
};
