const db = require('./database');

module.exports = {
  getPostsByUserId(userId, callback) {
    const query = `SELECT * FROM posts WHERE user_id = ?`;
    db.all(query, [userId], (err, rows) => {
      if (err) {
        console.error('Error fetching posts:', err.message);
        return callback(err);
      }
      callback(null, rows);
    });
  },

  savePost(post, callback) {
    const query = `
      INSERT INTO posts (user_id, title, content, status, scheduled_time)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id)
      DO UPDATE SET
        title = excluded.title,
        content = excluded.content,
        status = excluded.status,
        scheduled_time = excluded.scheduled_time,
        updated_at = CURRENT_TIMESTAMP
    `;
    db.run(query, [post.userId, post.title, post.content, post.status, post.scheduledTime], (err) => {
      if (err) {
        console.error('Error saving post:', err.message);
        return callback(err);
      }
      callback(null, { success: true });
    });
  }
};
