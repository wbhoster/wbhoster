const express = require('express');
const { runQuery, getQuery, allQuery } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all clients
router.get('/', async (req, res) => {
  try {
    const clients = await allQuery(`
      SELECT c.*, 
        COUNT(s.id) as subscription_count,
        SUM(CASE WHEN s.status = 'active' THEN 1 ELSE 0 END) as active_subscriptions
      FROM clients c
      LEFT JOIN subscriptions s ON c.id = s.client_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);
    res.json(clients);
  } catch (err) {
    console.error('Error fetching clients:', err);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// Get single client with subscriptions
router.get('/:id', async (req, res) => {
  try {
    const client = await getQuery('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const subscriptions = await allQuery(
      'SELECT * FROM subscriptions WHERE client_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );

    res.json({ ...client, subscriptions });
  } catch (err) {
    console.error('Error fetching client:', err);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

// Add new client
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, whatsapp_number, address, notes } = req.body;

    if (!name || !phone || !whatsapp_number) {
      return res.status(400).json({ error: 'Name, phone, and WhatsApp number are required' });
    }

    const result = await runQuery(
      `INSERT INTO clients (name, email, phone, whatsapp_number, address, notes) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, email, phone, whatsapp_number, address, notes]
    );

    const newClient = await getQuery('SELECT * FROM clients WHERE id = ?', [result.id]);
    res.status(201).json(newClient);
  } catch (err) {
    console.error('Error adding client:', err);
    res.status(500).json({ error: 'Failed to add client' });
  }
});

// Update client
router.put('/:id', async (req, res) => {
  try {
    const { name, email, phone, whatsapp_number, address, notes, status } = req.body;
    
    await runQuery(
      `UPDATE clients 
       SET name = ?, email = ?, phone = ?, whatsapp_number = ?, 
           address = ?, notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, email, phone, whatsapp_number, address, notes, status, req.params.id]
    );

    const updatedClient = await getQuery('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    res.json(updatedClient);
  } catch (err) {
    console.error('Error updating client:', err);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

// Delete client
router.delete('/:id', async (req, res) => {
  try {
    await runQuery('DELETE FROM clients WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Client deleted successfully' });
  } catch (err) {
    console.error('Error deleting client:', err);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

// Search clients
router.get('/search/:query', async (req, res) => {
  try {
    const query = `%${req.params.query}%`;
    const clients = await allQuery(
      `SELECT * FROM clients 
       WHERE name LIKE ? OR phone LIKE ? OR email LIKE ? OR whatsapp_number LIKE ?
       ORDER BY name`,
      [query, query, query, query]
    );
    res.json(clients);
  } catch (err) {
    console.error('Error searching clients:', err);
    res.status(500).json({ error: 'Failed to search clients' });
  }
});

module.exports = router;
