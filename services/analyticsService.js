// services/analyticsService.js

const db = require('../database/database.js');

async function saveAnalytics(post) {
  const { author, reactions, comments, content } = post;

  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO analytics (author, reactions, comments, content, created_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [author, reactions, comments, content],
      function (err) {
        if (err) {
          console.error('Error saving analytics:', err.message);
          return reject(err);
        }
        resolve(this.lastID);
      }
    );
  });
}

module.exports = {
  saveAnalytics,
};
