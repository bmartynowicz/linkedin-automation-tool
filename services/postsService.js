const db = require('../database/database.js');

/**
 * Fetches posts for a specific LinkedIn ID.
 * @param {string} linkedinId - The LinkedIn ID of the user.
 * @returns {Promise<Array>} - The list of posts created by the user.
 */
async function getPostsByLinkedInId(linkedinId) {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM posts WHERE linkedin_id = ?', [linkedinId], (err, rows) => {
      if (err) {
        console.error('Error fetching posts:', err.message);
        return reject(err);
      }
      resolve(rows || []);
    });
  });
}

/**
 * Saves a post to the database.
 * @param {Object} post - The post object.
 * @returns {Promise<Object>} - The result of the save operation.
 */
async function savePost(post) {
    const { id, title, content, status, linkedin_id } = post;
  
    return new Promise((resolve, reject) => {
      // Fetch user_id using linkedin_id
      db.get('SELECT id FROM users WHERE linkedin_id = ?', [linkedin_id], (err, row) => {
        if (err) {
          console.error('Error fetching user_id:', err.message);
          return reject(err);
        }
  
        if (!row) {
          return reject(new Error('User not found for the provided LinkedIn ID.'));
        }
  
        const user_id = row.id;
  
        if (id) {
          // Update existing post
          db.run(
            `UPDATE posts 
             SET title = ?, content = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE id = ? AND user_id = ?`,
            [title, content, status, id, user_id],
            function (err) {
              if (err) {
                console.error('Error updating post:', err.message);
                return reject(err);
              }
              resolve({ success: true, postId: id });
            }
          );
        } else {
          // Insert new post
          db.run(
            `INSERT INTO posts (user_id, linkedin_id, title, content, status, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [user_id, linkedin_id, title, content, status],
            function (err) {
              if (err) {
                console.error('Error saving post:', err.message);
                return reject(err);
              }
              resolve({ success: true, postId: this.lastID });
            }
          );
        }
      });
    });
  }  

module.exports = {
  getPostsByLinkedInId,
  savePost,
};
