const express = require('express');
const { execute, getOne, getAll } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * Get all clients with subscription counts
 */
router.get('/', async (req, res) => {
  try {
    const { search, status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    let sql = `
      SELECT c.*, 
        COUNT(s.id) as subscription_count,
        SUM(CASE WHEN s.status = 'active' THEN 1 ELSE 0 END) as active_subscriptions,
        MAX(s.end_date) as latest_expiry
      FROM clients c
      LEFT JOIN subscriptions s ON c.id = s.client_id
    `;
    
    const conditions = [];
    const params = [];
    
    if (search) {
      conditions.push('(c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ? OR c.whatsapp_number LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }
    
    if (status) {
      conditions.push('c.status = ?');
      params.push(status);
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    sql += ' GROUP BY c.id ORDER BY c.created_at DESC';
    
    // Get total count
    const countSql = `SELECT COUNT(DISTINCT c.id) as total FROM clients c ${conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''}`;
    const countResult = await getOne(countSql, params);
    const total = countResult.total;
    
    // Add pagination
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    const clients = await getAll(sql, params);
    
    res.json({
      success: true,
      clients,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

/**
 * Get single client with subscriptions
 */
router.get('/:id', async (req, res) => {
  try {
    const client = await getOne('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const subscriptions = await getAll(`
      SELECT s.*, h.name as host_name, h.url as host_url
      FROM subscriptions s
      LEFT JOIN host_urls h ON s.host_url_id = h.id
      WHERE s.client_id = ? 
      ORDER BY s.created_at DESC
    `, [req.params.id]);

    res.json({ success: true, client: { ...client, subscriptions } });
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

/**
 * Create new client
 */
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, whatsapp_number, address, city, country, notes } = req.body;

    if (!name || !phone || !whatsapp_number) {
      return res.status(400).json({ error: 'Name, phone, and WhatsApp number are required' });
    }

    const result = await execute(
      `INSERT INTO clients (name, email, phone, whatsapp_number, address, city, country, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, email, phone, whatsapp_number, address, city, country, notes]
    );

    const newClient = await getOne('SELECT * FROM clients WHERE id = ?', [result.insertId]);
    
    res.status(201).json({
      success: true,
      message: 'Client created successfully',
      client: newClient
    });
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

/**
 * Update client
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, email, phone, whatsapp_number, address, city, country, notes, status } = req.body;
    
    await execute(
      `UPDATE clients 
       SET name = ?, email = ?, phone = ?, whatsapp_number = ?, 
           address = ?, city = ?, country = ?, notes = ?, status = ?
       WHERE id = ?`,
      [name, email, phone, whatsapp_number, address, city, country, notes, status || 'active', req.params.id]
    );

    const updatedClient = await getOne('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    
    res.json({
      success: true,
      message: 'Client updated successfully',
      client: updatedClient
    });
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

/**
 * Delete client
 */
router.delete('/:id', async (req, res) => {
  try {
    await execute('DELETE FROM clients WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

/**
 * Get client statistics
 */
router.get('/:id/stats', async (req, res) => {
  try {
    const stats = await getOne(`
      SELECT 
        COUNT(s.id) as total_subscriptions,
        SUM(CASE WHEN s.status = 'active' THEN 1 ELSE 0 END) as active_subscriptions,
        SUM(CASE WHEN s.status = 'expired' THEN 1 ELSE 0 END) as expired_subscriptions,
        SUM(s.price) as total_revenue
      FROM subscriptions s
      WHERE s.client_id = ?
    `, [req.params.id]);
    
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching client stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
