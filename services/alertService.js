const cron = require('node-cron');
const { getAll, execute, getOne } = require('../database');
const { sendWhatsAppMessage, replaceTemplateVariables } = require('./whatsappService');
const { format } = require('date-fns');

/**
 * Check for subscriptions expiring in X days and send pre-expiry alerts
 */
async function checkPreExpiryAlerts() {
  try {
    const alertDays = parseInt(process.env.ALERT_DAYS_BEFORE_EXPIRY || 7);
    
    // Get template for pre-expiry
    const template = await getOne(
      'SELECT * FROM whatsapp_templates WHERE template_type = ? AND status = ?',
      ['pre_expiry', 'active']
    );

    if (!template) {
      console.log('⚠️ Pre-expiry template not found');
      return { sent: 0, failed: 0 };
    }

    // Get subscriptions expiring in X days that haven't received pre-expiry alert
    const subscriptions = await getAll(`
      SELECT s.*, c.name as client_name, c.whatsapp_number, h.url as host_url, h.name as host_name
      FROM subscriptions s
      JOIN clients c ON s.client_id = c.id
      LEFT JOIN host_urls h ON s.host_url_id = h.id
      WHERE s.status = 'active' 
        AND s.pre_expiry_sent = FALSE
        AND DATEDIFF(s.end_date, CURDATE()) = ?
    `, [alertDays]);

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      try {
        const variables = {
          CLIENT_NAME: sub.client_name,
          USERNAME: sub.username,
          END_DATE: format(new Date(sub.end_date), 'dd/MM/yyyy'),
          DAYS_LEFT: alertDays.toString()
        };

        const message = replaceTemplateVariables(template.message_content, variables);
        const result = await sendWhatsAppMessage(sub.whatsapp_number, message);

        // Log the alert
        await execute(
          `INSERT INTO whatsapp_alerts 
           (client_id, subscription_id, whatsapp_number, message_type, message_content, status, api_response, sent_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            sub.client_id,
            sub.id,
            sub.whatsapp_number,
            'pre_expiry',
            message,
            result.success ? 'sent' : 'failed',
            JSON.stringify(result)
          ]
        );

        // Mark as sent
        if (result.success) {
          await execute(
            'UPDATE subscriptions SET pre_expiry_sent = TRUE WHERE id = ?',
            [sub.id]
          );
          sent++;
          console.log(`✅ Pre-expiry alert sent to ${sub.client_name}`);
        } else {
          failed++;
          console.log(`❌ Failed to send pre-expiry alert to ${sub.client_name}`);
        }
      } catch (error) {
        console.error(`Error sending alert to ${sub.client_name}:`, error.message);
        failed++;
      }
    }

    return { sent, failed, total: subscriptions.length };
  } catch (error) {
    console.error('Error checking pre-expiry alerts:', error);
    throw error;
  }
}

/**
 * Check for subscriptions expiring today and send expiry day alerts
 */
async function checkExpiryDayAlerts() {
  try {
    // Get template for expiry day
    const template = await getOne(
      'SELECT * FROM whatsapp_templates WHERE template_type = ? AND status = ?',
      ['expiry_day', 'active']
    );

    if (!template) {
      console.log('⚠️ Expiry day template not found');
      return { sent: 0, failed: 0 };
    }

    // Get subscriptions expiring today that haven't received expiry day alert
    const subscriptions = await getAll(`
      SELECT s.*, c.name as client_name, c.whatsapp_number, h.url as host_url, h.name as host_name
      FROM subscriptions s
      JOIN clients c ON s.client_id = c.id
      LEFT JOIN host_urls h ON s.host_url_id = h.id
      WHERE s.status = 'active' 
        AND s.expiry_day_sent = FALSE
        AND DATE(s.end_date) = CURDATE()
    `);

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      try {
        const variables = {
          CLIENT_NAME: sub.client_name,
          USERNAME: sub.username,
          END_DATE: format(new Date(sub.end_date), 'dd/MM/yyyy')
        };

        const message = replaceTemplateVariables(template.message_content, variables);
        const result = await sendWhatsAppMessage(sub.whatsapp_number, message);

        // Log the alert
        await execute(
          `INSERT INTO whatsapp_alerts 
           (client_id, subscription_id, whatsapp_number, message_type, message_content, status, api_response, sent_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            sub.client_id,
            sub.id,
            sub.whatsapp_number,
            'expiry_day',
            message,
            result.success ? 'sent' : 'failed',
            JSON.stringify(result)
          ]
        );

        // Mark as sent and update status to expired
        if (result.success) {
          await execute(
            'UPDATE subscriptions SET expiry_day_sent = TRUE, status = ? WHERE id = ?',
            ['expired', sub.id]
          );
          sent++;
          console.log(`✅ Expiry day alert sent to ${sub.client_name}`);
        } else {
          failed++;
          console.log(`❌ Failed to send expiry day alert to ${sub.client_name}`);
        }
      } catch (error) {
        console.error(`Error sending alert to ${sub.client_name}:`, error.message);
        failed++;
      }
    }

    return { sent, failed, total: subscriptions.length };
  } catch (error) {
    console.error('Error checking expiry day alerts:', error);
    throw error;
  }
}

/**
 * Update expired subscriptions (past end date)
 */
