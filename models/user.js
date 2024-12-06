// models/user.js

const db = require('../database/database.js');

/**
 * Finds a user by LinkedIn ID.
 * @param {string} linkedinId - The LinkedIn user ID.
 * @returns {Promise<Object>} - The user object if found, else null.
 */
function findUserByLinkedInId(linkedinId) {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM users WHERE linkedin_id = ?`;
    db.get(query, [linkedinId], (err, row) => {
      if (err) {
        console.error('Error finding user by LinkedIn ID:', err.message);
        return reject(err);
      }
      resolve(row);
    });
  });
}

/**
 * Creates a new user.
 * @param {string} linkedinId - The LinkedIn user ID.
 * @param {string} name - The user's name.
 * @param {string} accessToken - The LinkedIn access token.
 * @returns {Promise<Object>} - The newly created user object.
 */
function createUser(linkedinId, name, accessToken) {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO users (linkedin_id, name, access_token)
      VALUES (?, ?, ?)
    `;
    db.run(query, [linkedinId, name, accessToken], function(err) {
      if (err) {
        console.error('Error creating new user:', err.message);
        return reject(err);
      }
      // Retrieve the newly created user
      findUserById(this.lastID)
        .then(user => resolve(user))
        .catch(err => reject(err));
    });
  });
}

/**
 * Finds a user by their database ID.
 * @param {number} id - The user's database ID.
 * @returns {Promise<Object>} - The user object if found, else null.
 */
function findUserById(id) {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM users WHERE id = ?`;
    db.get(query, [id], (err, row) => {
      if (err) {
        console.error('Error finding user by ID:', err.message);
        return reject(err);
      }
      resolve(row);
    });
  });
}

/**
 * Updates a user's access token.
 * @param {number} id - The user's database ID.
 * @param {string} accessToken - The new LinkedIn access token.
 * @returns {Promise<void>}
 */
function updateUserAccessToken(id, accessToken) {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE users
      SET access_token = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    db.run(query, [accessToken, id], function(err) {
      if (err) {
        console.error('Error updating user access token:', err.message);
        return reject(err);
      }
      resolve();
    });
  });
}

module.exports = {
  findUserByLinkedInId,
  createUser,
  findUserById,
  updateUserAccessToken,
};
