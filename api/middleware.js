const { findOrCreateUser, getCurrentUser, refreshAccessToken } = require('../services/usersService.js');

async function validateToken(req, res, next) {
    try {
        const linkedin_id = req.headers['linkedin-id'];
        if (!linkedin_id) {
            return res.status(400).json({ error: 'LinkedIn ID is required in headers.' });
          }
  
        const newAccessToken = await refreshAccessToken(linkedin_id);
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
