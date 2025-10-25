const jwt = require('jsonwebtoken');

/**
 * Middleware to authenticate JWT token
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Middleware to verify cron job secret
 */
function verifyCronSecret(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return res.status(500).json({ error: 'Cron secret not configured' });
  }

  if (token !== cronSecret) {
    return res.status(403).json({ error: 'Invalid cron secret' });
  }

  next();
}

module.exports = {
  authenticateToken,
  verifyCronSecret
};
