const db = require('../database/database.js');

/**
 * Fetches posts for a specific LinkedIn ID.
 * @param {string} linkedin_id - The LinkedIn ID of the user.
 * @returns {Promise<Array>} - The list of posts created by the user.
 */
async function getPostsByLinkedInId(linkedin_id) {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM posts WHERE linkedin_id = ?', [linkedin_id], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
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

/**
 * Deletes a post by ID.
 * @param {number} postId - The ID of the post to delete.
 * @param {number} userId - The ID of the user to verify ownership.
 * @returns {Promise<Object>} - The result of the delete operation.
 */
async function deletePost(postId, userId) {
  return new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM posts WHERE id = ? AND user_id = ?`,
      [postId, userId],
      function (err) {
        if (err) {
          console.error('Error deleting post:', err.message);
          return reject(err);
        }
        resolve({ success: true, changes: this.changes });
      }
    );
  });
}

/**
 * Searches for posts matching a query.
 * @param {string} query - The search term.
 * @param {string} linkedin_id - The LinkedIn ID of the user.
 * @returns {Promise<Array>} - The list of matching posts.
 */
async function searchPosts(query, linkedin_id) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM posts WHERE linkedin_id = ? AND (title LIKE ? OR content LIKE ?)`,
        [linkedin_id, `%${query}%`, `%${query}%`],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });
  }

/**
 * Gets a single post by ID.
 * @param {number} postId - The ID of the post to fetch.
 * @returns {Promise<Object>} - The post object.
 */
async function getPostById(postId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM posts WHERE id = ?', [postId], (err, row) => {
      if (err) {
        console.error('Error fetching post by ID:', err.message);
        return reject(err);
      }
      resolve(row);
    });
  });
}

module.exports = {
  getPostsByLinkedInId,
  savePost,
  deletePost,
  searchPosts,
  getPostById,
};
