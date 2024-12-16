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

async function getCurrentUserWithPreferences() {
  try {
    // Fetch the current user
    const user = await getCurrentUser();
    if (!user) throw new Error('No user found.');

    // Fetch user preferences
    const preferences = await getUserPreferences(user.id);

    // Apply fallback defaults for missing preferences
    const defaultPreferences = {
      theme: 'light',
      tone: 'professional',
      writing_style: 'brief',
      engagement_focus: 'comments',
      vocabulary_level: 'simplified',
      content_type: 'linkedin-post',
      content_perspective: 'first-person',
      emphasis_tags: '',
      notification_settings: {
        suggestion_readiness: false,
        engagement_tips: false,
        system_updates: false,
        frequency: 'realtime',
      },
      language: 'en',
      data_sharing: false,
    };

    // Combine preferences with defaults (deep merge for notification_settings)
    const combinedPreferences = {
      ...defaultPreferences,
      ...preferences,
      notification_settings: {
        ...defaultPreferences.notification_settings,
        ...preferences.notification_settings,
      },
      language: preferences.language || defaultPreferences.language,
      data_sharing: preferences.data_sharing !== undefined ? preferences.data_sharing : defaultPreferences.data_sharing,
    };

    return {
      ...user,
      preferences: combinedPreferences,
    };
  } catch (error) {
    console.error('Error in getCurrentUserWithPreferences:', error.message);
    throw error;
  }
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
 * Fetches user preferences for the current user.
 * @param {number} userId - The user's database ID.
 * @returns {Promise<Object>} - The user's preferences.
 */
async function getUserPreferences(userId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT 
        theme, notification_settings, tone, writing_style, engagement_focus, vocabulary_level, 
        content_type, content_perspective, emphasis_tags, language, data_sharing
       FROM user_preferences WHERE user_id = ?`,
      [userId],
      (err, row) => {
        if (err) {
          console.error('Error fetching user preferences:', err.message);
          return reject(err);
        }

        if (!row) {
          console.warn('No preferences found for userId:', userId);
          resolve(null);
        } else {
          // Parse JSON fields for notification_settings
          try {
            row.notification_settings = JSON.parse(row.notification_settings || '{}');
          } catch (error) {
            console.error('Error parsing notification_settings JSON:', error.message);
            row.notification_settings = {};
          }

          // Ensure data_sharing is converted to boolean and defaults to false
          row.data_sharing = !!row.data_sharing;

          resolve(row);
        }
      }
    );
  });
}

/**
 * Updates user preferences for the current user.
 * @param {number} userId - The user's database ID.
 * @param {Object} preferences - The preferences object to update.
 * @returns {Promise<void>}
 */
async function updateUserPreferences(userId, preferences) {
  const defaults = {
    theme: 'light',
    notification_settings: {
      suggestion_readiness: false,
      engagement_tips: false,
      system_updates: false,
      frequency: 'realtime',
    },
    language: 'en',
    data_sharing: false,
    auto_logout: false,
    save_session: false,
    font_size: 16,
    text_to_speech: false,
    tone: 'professional',
    writing_style: 'brief',
    engagement_focus: 'comments',
    vocabulary_level: 'simplified',
    content_type: 'linkedin-post',
    content_perspective: 'first-person',
    emphasis_tags: '',
  };

  // Merge defaults with provided preferences
  const mergedPreferences = { ...defaults, ...preferences };
  const notificationSettings = JSON.stringify(mergedPreferences.notification_settings); // Serialize notifications to JSON

  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE user_preferences
       SET theme = ?, notification_settings = ?, language = ?, data_sharing = ?, auto_logout = ?, save_session = ?, 
           font_size = ?, text_to_speech = ?, tone = ?, writing_style = ?, engagement_focus = ?, vocabulary_level = ?, 
           content_type = ?, content_perspective = ?, emphasis_tags = ?, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [
        mergedPreferences.theme,
        notificationSettings, // Save JSON string
        mergedPreferences.language,
        mergedPreferences.data_sharing,
        mergedPreferences.auto_logout,
        mergedPreferences.save_session,
        mergedPreferences.font_size,
        mergedPreferences.text_to_speech,
        mergedPreferences.tone,
        mergedPreferences.writing_style,
        mergedPreferences.engagement_focus,
        mergedPreferences.vocabulary_level,
        mergedPreferences.content_type,
        mergedPreferences.content_perspective,
        mergedPreferences.emphasis_tags,
        userId,
      ],
      function (err) {
        if (err) {
          console.error('Error updating user preferences:', err.message);
          return reject(err);
        }
        console.log('Preferences updated successfully for user ID:', userId);
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
  getCurrentUserWithPreferences,
  refreshAccessToken,
  getUserPreferences,
  updateUserPreferences,
};
