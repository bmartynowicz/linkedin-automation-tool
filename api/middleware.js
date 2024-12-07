const { refreshAccessToken } = require('../services/usersService');

async function validateToken(req, res, next) {
    try {
      const linkedinId = req.headers['linkedin-id'];
      if (!linkedinId) {
        return res.status(400).json({ error: 'LinkedIn ID is required in headers.' });
      }
  
      const newAccessToken = await refreshAccessToken(linkedinId);
      req.accessToken = newAccessToken;
      next();
    } catch (err) {
      console.error('Token validation error:', err.message);
      res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
    }
  }
  
  module.exports = {
    validateToken,
  };
