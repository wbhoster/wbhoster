const express = require('express');
const bcrypt = require('bcryptjs');
const { execute, getOne, getAll, generateUsername, generatePassword } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { sendWelcomeMessage, sendRenewalMessage } = require('../services/alertService');
const { generateInvoice, getInvoiceFile } = require('../services/invoiceService');
const { format, addMonths } = require('date-fns');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * Get all subscriptions with filters
 */
router.get('/', async (req, res) => {
  try {
    const { status, client_id, expiring_days, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    let sql = `
      SELECT s.*, 
        c.name as client_name, 
        c.whatsapp_number,
        h.name as host_name,
        h.url as host_url,
        DATEDIFF(s.end_date, CURDATE()) as days_left
      FROM subscriptions s
      JOIN clients c ON s.client_id = c.id
      LEFT JOIN host_urls h ON s.host_url_id = h.id
    `;
    
    const conditions = [];
    const params = [];
    
    if (status) {
      conditions.push('s.status = ?');
      params.push(status);
    }
    
    if (client_id) {
      conditions.push('s.client_id = ?');
      params.push(client_id);
    }
    
    if (expiring_days) {
      conditions.push('s.status = ? AND DATEDIFF(s.end_date, CURDATE()) <= ? AND DATEDIFF(s.end_date, CURDATE()) >= 0');
      params.push('active', parseInt(expiring_days));
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    sql += ' ORDER BY s.end_date ASC';
    
    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM subscriptions s ${conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''}`;
    const countResult = await getOne(countSql, params);
    const total = countResult.total;
    
    // Add pagination
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    const subscriptions = await getAll(sql, params);
    
    res.json({
      success: true,
      subscriptions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

/**
 * Get dashboard statistics
 */
router.get('/stats/dashboard', async (req, res) => {
  try {
    const stats = await getOne(`
      SELECT 
        COUNT(DISTINCT c.id) as total_clients,
        COUNT(s.id) as total_subscriptions,
        SUM(CASE WHEN s.status = 'active' THEN 1 ELSE 0 END) as active_subscriptions,
        SUM(CASE WHEN s.status = 'expired' THEN 1 ELSE 0 END) as expired_subscriptions,
        SUM(CASE WHEN s.status = 'active' AND DATEDIFF(s.end_date, CURDATE()) <= 7 AND DATEDIFF(s.end_date, CURDATE()) >= 0 THEN 1 ELSE 0 END) as expiring_soon,
        SUM(s.price) as total_revenue
      FROM subscriptions s
      JOIN clients c ON s.client_id = c.id
    `);
    
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

/**
 * Get single subscription
 */
router.get('/:id', async (req, res) => {
  try {
    const subscription = await getOne(`
      SELECT s.*, 
        c.name as client_name,
        c.whatsapp_number,
        h.name as host_name,
        h.url as host_url
      FROM subscriptions s
      JOIN clients c ON s.client_id = c.id
      LEFT JOIN host_urls h ON s.host_url_id = h.id
      WHERE s.id = ?
    `, [req.params.id]);
    
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json({ success: true, subscription });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

/**
 * Create new subscription
 */
router.post('/', async (req, res) => {
  try {
    const {
      client_id,
      host_url_id,
      package_duration, // 1, 3, 6, or 12 months
      price,
      payment_status = 'paid',
      device_type,
      notes,
      auto_generate = true
    } = req.body;

    if (!client_id || !package_duration) {
      return res.status(400).json({ error: 'Client ID and package duration are required' });
    }

    // Validate package duration
    if (![1, 3, 6, 12].includes(parseInt(package_duration))) {
      return res.status(400).json({ error: 'Package duration must be 1, 3, 6, or 12 months' });
    }

    // Get client details
    const client = await getOne('SELECT * FROM clients WHERE id = ?', [client_id]);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Generate credentials
    let username, plainPassword;
    if (auto_generate) {
      username = await generateUsername();
      plainPassword = generatePassword(parseInt(process.env.PASSWORD_LENGTH || 10));
    } else {
      username = req.body.username;
      plainPassword = req.body.password;
      
      if (!username || !plainPassword) {
        return res.status(400).json({ error: 'Username and password required when auto_generate is false' });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Calculate dates
    const startDate = new Date();
    const endDate = addMonths(startDate, parseInt(package_duration));

    // Create subscription
    const result = await execute(
      `INSERT INTO subscriptions 
       (client_id, host_url_id, package_duration, username, password, hashed_password, 
        start_date, end_date, price, payment_status, device_type, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        client_id,
        host_url_id || null,
        package_duration,
        username,
        plainPassword, // Store plain password for display (can be encrypted if needed)
        hashedPassword,
        format(startDate, 'yyyy-MM-dd'),
        format(endDate, 'yyyy-MM-dd'),
        price || 0,
        payment_status,
        device_type,
        notes,
        'active'
      ]
    );

    const subscriptionId = result.insertId;

    // Get full subscription with host details
    const subscription = await getOne(`
      SELECT s.*, h.url as host_url, h.name as host_name
      FROM subscriptions s
      LEFT JOIN host_urls h ON s.host_url_id = h.id
      WHERE s.id = ?
    `, [subscriptionId]);

    // Generate invoice
    const invoiceResult = await generateInvoice(client, subscription, 'new');
    
    // Send welcome WhatsApp message
    await sendWelcomeMessage(client, subscription, plainPassword);

    res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      subscription,
      invoice: invoiceResult
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription', details: error.message });
  }
});

/**
 * Renew subscription
 */
router.post('/:id/renew', async (req, res) => {
  try {
    const { package_duration, price, payment_status = 'paid' } = req.body;

    if (!package_duration || ![1, 3, 6, 12].includes(parseInt(package_duration))) {
      return res.status(400).json({ error: 'Valid package duration (1, 3, 6, or 12) is required' });
    }

    // Get existing subscription
    const oldSub = await getOne('SELECT * FROM subscriptions WHERE id = ?', [req.params.id]);
    if (!oldSub) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // Get client
    const client = await getOne('SELECT * FROM clients WHERE id = ?', [oldSub.client_id]);

    // Calculate new dates (from today or old end date, whichever is later)
    const startDate = new Date() > new Date(oldSub.end_date) ? new Date() : new Date(oldSub.end_date);
    const endDate = addMonths(startDate, parseInt(package_duration));

    // Generate new credentials
    const username = await generateUsername();
    const plainPassword = generatePassword(parseInt(process.env.PASSWORD_LENGTH || 10));
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Update subscription
    await execute(
      `UPDATE subscriptions 
       SET package_duration = ?, username = ?, password = ?, hashed_password = ?,
           start_date = ?, end_date = ?, price = ?, payment_status = ?,
           status = 'active', pre_expiry_sent = FALSE, expiry_day_sent = FALSE,
           welcome_sent = FALSE
       WHERE id = ?`,
      [
        package_duration,
        username,
        plainPassword,
        hashedPassword,
        format(startDate, 'yyyy-MM-dd'),
        format(endDate, 'yyyy-MM-dd'),
        price || oldSub.price,
        payment_status,
        req.params.id
      ]
    );

    // Get updated subscription
    const subscription = await getOne(`
      SELECT s.*, h.url as host_url, h.name as host_name
      FROM subscriptions s
      LEFT JOIN host_urls h ON s.host_url_id = h.id
      WHERE s.id = ?
    `, [req.params.id]);

    // Generate renewal invoice
    const invoiceResult = await generateInvoice(client, subscription, 'renewal');

    // Send renewal WhatsApp message
    await sendRenewalMessage(client, subscription, plainPassword);

    res.json({
      success: true,
      message: 'Subscription renewed successfully',
      subscription,
      invoice: invoiceResult
    });
  } catch (error) {
    console.error('Error renewing subscription:', error);
    res.status(500).json({ error: 'Failed to renew subscription', details: error.message });
  }
});

/**
 * Update subscription
 */
router.put('/:id', async (req, res) => {
  try {
    const { host_url_id, status, price, payment_status, device_type, notes } = req.body;
    
    await execute(
      `UPDATE subscriptions 
       SET host_url_id = ?, status = ?, price = ?, payment_status = ?, device_type = ?, notes = ?
       WHERE id = ?`,
      [host_url_id, status, price, payment_status, device_type, notes, req.params.id]
    );

    const subscription = await getOne('SELECT * FROM subscriptions WHERE id = ?', [req.params.id]);
    
    res.json({
      success: true,
      message: 'Subscription updated successfully',
      subscription
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

/**
 * Delete subscription
 */
router.delete('/:id', async (req, res) => {
  try {
    await execute('DELETE FROM subscriptions WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Subscription deleted successfully' });
  } catch (error) {
    console.error('Error deleting subscription:', error);
    res.status(500).json({ error: 'Failed to delete subscription' });
  }
});

/**
 * Download subscription invoice
 */
router.get('/:id/invoice', async (req, res) => {
  try {
    const invoice = await getOne(
      'SELECT * FROM invoices WHERE subscription_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.params.id]
    );

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const filepath = getInvoiceFile(path.basename(invoice.pdf_path));
    
    if (!filepath) {
      return res.status(404).json({ error: 'Invoice file not found' });
    }

    res.download(filepath, `${invoice.invoice_number}.pdf`);
  } catch (error) {
    console.error('Error downloading invoice:', error);
    res.status(500).json({ error: 'Failed to download invoice' });
  }
});

module.exports = router;
