const express = require('express');
const { execute, getOne, getAll } = require('../database');
const { authenticateToken, verifyCronSecret } = require('../middleware/auth');
const { sendWhatsAppMessage, testWhatsAppConnection } = require('../services/whatsappService');
const { checkAllAlerts } = require('../services/alertService');

const router = express.Router();

/**
 * Cron endpoint to check for expiry alerts (protected by secret)
 * This endpoint should be called by cPanel cron job every 10 minutes
 */
router.post('/cron/check-expiry', verifyCronSecret, async (req, res) => {
  try {
    const results = await checkAllAlerts();
    res.json({
      success: true,
      message: 'Alert check completed',
      results
    });
  } catch (error) {
    console.error('Error in cron check:', error);
    res.status(500).json({ error: 'Alert check failed' });
  }
});

// All other routes require authentication
router.use(authenticateToken);

/**
 * Send custom WhatsApp message
 */
router.post('/send-custom', async (req, res) => {
  try {
    const { phoneNumber, message, clientId } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({ error: 'Phone number and message are required' });
    }

    // Send message
    const result = await sendWhatsAppMessage(phoneNumber, message);

    // Log the custom message
    if (clientId) {
      await execute(
        `INSERT INTO whatsapp_alerts 
         (client_id, whatsapp_number, message_type, message_content, status, api_response, sent_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          clientId,
          phoneNumber,
          'custom',
          message,
          result.success ? 'sent' : 'failed',
          JSON.stringify(result)
        ]
      );
    }

    res.json({
      success: result.success,
      message: result.success ? 'Message sent successfully' : 'Failed to send message',
      details: result
    });
  } catch (error) {
    console.error('Error sending custom message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * Send bulk custom messages
 */
router.post('/send-bulk', async (req, res) => {
  try {
    const { recipients } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'Recipients array is required' });
    }

    const results = [];

    for (const recipient of recipients) {
      const { clientId, phoneNumber, message } = recipient;

      if (!phoneNumber || !message) {
        results.push({
          phoneNumber,
          success: false,
          error: 'Missing phone number or message'
        });
        continue;
      }

      const result = await sendWhatsAppMessage(phoneNumber, message);
      
      // Log the message
      if (clientId) {
        await execute(
          `INSERT INTO whatsapp_alerts 
           (client_id, whatsapp_number, message_type, message_content, status, api_response, sent_at)
           VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [
            clientId,
            phoneNumber,
            'custom',
            message,
            result.success ? 'sent' : 'failed',
            JSON.stringify(result)
          ]
        );
      }

      results.push({
        phoneNumber,
        success: result.success,
        details: result
      });

      // Add delay between messages
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.length - successCount;

    res.json({
      success: true,
      message: `Sent ${successCount} message(s), ${failedCount} failed`,
      results,
      summary: {
        total: results.length,
        success: successCount,
        failed: failedCount
      }
    });
  } catch (error) {
    console.error('Error sending bulk messages:', error);
    res.status(500).json({ error: 'Failed to send bulk messages' });
  }
});

/**
 * Get WhatsApp alerts history
 */
router.get('/alerts', async (req, res) => {
  try {
    const { client_id, message_type, status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    let sql = `
      SELECT a.*, c.name as client_name
      FROM whatsapp_alerts a
      LEFT JOIN clients c ON a.client_id = c.id
    `;
    
    const conditions = [];
    const params = [];
    
    if (client_id) {
      conditions.push('a.client_id = ?');
      params.push(client_id);
    }
    
    if (message_type) {
      conditions.push('a.message_type = ?');
      params.push(message_type);
    }
    
    if (status) {
      conditions.push('a.status = ?');
      params.push(status);
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    sql += ' ORDER BY a.created_at DESC';
    
    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM whatsapp_alerts a ${conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''}`;
    const countResult = await getOne(countSql, params);
    const total = countResult.total;
    
    // Add pagination
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    const alerts = await getAll(sql, params);
    
    res.json({
      success: true,
      alerts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

/**
 * Get alert statistics
 */
router.get('/alerts/stats', async (req, res) => {
  try {
    const stats = await getOne(`
      SELECT 
        COUNT(*) as total_alerts,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_count,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
        SUM(CASE WHEN message_type = 'welcome' THEN 1 ELSE 0 END) as welcome_count,
        SUM(CASE WHEN message_type = 'pre_expiry' THEN 1 ELSE 0 END) as pre_expiry_count,
        SUM(CASE WHEN message_type = 'expiry_day' THEN 1 ELSE 0 END) as expiry_day_count,
        SUM(CASE WHEN message_type = 'renewal' THEN 1 ELSE 0 END) as renewal_count,
        SUM(CASE WHEN message_type = 'custom' THEN 1 ELSE 0 END) as custom_count
      FROM whatsapp_alerts
    `);
    
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching alert stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

/**
 * Manually trigger alert check (admin action)
 */
router.post('/check-alerts', async (req, res) => {
  try {
    const results = await checkAllAlerts();
    res.json({
      success: true,
      message: 'Alert check completed successfully',
      results
    });
  } catch (error) {
    console.error('Error checking alerts:', error);
    res.status(500).json({ error: 'Failed to check alerts' });
  }
});

/**
 * Test WhatsApp connection
 */
router.post('/test-connection', async (req, res) => {
  try {
    const { testNumber } = req.body;
    const result = await testWhatsAppConnection(testNumber);
    res.json(result);
  } catch (error) {
    console.error('Error testing connection:', error);
    res.status(500).json({ error: 'Connection test failed' });
  }
});

/**
 * Resend failed alert
 */
router.post('/alerts/:id/resend', async (req, res) => {
  try {
    const alert = await getOne('SELECT * FROM whatsapp_alerts WHERE id = ?', [req.params.id]);
    
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const result = await sendWhatsAppMessage(alert.whatsapp_number, alert.message_content);

    // Update alert status
    await execute(
      `UPDATE whatsapp_alerts 
       SET status = ?, api_response = ?, sent_at = NOW()
       WHERE id = ?`,
      [result.success ? 'sent' : 'failed', JSON.stringify(result), req.params.id]
    );

    res.json({
      success: result.success,
      message: result.success ? 'Alert resent successfully' : 'Failed to resend alert',
      details: result
    });
  } catch (error) {
    console.error('Error resending alert:', error);
    res.status(500).json({ error: 'Failed to resend alert' });
  }
});

module.exports = router;
