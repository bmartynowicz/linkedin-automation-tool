// services/usersService.js
const axios = require('axios');
const db = require('../database/database.js');
const LINKEDIN_REFRESH_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const userModel = require('../models/user.js');

// Centralized function to fetch user from database
async function findUserByLinkedInId(linkedin_id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE linkedin_id = ?', [linkedin_id], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

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
    const user = await findUserByLinkedInId(userID);
    if (user) {
      // Update user data
      await updateUser(userID, name, email, accessToken, refreshToken, expiresIn);
      return { ...user, accessToken, refreshToken, expiresIn };
    } else {
      // Create new user
      return createUser(userID, name, email, accessToken, refreshToken, expiresIn);
    }
  }

// Create a new user
async function createUser(userID, name, email, accessToken, refreshToken, expiresIn) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO users (linkedin_id, name, email, access_token, refresh_token, expires_in, token_creation_time) 
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [userID, name, email || '', accessToken, refreshToken, expiresIn],
        function (err) {
          if (err) return reject(err);
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

// Update user data
async function updateUser(userID, name, email, accessToken, refreshToken, expiresIn) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE users 
         SET name = ?, email = ?, access_token = ?, refresh_token = ?, expires_in = ?, 
             token_creation_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
         WHERE linkedin_id = ?`,
        [name, email || '', accessToken, refreshToken, expiresIn, userID],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }

/**
 * Logic for refreshing tokens. LinkedIn's API provides an endpoint to refresh tokens.
 * Once the logic refreshes the token the new token value and expiry is stored in the database.
 * @returns {Promise<Object>} - Refreshed access token.
 */
// Refresh Access Token
async function refreshAccessToken(linkedin_id) {
    const user = await findUserByLinkedInId(linkedin_id);
    if (!user) throw new Error('User not found.');
  
    const { refresh_token, token_creation_time, expires_in } = user;
    const now = Date.now();
    const expirationTime = new Date(token_creation_time).getTime() + expires_in * 1000;
  
    if (now < expirationTime) {
      return user.access_token; // Return current token if valid
    }
  
    // Refresh expired token
    const response = await axios.post(LINKEDIN_REFRESH_URL, null, {
      params: {
        grant_type: 'refresh_token',
        refresh_token,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
      },
    });
  
    const { access_token, expires_in: newExpiresIn } = response.data;
    await updateUser(linkedin_id, user.name, user.email, access_token, refresh_token, newExpiresIn);
    return access_token;
  }

module.exports = {
  findOrCreateUser,
  getCurrentUser,
  refreshAccessToken,
};
