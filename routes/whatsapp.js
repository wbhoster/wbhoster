const express = require('express');
const { sendWhatsAppMessage } = require('../services/whatsappService');
const { runQuery, allQuery } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Send custom message to client
router.post('/send', async (req, res) => {
  try {
    const { client_id, whatsapp_number, message, subscription_id } = req.body;

    if (!whatsapp_number || !message) {
      return res.status(400).json({ error: 'WhatsApp number and message are required' });
    }

    const result = await sendWhatsAppMessage(whatsapp_number, message);

    // Log the alert
    await runQuery(
      `INSERT INTO whatsapp_alerts (client_id, subscription_id, whatsapp_number, message, status)
       VALUES (?, ?, ?, ?, ?)`,
      [client_id || null, subscription_id || null, whatsapp_number, message, result.success ? 'sent' : 'failed']
    );

    res.json(result);
  } catch (err) {
    console.error('Error sending WhatsApp message:', err);
    res.status(500).json({ error: 'Failed to send message', details: err.message });
  }
});

// Send subscription renewal reminder
router.post('/send-renewal-reminder/:subscriptionId', async (req, res) => {
  try {
    const { db } = require('../database');
    
    db.get(`
      SELECT s.*, c.name as client_name, c.whatsapp_number
      FROM subscriptions s
      JOIN clients c ON s.client_id = c.id
      WHERE s.id = ?
    `, [req.params.subscriptionId], async (err, subscription) => {
      if (err || !subscription) {
        return res.status(404).json({ error: 'Subscription not found' });
      }

      const daysRemaining = Math.ceil((new Date(subscription.end_date) - new Date()) / (1000 * 60 * 60 * 24));
      
      const message = `Hello ${subscription.client_name},\n\n` +
        `Your IPTV subscription "${subscription.plan_name}" will expire in ${daysRemaining} days on ${subscription.end_date}.\n\n` +
        `Please renew your subscription to continue enjoying uninterrupted service.\n\n` +
        `Contact us for renewal.`;

      const result = await sendWhatsAppMessage(subscription.whatsapp_number, message);

      // Log the alert
      await runQuery(
        `INSERT INTO whatsapp_alerts (client_id, subscription_id, whatsapp_number, message, status)
         VALUES (?, ?, ?, ?, ?)`,
        [subscription.client_id, subscription.id, subscription.whatsapp_number, message, result.success ? 'sent' : 'failed']
      );

      res.json(result);
    });
  } catch (err) {
    console.error('Error sending renewal reminder:', err);
    res.status(500).json({ error: 'Failed to send reminder', details: err.message });
  }
});

// Get WhatsApp alert history
router.get('/alerts', async (req, res) => {
  try {
    const alerts = await allQuery(`
      SELECT wa.*, c.name as client_name
      FROM whatsapp_alerts wa
      LEFT JOIN clients c ON wa.client_id = c.id
      ORDER BY wa.sent_at DESC
      LIMIT 100
    `);
    res.json(alerts);
  } catch (err) {
    console.error('Error fetching alerts:', err);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Test WhatsApp connection
router.get('/test', async (req, res) => {
  try {
    const testNumber = req.query.number;
    
    if (!testNumber) {
      return res.status(400).json({ error: 'Phone number required for testing' });
    }

    const testMessage = 'This is a test message from your IPTV Admin Portal. WhatsApp integration is working!';
    const result = await sendWhatsAppMessage(testNumber, testMessage);
    
    res.json(result);
  } catch (err) {
    console.error('Error testing WhatsApp:', err);
    res.status(500).json({ error: 'Failed to test WhatsApp', details: err.message });
  }
});

module.exports = router;
