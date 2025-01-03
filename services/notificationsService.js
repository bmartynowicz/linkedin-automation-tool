// services/notificationsService.js

const db = require('../database/database.js');

async function getUserNotifications(userId) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
        [userId],
        (err, rows) => {
          if (err) {
            console.error('Error fetching notifications:', err.message);
            return reject(err);
          }
          resolve(rows);
        }
      );
    });
  }
  
  module.exports = {
    getUserNotifications,
  };