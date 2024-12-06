// services/usersService.js

const userModel = require('../models/user.js');
const db = require('../database/database.js');

/**
 * Finds or creates a user based on LinkedIn authentication data.
 * @param {string} linkedinId - The LinkedIn user ID.
 * @param {string} name - The user's name.
 * @param {string} accessToken - The LinkedIn access token.
 * @returns {Promise<Object>} - The user object.
 */
async function findOrCreateUser(userID, name, email, accessToken) {
    return new Promise((resolve, reject) => {
      if (!userID || !name) {
        return reject(new Error('User ID and Name are required.'));
      }
  
      // Check if the user already exists
      db.get('SELECT * FROM users WHERE linkedin_id = ?', [userID], (err, row) => {
        if (err) {
          console.error('Error querying the database:', err.message);
          return reject(err);
        }
  
        if (row) {
          // Update existing user with new access token and email
          db.run(
            'UPDATE users SET name = ?, email = ?, access_token = ?, updated_at = CURRENT_TIMESTAMP WHERE linkedin_id = ?',
            [name, email || '', accessToken, userID],
            function (err) {
              if (err) {
                console.error('Error updating user:', err.message);
                return reject(err);
              }
              resolve(row);
            }
          );
        } else {
          // Insert new user
          db.run(
            'INSERT INTO users (linkedin_id, name, email, access_token) VALUES (?, ?, ?, ?)',
            [userID, name, email || '', accessToken],
            function (err) {
              if (err) {
                console.error('Error inserting new user:', err.message);
                return reject(err);
              }
              resolve({ linkedin_id: userID, name, email, access_token: accessToken });
            }
          );
        }
      });
    });
  }

/**
 * Retrieves the current user.
 * Assuming a single-user application. Modify as needed for multi-user support.
 * @returns {Promise<Object>} - The current user object.
 */
async function getCurrentUser() {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM users LIMIT 1`;
    userModel.findUserById(1) // Assuming the first user is the current user
      .then(user => {
        resolve(user || null);
      })
      .catch(err => reject(err));
  });
}

module.exports = {
  findOrCreateUser,
  getCurrentUser,
};