async function updateExpiredSubscriptions() {
  try {
    const result = await execute(`
      UPDATE subscriptions 
      SET status = 'expired' 
      WHERE status = 'active' 
        AND end_date < CURDATE()
    `);

    console.log(`Updated ${result.affectedRows} expired subscriptions`);
    return result.affectedRows;
  } catch (error) {
    console.error('Error updating expired subscriptions:', error);
    throw error;
  }
}

/**
 * Send welcome message when new subscription is created
 */
async function sendWelcomeMessage(client, subscription, plainPassword) {
  try {
    const template = await getOne(
      'SELECT * FROM whatsapp_templates WHERE template_type = ? AND status = ?',
      ['welcome', 'active']
    );

    if (!template) {
      console.log('⚠️ Welcome template not found');
      return { success: false, message: 'Template not found' };
    }

    const hostUrl = subscription.host_url || 'Check with admin';
    const variables = {
      CLIENT_NAME: client.name,
      USERNAME: subscription.username,
      PASSWORD: plainPassword,
      HOST_URL: hostUrl,
      START_DATE: format(new Date(subscription.start_date), 'dd/MM/yyyy'),
      END_DATE: format(new Date(subscription.end_date), 'dd/MM/yyyy'),
      PACKAGE_DURATION: subscription.package_duration.toString()
    };

    const message = replaceTemplateVariables(template.message_content, variables);
    const result = await sendWhatsAppMessage(client.whatsapp_number, message);

    // Log the alert
    await execute(
      `INSERT INTO whatsapp_alerts 
       (client_id, subscription_id, whatsapp_number, message_type, message_content, status, api_response, sent_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        client.id,
        subscription.id,
        client.whatsapp_number,
        'welcome',
        message,
        result.success ? 'sent' : 'failed',
        JSON.stringify(result)
      ]
    );

    // Mark welcome as sent
    if (result.success) {
      await execute(
        'UPDATE subscriptions SET welcome_sent = TRUE WHERE id = ?',
        [subscription.id]
      );
    }

    return result;
  } catch (error) {
    console.error('Error sending welcome message:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Send renewal confirmation message
 */
async function sendRenewalMessage(client, subscription, plainPassword) {
  try {
    const template = await getOne(
      'SELECT * FROM whatsapp_templates WHERE template_type = ? AND status = ?',
      ['renewal', 'active']
    );

    if (!template) {
      console.log('⚠️ Renewal template not found');
      return { success: false, message: 'Template not found' };
    }

    const hostUrl = subscription.host_url || 'Check with admin';
    const variables = {
      CLIENT_NAME: client.name,
      USERNAME: subscription.username,
      PASSWORD: plainPassword,
      HOST_URL: hostUrl,
      START_DATE: format(new Date(subscription.start_date), 'dd/MM/yyyy'),
      END_DATE: format(new Date(subscription.end_date), 'dd/MM/yyyy'),
      PACKAGE_DURATION: subscription.package_duration.toString()
    };

    const message = replaceTemplateVariables(template.message_content, variables);
    const result = await sendWhatsAppMessage(client.whatsapp_number, message);

    // Log the alert
    await execute(
      `INSERT INTO whatsapp_alerts 
       (client_id, subscription_id, whatsapp_number, message_type, message_content, status, api_response, sent_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        client.id,
        subscription.id,
        client.whatsapp_number,
        'renewal',
        message,
        result.success ? 'sent' : 'failed',
        JSON.stringify(result)
      ]
    );

    return result;
  } catch (error) {
    console.error('Error sending renewal message:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Main function to check all alerts
 */
async function checkAllAlerts() {
  try {
    console.log('🔍 Checking for alerts...');
    
    const preExpiryResults = await checkPreExpiryAlerts();
    const expiryDayResults = await checkExpiryDayAlerts();
    const updatedExpired = await updateExpiredSubscriptions();

    const results = {
      preExpiry: preExpiryResults,
      expiryDay: expiryDayResults,
      updatedExpired: updatedExpired,
      timestamp: new Date().toISOString()
    };

    console.log('✅ Alert check completed:', results);
    return results;
  } catch (error) {
    console.error('❌ Error in alert check:', error);
    throw error;
  }
}

/**
 * Schedule automated alert checking
 * Runs every hour by default
 */
function scheduleAlertChecks() {
  // Run immediately on startup
  checkAllAlerts()
    .then(result => {
      console.log('✅ Initial alert check completed');
    })
    .catch(err => {
      console.error('❌ Error in initial alert check:', err);
    });

  // Schedule to run every hour (0 * * * *)
  // This is a backup in case cPanel cron is not set up
  cron.schedule('0 * * * *', () => {
    console.log('⏰ Running scheduled alert check...');
    checkAllAlerts()
      .then(result => {
        console.log('✅ Scheduled alert check completed');
      })
      .catch(err => {
        console.error('❌ Error in scheduled alert check:', err);
      });
  });

  console.log('📅 Alert scheduler initialized (runs every hour as backup)');
  console.log('💡 For production, use cPanel cron job every 10 minutes');
}

module.exports = {
  checkAllAlerts,
  checkPreExpiryAlerts,
  checkExpiryDayAlerts,
  updateExpiredSubscriptions,
  sendWelcomeMessage,
  sendRenewalMessage,
  scheduleAlertChecks
};
