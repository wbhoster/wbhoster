const express = require('express');
const { runQuery, getQuery, allQuery } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all subscriptions
router.get('/', async (req, res) => {
  try {
    const subscriptions = await allQuery(`
      SELECT s.*, c.name as client_name, c.phone, c.whatsapp_number
      FROM subscriptions s
      JOIN clients c ON s.client_id = c.id
      ORDER BY s.end_date ASC
    `);
    res.json(subscriptions);
  } catch (err) {
    console.error('Error fetching subscriptions:', err);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

// Get expiring subscriptions
router.get('/expiring', async (req, res) => {
  try {
    const days = req.query.days || 7;
    const subscriptions = await allQuery(`
      SELECT s.*, c.name as client_name, c.phone, c.whatsapp_number
      FROM subscriptions s
      JOIN clients c ON s.client_id = c.id
      WHERE s.status = 'active' 
        AND DATE(s.end_date) <= DATE('now', '+' || ? || ' days')
        AND DATE(s.end_date) >= DATE('now')
      ORDER BY s.end_date ASC
    `, [days]);
    res.json(subscriptions);
  } catch (err) {
    console.error('Error fetching expiring subscriptions:', err);
    res.status(500).json({ error: 'Failed to fetch expiring subscriptions' });
  }
});

// Get expired subscriptions
router.get('/expired', async (req, res) => {
  try {
    const subscriptions = await allQuery(`
      SELECT s.*, c.name as client_name, c.phone, c.whatsapp_number
      FROM subscriptions s
      JOIN clients c ON s.client_id = c.id
      WHERE DATE(s.end_date) < DATE('now')
      ORDER BY s.end_date DESC
    `);
    res.json(subscriptions);
  } catch (err) {
    console.error('Error fetching expired subscriptions:', err);
    res.status(500).json({ error: 'Failed to fetch expired subscriptions' });
  }
});

// Get subscriptions for a specific client
router.get('/client/:clientId', async (req, res) => {
  try {
    const subscriptions = await allQuery(
      'SELECT * FROM subscriptions WHERE client_id = ? ORDER BY created_at DESC',
      [req.params.clientId]
    );
    res.json(subscriptions);
  } catch (err) {
    console.error('Error fetching client subscriptions:', err);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

// Add new subscription
router.post('/', async (req, res) => {
  try {
    const { 
      client_id, plan_name, device_type, username, password,
      start_date, end_date, price, payment_status, notes 
    } = req.body;

    if (!client_id || !plan_name || !start_date || !end_date) {
      return res.status(400).json({ 
        error: 'Client ID, plan name, start date, and end date are required' 
      });
    }

    const result = await runQuery(
      `INSERT INTO subscriptions 
       (client_id, plan_name, device_type, username, password, start_date, end_date, 
        price, payment_status, notes, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [client_id, plan_name, device_type, username, password, start_date, end_date, 
       price, payment_status, notes]
    );

    const newSubscription = await getQuery(
      `SELECT s.*, c.name as client_name, c.whatsapp_number
       FROM subscriptions s
       JOIN clients c ON s.client_id = c.id
       WHERE s.id = ?`,
      [result.id]
    );
    
    res.status(201).json(newSubscription);
  } catch (err) {
    console.error('Error adding subscription:', err);
    res.status(500).json({ error: 'Failed to add subscription' });
  }
});

// Renew subscription
router.post('/:id/renew', async (req, res) => {
  try {
    const { months, price, payment_status } = req.body;
    
    if (!months) {
      return res.status(400).json({ error: 'Number of months is required' });
    }

    const subscription = await getQuery('SELECT * FROM subscriptions WHERE id = ?', [req.params.id]);
    
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // Calculate new end date
    const currentEndDate = new Date(subscription.end_date);
    const now = new Date();
    const startDate = currentEndDate > now ? currentEndDate : now;
    
    startDate.setMonth(startDate.getMonth() + parseInt(months));
    const newEndDate = startDate.toISOString().split('T')[0];

    await runQuery(
      `UPDATE subscriptions 
       SET end_date = ?, status = 'active', price = ?, payment_status = ?, 
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [newEndDate, price || subscription.price, payment_status || 'paid', req.params.id]
    );

    const updatedSubscription = await getQuery(
      `SELECT s.*, c.name as client_name, c.whatsapp_number
       FROM subscriptions s
       JOIN clients c ON s.client_id = c.id
       WHERE s.id = ?`,
      [req.params.id]
    );
    
    res.json(updatedSubscription);
  } catch (err) {
    console.error('Error renewing subscription:', err);
    res.status(500).json({ error: 'Failed to renew subscription' });
  }
});

// Update subscription
router.put('/:id', async (req, res) => {
  try {
    const { 
      plan_name, device_type, username, password,
      start_date, end_date, status, price, payment_status, notes 
    } = req.body;

    await runQuery(
      `UPDATE subscriptions 
       SET plan_name = ?, device_type = ?, username = ?, password = ?,
           start_date = ?, end_date = ?, status = ?, price = ?, 
           payment_status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [plan_name, device_type, username, password, start_date, end_date, 
       status, price, payment_status, notes, req.params.id]
    );

    const updatedSubscription = await getQuery(
      `SELECT s.*, c.name as client_name, c.whatsapp_number
       FROM subscriptions s
       JOIN clients c ON s.client_id = c.id
       WHERE s.id = ?`,
      [req.params.id]
    );
    
    res.json(updatedSubscription);
  } catch (err) {
    console.error('Error updating subscription:', err);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

// Delete subscription
router.delete('/:id', async (req, res) => {
  try {
    await runQuery('DELETE FROM subscriptions WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Subscription deleted successfully' });
  } catch (err) {
    console.error('Error deleting subscription:', err);
    res.status(500).json({ error: 'Failed to delete subscription' });
  }
});

// Get dashboard statistics
router.get('/stats/dashboard', async (req, res) => {
  try {
    const stats = await getQuery(`
      SELECT 
        COUNT(*) as total_subscriptions,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_subscriptions,
        SUM(CASE WHEN DATE(end_date) < DATE('now') THEN 1 ELSE 0 END) as expired_subscriptions,
        SUM(CASE WHEN status = 'active' AND DATE(end_date) <= DATE('now', '+7 days') AND DATE(end_date) >= DATE('now') THEN 1 ELSE 0 END) as expiring_soon,
        SUM(price) as total_revenue
      FROM subscriptions
    `);
    
    const clientStats = await getQuery(`
      SELECT COUNT(*) as total_clients
      FROM clients
      WHERE status = 'active'
    `);

    res.json({ ...stats, ...clientStats });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
