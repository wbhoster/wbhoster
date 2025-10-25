const { allQuery, runQuery } = require('../database');
const { sendWhatsAppMessage } = require('./whatsappService');

/**
 * Check for expiring subscriptions and send alerts
 */
async function checkExpiringSubscriptions() {
  try {
    const alertDays = parseInt(process.env.ALERT_DAYS_BEFORE_EXPIRY || 7);
    
    // Get subscriptions expiring within the alert period
    const expiringSubscriptions = await allQuery(`
      SELECT s.*, c.name as client_name, c.whatsapp_number
      FROM subscriptions s
      JOIN clients c ON s.client_id = c.id
      WHERE s.status = 'active' 
        AND DATE(s.end_date) = DATE('now', '+' || ? || ' days')
    `, [alertDays]);

    console.log(`Found ${expiringSubscriptions.length} subscriptions expiring in ${alertDays} days`);

    for (const subscription of expiringSubscriptions) {
      const message = `Hello ${subscription.client_name},\n\n` +
        `Your IPTV subscription "${subscription.plan_name}" will expire in ${alertDays} days on ${subscription.end_date}.\n\n` +
        `Please renew your subscription to continue enjoying uninterrupted service.\n\n` +
        `Contact us for renewal.`;

      const result = await sendWhatsAppMessage(subscription.whatsapp_number, message);

      // Log the alert
      await runQuery(
        `INSERT INTO whatsapp_alerts (client_id, subscription_id, whatsapp_number, message, status)
         VALUES (?, ?, ?, ?, ?)`,
        [subscription.client_id, subscription.id, subscription.whatsapp_number, message, result.success ? 'sent' : 'failed']
      );

      console.log(`Alert ${result.success ? 'sent' : 'failed'} to ${subscription.client_name} (${subscription.whatsapp_number})`);
    }

    // Also check for subscriptions expiring today
    const expiringToday = await allQuery(`
      SELECT s.*, c.name as client_name, c.whatsapp_number
      FROM subscriptions s
      JOIN clients c ON s.client_id = c.id
      WHERE s.status = 'active' 
        AND DATE(s.end_date) = DATE('now')
    `);

    for (const subscription of expiringToday) {
      const message = `Hello ${subscription.client_name},\n\n` +
        `Your IPTV subscription "${subscription.plan_name}" expires TODAY!\n\n` +
        `Please renew immediately to avoid service interruption.\n\n` +
        `Contact us now for renewal.`;

      const result = await sendWhatsAppMessage(subscription.whatsapp_number, message);

      await runQuery(
        `INSERT INTO whatsapp_alerts (client_id, subscription_id, whatsapp_number, message, status)
         VALUES (?, ?, ?, ?, ?)`,
        [subscription.client_id, subscription.id, subscription.whatsapp_number, message, result.success ? 'sent' : 'failed']
      );

      // Update subscription status to expired
      await runQuery(
        'UPDATE subscriptions SET status = ? WHERE id = ?',
        ['expired', subscription.id]
      );
    }

    return {
      alertsSent: expiringSubscriptions.length + expiringToday.length,
      expiringInDays: expiringSubscriptions.length,
      expiringToday: expiringToday.length
    };
  } catch (error) {
    console.error('Error checking expiring subscriptions:', error);
    throw error;
  }
}

/**
 * Schedule periodic checks for expiring subscriptions
 */
function scheduleExpiryAlerts() {
  // Run immediately on startup
  checkExpiringSubscriptions()
    .then(result => {
      console.log('Initial expiry check completed:', result);
    })
    .catch(err => {
      console.error('Error in initial expiry check:', err);
    });

  // Schedule to run every hour
  setInterval(() => {
    console.log('Running scheduled expiry check...');
    checkExpiringSubscriptions()
      .then(result => {
        console.log('Scheduled expiry check completed:', result);
      })
      .catch(err => {
        console.error('Error in scheduled expiry check:', err);
      });
  }, 60 * 60 * 1000); // Every hour

  console.log('✅ Alert scheduler initialized (runs every hour)');
}

/**
 * Send welcome message to new client
 */
async function sendWelcomeMessage(client, subscription) {
  try {
    const message = `Welcome ${client.name}! 🎉\n\n` +
      `Your IPTV subscription has been activated:\n\n` +
      `Plan: ${subscription.plan_name}\n` +
      `Valid until: ${subscription.end_date}\n` +
      (subscription.username ? `Username: ${subscription.username}\n` : '') +
      (subscription.password ? `Password: ${subscription.password}\n` : '') +
      `\nEnjoy your service! Contact us for any support.`;

    const result = await sendWhatsAppMessage(client.whatsapp_number, message);

    await runQuery(
      `INSERT INTO whatsapp_alerts (client_id, subscription_id, whatsapp_number, message, status)
       VALUES (?, ?, ?, ?, ?)`,
      [client.id, subscription.id, client.whatsapp_number, message, result.success ? 'sent' : 'failed']
    );

    return result;
  } catch (error) {
    console.error('Error sending welcome message:', error);
    throw error;
  }
}

module.exports = {
  checkExpiringSubscriptions,
  scheduleExpiryAlerts,
  sendWelcomeMessage
};
