const db = require('../database/database.js');

/**
 * Fetches posts for a specific LinkedIn ID.
 * @param {string} linkedin_id - The LinkedIn ID of the user.
 * @returns {Promise<Array>} - The list of posts created by the user.
 */
async function getPostsByLinkedInId(linkedin_id) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM posts WHERE linkedin_id = ?',
        [linkedin_id],
        (err, rows) => {
          if (err) {
            console.error('Error fetching posts by LinkedIn ID:', err.message);
            return reject(err);
          }
          resolve(rows);
        }
      );
    });
}
  

/**
 * Saves a post to the database (insert or update).
 * Handles both logged-in (LinkedIn-authenticated) and non-logged-in users.
 * @param {Object} post - The post object.
 * @returns {Promise<Object>} - The result of the save operation.
 */
async function savePost(post) {
  const { id, title, content, status, user_id, linkedin_id } = post;

  return new Promise((resolve, reject) => {
    // Determine ownership context
    const identifier = linkedin_id || user_id;
    const identifierColumn = linkedin_id ? 'linkedin_id' : 'user_id';

    if (!identifier) {
      return reject(new Error('No identifier provided for saving the post.'));
    }

    // Transform content to Unicode-compatible format
    const transformedContent = transformToUnicode(content);

    if (id) {
      // Update existing post
      db.run(
        `UPDATE posts 
         SET title = ?, content = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ? AND ${identifierColumn} = ?`,
        [title, transformedContent, status, id, identifier],
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
        `INSERT INTO posts (${identifierColumn}, title, content, status, created_at, updated_at) 
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [identifier, title, transformedContent, status],
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
}

/**
 * Transforms plain content to Unicode-compatible formatted text.
 * @param {string} content - The original content.
 * @returns {string} - Unicode-transformed content.
 */
function transformToUnicode(content) {
  // Replace placeholder logic with desired Unicode transformations
  return content
    .replace(/<strong>(.*?)<\/strong>/g, (match, p1) => textFormat.bold(p1))
    .replace(/<em>(.*?)<\/em>/g, (match, p1) => textFormat.italic(p1))
    .replace(/<u>(.*?)<\/u>/g, (match, p1) => textFormat.underline(p1));
}

/**
 * Deletes a post by ID.
 * Handles both logged-in and non-logged-in users.
 * @param {number} postId - The ID of the post to delete.
 * @param {number|string} identifier - The user_id or linkedin_id to verify ownership.
 * @returns {Promise<Object>} - The result of the delete operation.
 */
async function deletePost(postId, identifier) {
    return new Promise((resolve, reject) => {
      const identifierColumn = typeof identifier === 'string' ? 'linkedin_id' : 'user_id';
  
      db.run(
        `DELETE FROM posts WHERE id = ? AND ${identifierColumn} = ?`,
        [postId, identifier],
        function (err) {
          if (err) {
            console.error('Error deleting post:', err.message);
            return reject(err);
          }
          if (this.changes === 0) {
            console.warn(`No post found with ID ${postId} for identifier ${identifier}`);
            return resolve({ success: false, message: 'No post found or insufficient permissions.' });
          }
          resolve({ success: true });
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

/**
 * Fetches posts for a specific local user ID.
 * @param {number} user_id - The local user ID.
 * @returns {Promise<Array>} - The list of posts created by the user.
 */
async function getPostsByUserId(user_id) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM posts WHERE user_id = ?',
        [user_id],
        (err, rows) => {
          if (err) {
            console.error('Error fetching posts by user ID:', err.message);
            return reject(err);
          }
          resolve(rows);
        }
      );
    });
}

module.exports = {
  getPostsByLinkedInId,
  savePost,
  deletePost,
  searchPosts,
  getPostById,
  getPostsByUserId,
};
