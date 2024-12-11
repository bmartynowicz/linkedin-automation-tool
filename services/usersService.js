// services/usersService.js
const axios = require('axios');
const userModel = require('../models/user.js');
const db = require('../database/database.js');

const LINKEDIN_REFRESH_URL = 'https://www.linkedin.com/oauth/v2/accessToken';

/**
 * Finds or creates a user based on LinkedIn authentication data.
 * @param {string} userID - The LinkedIn user ID.
 * @param {string} name - The user's name.
 * @param {string} email - The user's email.
 * @param {string} accessToken - The LinkedIn access token.
 * @param {string} refreshToken - The LinkedIn refresh token.
 * @param {number} expiresIn - The token's expiration time in seconds.
 * @returns {Promise<Object>} - The user object.
 */
async function findOrCreateUser(userID, name, email, accessToken, refreshToken, expiresIn) {
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
          // Update existing user with new token data
          db.run(
            `UPDATE users 
             SET name = ?, 
                 email = ?, 
                 access_token = ?, 
                 refresh_token = ?, 
                 expires_in = ?, 
                 token_creation_time = CURRENT_TIMESTAMP, 
                 updated_at = CURRENT_TIMESTAMP 
             WHERE linkedin_id = ?`,
            [name, email || '', accessToken, refreshToken, expiresIn, userID],
            function (err) {
              if (err) {
                console.error('Error updating user:', err.message);
                return reject(err);
              }
              resolve({
                linkedin_id: userID,
                name,
                email,
                access_token: accessToken,
                refresh_token: refreshToken,
                expires_in: expiresIn,
              });
            }
          );
        } else {
          // Insert new user with token data
          db.run(
            `INSERT INTO users 
             (linkedin_id, name, email, access_token, refresh_token, expires_in, token_creation_time) 
             VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [userID, name, email || '', accessToken, refreshToken, expiresIn],
            function (err) {
              if (err) {
                console.error('Error inserting new user:', err.message);
                return reject(err);
              }
              resolve({
                linkedin_id: userID,
                name,
                email,
                access_token: accessToken,
                refresh_token: refreshToken,
                expires_in: expiresIn,
              });
            }
          );
        }
      });
    });
  }

/**
 * Fetches the current user based on the session or single-user setup.
 * @returns {Promise<Object>} - The current user object.
 */
async function getCurrentUser() {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users LIMIT 1', (err, row) => {
        if (err) {
          console.error('Error fetching current user:', err.message);
          return reject(err);
        }
        resolve(row || null);
      });
    });
  }

/**
 * Logic for refreshing tokens. LinkedIn's API provides an endpoint to refresh tokens.
 * Once the logic refreshes the token the new token value and expiry is stored in the database.
 * @returns {Promise<Object>} - Refreshed access token.
 */
async function refreshAccessToken(linkedinId) {
    return new Promise((resolve, reject) => {
      // Fetch user's refresh token and creation time from the database
      db.get(
        'SELECT refresh_token, token_creation_time, expires_in FROM users WHERE linkedin_id = ?',
        [linkedinId],
        async (err, row) => {
          if (err) {
            console.error('Database query error:', err.message);
            return reject(err);
          }
          if (!row) {
            return reject(new Error('User not found'));
          }
  
          const { refresh_token, token_creation_time, expires_in } = row;
          const now = Date.now();
          const expirationTime = new Date(token_creation_time).getTime() + expires_in * 1000;
  
          if (now < expirationTime) {
            console.log('Token is still valid.');
            return resolve(row.access_token);
          }
  
          // Token expired; refresh it
          try {
            const response = await axios.post(LINKEDIN_REFRESH_URL, null, {
              params: {
                grant_type: 'refresh_token',
                refresh_token,
                client_id: process.env.LINKEDIN_CLIENT_ID,
                client_secret: process.env.LINKEDIN_CLIENT_SECRET,
              },
            });
  
            const { access_token, expires_in: newExpiresIn } = response.data;
  
            // Update database with the new token
            db.run(
              'UPDATE users SET access_token = ?, expires_in = ?, token_creation_time = CURRENT_TIMESTAMP WHERE linkedin_id = ?',
              [access_token, newExpiresIn, linkedinId],
              (updateErr) => {
                if (updateErr) {
                  console.error('Error updating access token:', updateErr.message);
                  return reject(updateErr);
                }
                console.log('Access token refreshed successfully.');
                resolve(access_token);
              }
            );
          } catch (apiErr) {
            console.error('Error refreshing access token:', apiErr.message);
            reject(apiErr);
          }
        }
      );
    });
  }

module.exports = {
  findOrCreateUser,
  getCurrentUser,
  refreshAccessToken,
};
