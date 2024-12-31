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
 * Handles both LinkedIn-authenticated (linkedin_id) and local (user_id) contexts.
 * @param {Object} post
 * @param {number} [post.id] - The ID for an existing post (if updating).
 * @param {string} [post.title] - Title of the post.
 * @param {string} post.content - Content of the post.
 * @param {string} [post.status] - 'draft', 'scheduled', 'posted', or 'closed'.
 * @param {number} [post.user_id] - Local user ID if not LinkedIn.
 * @param {string} [post.linkedin_id] - LinkedIn user ID if LinkedIn-authenticated.
 * @param {string} [post.linkedin_post_id] - The post ID returned by LinkedIn (urn:li:share:xxx).
 * @returns {Promise<Object>} - { success: boolean, postId: number }
 */
async function savePost(post) {
  const {
    id,
    title,
    content,
    status,
    user_id,
    linkedin_id,
    linkedin_post_id,
  } = post;

  return new Promise((resolve, reject) => {
    // Validate that at least one identifier is present
    const identifier = linkedin_id || user_id;
    const identifierColumn = linkedin_id ? 'linkedin_id' : 'user_id';

    if (!identifier) {
      return reject(new Error('No user identifier provided (linkedin_id or user_id).'));
    }

    if (id) {
      // Update existing post
      const sql = `
        UPDATE posts
        SET title = ?,
            content = ?,
            status = ?,
            linkedin_post_id = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND ${identifierColumn} = ?
      `;

      db.run(
        sql,
        [title, content, status, linkedin_post_id, id, identifier],
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
      const sql = `
        INSERT INTO posts (
          ${identifierColumn}, 
          title, 
          content, 
          status, 
          linkedin_post_id,
          created_at, 
          updated_at
        )
        VALUES (
          ?, ?, ?, ?, ?,
          CURRENT_TIMESTAMP, 
          CURRENT_TIMESTAMP
        )
      `;

      db.run(
        sql,
        [identifier, title, content, status, linkedin_post_id],
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
 * Deletes a post and its associated schedule by ID.
 * Handles both logged-in and non-logged-in users.
 * @param {number} postId - The ID of the post to delete.
 * @param {number|string} identifier - The user_id or linkedin_id to verify ownership.
 * @returns {Promise<Object>} - The result of the delete operation.
 */
async function deletePost(postId, identifier) {
  return new Promise((resolve, reject) => {
      const identifierColumn = typeof identifier === 'string' ? 'linkedin_id' : 'user_id';

      db.serialize(() => {
          // Delete the associated schedule first
          db.run(
              `DELETE FROM schedules WHERE post_id = ?`,
              [postId],
              function (err) {
                  if (err) {
                      console.error('Error deleting schedule:', err.message);
                      return reject(err);
                  }
                  console.log(`Schedules for post ID ${postId} deleted.`);
              }
          );

          // Then delete the post
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
                  console.log(`Post with ID ${postId} deleted.`);
                  resolve({ success: true });
              }
          );
      });
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

/**
 * Fetches scheduled posts and their associated schedule times.
 * @param {string} linkedin_id - The LinkedIn ID of the user.
 * @returns {Promise<Array>} - The list of scheduled posts with their schedule times.
 */
async function getScheduledPosts(linkedin_id) {
  return new Promise((resolve, reject) => {
    const query = `
  SELECT 
    p.id AS post_id,       -- Ensure correct field aliasing
    p.title, 
    p.content,
    s.scheduled_time,
    s.recurrence
  FROM posts p
  JOIN schedules s ON p.id = s.post_id
  WHERE p.linkedin_id = ? 
    AND s.scheduled_time IS NOT NULL
`;

    db.all(query, [linkedin_id], (err, rows) => {
      if (err) {
        console.error('Error fetching scheduled posts:', err.message);
        return reject(err);
      }
      console.log('Scheduled Posts Fetched:', rows); // No more s.status
      resolve(rows);
    });
  });
}

async function schedulePost(postId, scheduledTime, recurrence) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Add or update the schedule in `schedules` table
      db.run(
        `INSERT INTO schedules (post_id, scheduled_time, recurrence)
         VALUES (?, ?, ?)
         ON CONFLICT(post_id) DO UPDATE SET scheduled_time = ?, recurrence = ?`,
        [postId, scheduledTime, recurrence, scheduledTime, recurrence],
        function (err) {
          if (err) {
            console.error('Error updating schedules:', err.message);
            return reject({ success: false, message: 'Failed to schedule post.' });
          }

          // Update the post's status to 'scheduled' in `posts` table
          db.run(
            `UPDATE posts SET status = 'scheduled' WHERE id = ?`,
            [postId],
            function (err) {
              if (err) {
                console.error('Error updating post status:', err.message);
                return reject({ success: false, message: 'Failed to update post status.' });
              }
              resolve({ success: true });
            }
          );
        }
      );
    });
  });
}

module.exports = {
  getPostsByLinkedInId,
  savePost,
  deletePost,
  searchPosts,
  getPostById,
  getPostsByUserId,
  getScheduledPosts,
  schedulePost,
};
