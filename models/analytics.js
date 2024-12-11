const db = require('./database');

module.exports = {
  getAnalyticsByPostId(postId, callback) {
    const query = `SELECT * FROM analytics WHERE post_id = ?`;
    db.get(query, [postId], (err, row) => {
      if (err) {
        console.error('Error fetching analytics:', err.message);
        return callback(err);
      }
      callback(null, row);
    });
  },

  saveAnalytics(analytics, callback) {
    const query = `
      INSERT INTO analytics (post_id, engagement_metrics, follower_growth, reach, impressions)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(post_id)
      DO UPDATE SET
        engagement_metrics = excluded.engagement_metrics,
        follower_growth = excluded.follower_growth,
        reach = excluded.reach,
        impressions = excluded.impressions,
        updated_at = CURRENT_TIMESTAMP
    `;
    db.run(query, [analytics.postId, analytics.metrics, analytics.growth, analytics.reach, analytics.impressions], (err) => {
      if (err) {
        console.error('Error saving analytics:', err.message);
        return callback(err);
      }
      callback(null, { success: true });
    });
  }
};
