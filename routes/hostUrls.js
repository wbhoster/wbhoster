const express = require('express');
const { execute, getOne, getAll } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * Get all host URLs
 */
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    
    let sql = 'SELECT * FROM host_urls';
    const params = [];
    
    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }
    
    sql += ' ORDER BY name ASC';
    
    const hostUrls = await getAll(sql, params);
    res.json({ success: true, hostUrls });
  } catch (error) {
    console.error('Error fetching host URLs:', error);
    res.status(500).json({ error: 'Failed to fetch host URLs' });
  }
});

/**
 * Get single host URL
 */
router.get('/:id', async (req, res) => {
  try {
    const hostUrl = await getOne('SELECT * FROM host_urls WHERE id = ?', [req.params.id]);
    
    if (!hostUrl) {
      return res.status(404).json({ error: 'Host URL not found' });
    }

    res.json({ success: true, hostUrl });
  } catch (error) {
    console.error('Error fetching host URL:', error);
    res.status(500).json({ error: 'Failed to fetch host URL' });
  }
});

/**
 * Create new host URL
 */
router.post('/', async (req, res) => {
  try {
    const { name, url, description, status = 'active' } = req.body;

    if (!name || !url) {
      return res.status(400).json({ error: 'Name and URL are required' });
    }

    const result = await execute(
      'INSERT INTO host_urls (name, url, description, status) VALUES (?, ?, ?, ?)',
      [name, url, description, status]
    );

    const newHostUrl = await getOne('SELECT * FROM host_urls WHERE id = ?', [result.insertId]);
    
    res.status(201).json({
      success: true,
      message: 'Host URL created successfully',
      hostUrl: newHostUrl
    });
  } catch (error) {
    console.error('Error creating host URL:', error);
    res.status(500).json({ error: 'Failed to create host URL' });
  }
});

/**
 * Update host URL
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, url, description, status } = req.body;
    
    await execute(
      'UPDATE host_urls SET name = ?, url = ?, description = ?, status = ? WHERE id = ?',
      [name, url, description, status, req.params.id]
    );

    const updatedHostUrl = await getOne('SELECT * FROM host_urls WHERE id = ?', [req.params.id]);
    
    res.json({
      success: true,
      message: 'Host URL updated successfully',
      hostUrl: updatedHostUrl
    });
  } catch (error) {
    console.error('Error updating host URL:', error);
    res.status(500).json({ error: 'Failed to update host URL' });
  }
});

/**
 * Delete host URL
 */
router.delete('/:id', async (req, res) => {
  try {
    // Check if host URL is used by any subscription
    const subscriptions = await getOne(
      'SELECT COUNT(*) as count FROM subscriptions WHERE host_url_id = ?',
      [req.params.id]
    );

    if (subscriptions.count > 0) {
      return res.status(400).json({
        error: `Cannot delete host URL. It is used by ${subscriptions.count} subscription(s)`,
        subscriptionCount: subscriptions.count
      });
    }

    await execute('DELETE FROM host_urls WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Host URL deleted successfully' });
  } catch (error) {
    console.error('Error deleting host URL:', error);
    res.status(500).json({ error: 'Failed to delete host URL' });
  }
});

/**
 * Get host URL usage statistics
 */
router.get('/:id/stats', async (req, res) => {
  try {
    const stats = await getOne(`
      SELECT 
        COUNT(s.id) as total_subscriptions,
        SUM(CASE WHEN s.status = 'active' THEN 1 ELSE 0 END) as active_subscriptions
      FROM subscriptions s
      WHERE s.host_url_id = ?
    `, [req.params.id]);
    
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching host URL stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
