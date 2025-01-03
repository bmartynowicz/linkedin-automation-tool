// services/usersService.js
const axios = require('axios');
const db = require('../database/database.js');
const bcrypt = require('bcrypt');

const LINKEDIN_REFRESH_URL = 'https://www.linkedin.com/oauth/v2/accessToken';

/**
 * Registers a new user.
 * @param {string} email - The user's email.
 * @param {string} username - The user's username.
 * @param {string} password - The user's password.
 * @returns {Promise<Object>} - The created user object or an error message.
 */
async function registerUser(email, username, password) {
  try {
    // Check for existing email or username
    const existingUser = await new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM users WHERE email = ? OR name = ?`,
        [email, username],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        }
      );
    });

    if (existingUser) {
      throw new Error('A user with the given email or username already exists.');
    }

    // Hash password and insert new user
    const passwordHash = await hashPassword(password);
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO users (email, name, password_hash, created_at, updated_at) 
         VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [email, username, passwordHash],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });

    // Fetch the newly created user
    const newUser = await new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM users WHERE email = ?`,
        [email],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        }
      );
    });

    // Inject default preferences for the new user
    await injectDefaultPreferences(newUser.id);

    return { success: true, user: newUser };
  } catch (error) {
    console.error('Error registering user:', error.message);
    return { success: false, message: error.message };
  }
}

async function injectDefaultPreferences(userId) {
  const notificationSettings = JSON.stringify(defaultPreferences.notification_settings);

  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO user_preferences (
        user_id, theme, tone, notification_settings, writing_style, 
        engagement_focus, vocabulary_level, content_type, 
        content_perspective, emphasis_tags, language, 
        data_sharing, auto_logout, save_session, font_size, 
        text_to_speech, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        userId,
        defaultPreferences.theme,
        defaultPreferences.tone,
        notificationSettings,
        defaultPreferences.writing_style,
        defaultPreferences.engagement_focus,
        defaultPreferences.vocabulary_level,
        defaultPreferences.content_type,
        defaultPreferences.content_perspective,
        defaultPreferences.emphasis_tags,
        defaultPreferences.language,
        defaultPreferences.data_sharing ? 1 : 0,
        defaultPreferences.auto_logout ? 1 : 0,
        defaultPreferences.save_session ? 1 : 0,
        defaultPreferences.font_size,
        defaultPreferences.text_to_speech ? 1 : 0,
      ],
      (err) => {
        if (err) {
          console.error('Error injecting default preferences:', err.message);
          return reject(err);
        }
        console.log(`Default preferences injected for user ID: ${userId}`);
        resolve();
      }
    );
  });
}

// Centralized function to fetch user from database
async function findUserByLinkedInId(linkedin_id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE linkedin_id = ?', [linkedin_id], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
}

async function updateRememberMePreference(userId, remember) {
  try {
    const query = `UPDATE users SET remembered = ? WHERE id = ?`;
    await db.run(query, [remember ? 1 : 0, userId]);
    return { success: true };
  } catch (error) {
    console.error('Failed to update Remember Me preference:', error.message);
    throw error;
  }
}

async function findRememberedUser() {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM users WHERE remembered = 1 LIMIT 1`, (err, row) => {
      if (err) {
        console.error('Error fetching remembered user:', err.message);
        return reject(err);
      }
      resolve(row || null);
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
async function createUser(userID, name, email, accessToken, refreshToken, expiresIn, password) {
  const passwordHash = await hashPassword(password);
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO users (linkedin_id, name, email, access_token, refresh_token, expires_in, token_creation_time, password_hash) 
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
      [userID, name, email || '', accessToken, refreshToken, expiresIn, passwordHash],
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

async function hashPassword(password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

async function validatePassword(inputPassword, storedHash) {
  return bcrypt.compare(inputPassword, storedHash);
}

async function loginUser(username, password) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE email = ?', [username], async (err, user) => {
      if (err) {
        console.error('Error fetching user during login:', err.message);
        return reject(err);
      }
      if (!user) return resolve({ success: false, message: 'User not found.' });

      const isValid = await validatePassword(password, user.password_hash);
      if (!isValid) return resolve({ success: false, message: 'Invalid password.' });

      resolve({ success: true, user });
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

// Default preferences
const defaultPreferences = {
  theme: 'light',
  tone: 'professional',
  writing_style: 'brief',
  engagement_focus: 'comments',
  vocabulary_level: 'simplified',
  content_type: 'linkedin-post',
  content_perspective: 'first-person',
  emphasis_tags: '',
  language: 'en',
  data_sharing: false,
  auto_logout: false,
  save_session: false,
  font_size: 16,
  text_to_speech: false,
  notification_settings: {
      suggestion_readiness: false,
      engagement_tips: false,
      system_updates: false,
      frequency: 'realtime',
  },
};

/**
 * Fetches user preferences from the database.
 * @param {number} userId - The user's database ID.
 * @returns {Promise<Object>} - The user's preferences.
 */
async function getCurrentUserWithPreferences(userId) {
  try {
    if (!userId) {
      throw new Error('No userId provided.');
    }

    // Fetch the user by ID
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });

    if (!user) {
      console.warn('No user found in the database for the given userId:', userId);
      throw new Error('User not found.');
    }
    console.log('User fetched from database:', user);

    // Fetch preferences for the user
    const preferences = await getUserPreferences(userId);
    console.log('User preferences fetched:', preferences);

    // Combine with defaults
    const combinedPreferences = {
      ...defaultPreferences,
      ...preferences,
      notification_settings: {
        ...defaultPreferences.notification_settings,
        ...preferences.notification_settings,
      },
    };

    console.log('Returning user with preferences:', { ...user, preferences: combinedPreferences });
    return { ...user, preferences: combinedPreferences };
  } catch (error) {
    console.error('Error in getCurrentUserWithPreferences:', error.message);
    throw error;
  }
}

async function loadSettingsForUser(userId) {
  try {
    console.log(`Loading settings for user ID: ${userId}`);
    const userWithPreferences = await getCurrentUserWithPreferences(userId);

    if (!userWithPreferences || !userWithPreferences.preferences) {
      throw new Error('User preferences not found');
    }

    // Merge defaults and preferences
    const mergedPreferences = {
      ...defaultPreferences,
      ...userWithPreferences.preferences,
      notification_settings: {
        ...defaultPreferences.notification_settings,
        ...userWithPreferences.preferences.notification_settings,
      },
    };

    console.log('Merged preferences:', mergedPreferences);
    return mergedPreferences;
  } catch (error) {
    console.error('Error loading settings for user:', error.message);
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
 * Fetches user preferences from the database.
 * @param {number} userId - The user's database ID.
 * @returns {Promise<Object>} - The user's preferences.
 */
async function getUserPreferences(userId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM user_preferences WHERE user_id = ?`,
      [userId],
      (err, row) => {
        if (err) {
          console.error('Error fetching user preferences:', err.message);
          return reject(err);
        }

        try {
          // Parse and sanitize notification_settings
          const parsedSettings = JSON.parse(row.notification_settings || '{}');
          row.notification_settings = {
            suggestion_readiness: !!parsedSettings.suggestion_readiness,
            engagement_tips: !!parsedSettings.engagement_tips,
            system_updates: !!parsedSettings.system_updates,
            frequency: parsedSettings.frequency || 'realtime',
          };
        } catch (error) {
          console.warn('Failed to parse notification_settings JSON:', error.message);
          row.notification_settings = {
            suggestion_readiness: false,
            engagement_tips: false,
            system_updates: false,
            frequency: 'realtime',
          };
        }

        resolve(row);
      }
    );
  });
}

/**
 * Updates user preferences in the database.
 * @param {number} userId - The user's database ID.
 * @param {Object} preferences - The preferences object to update.
 * @returns {Promise<void>}
 */
async function updateUserPreferences(userId, preferences) {
  const { notification_settings, ...restPreferences } = preferences;

  const sanitizedNotificationSettings = {
    suggestion_readiness: !!notification_settings.suggestion_readiness,
    engagement_tips: !!notification_settings.engagement_tips,
    system_updates: !!notification_settings.system_updates,
    frequency: notification_settings.frequency || 'realtime',
  };

  const mergedPreferences = {
    ...defaultPreferences,
    ...restPreferences,
    notification_settings: sanitizedNotificationSettings,
  };

  const notificationSettingsJson = JSON.stringify(mergedPreferences.notification_settings);

  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE user_preferences
       SET theme = ?, tone = ?, notification_settings = ?, writing_style = ?, 
           engagement_focus = ?, vocabulary_level = ?, content_type = ?, 
           content_perspective = ?, emphasis_tags = ?, language = ?, data_sharing = ?, 
           auto_logout = ?, save_session = ?, font_size = ?, text_to_speech = ?, 
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [
        mergedPreferences.theme,
        mergedPreferences.tone,
        notificationSettingsJson,
        mergedPreferences.writing_style,
        mergedPreferences.engagement_focus,
        mergedPreferences.vocabulary_level,
        mergedPreferences.content_type,
        mergedPreferences.content_perspective,
        mergedPreferences.emphasis_tags,
        mergedPreferences.language,
        mergedPreferences.data_sharing,
        mergedPreferences.auto_logout,
        mergedPreferences.save_session,
        mergedPreferences.font_size,
        mergedPreferences.text_to_speech,
        userId,
      ],
      (err) => {
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
  registerUser,
  findUserByLinkedInId,
  findOrCreateUser,
  createUser,
  getCurrentUser,
  updateUser,
  getCurrentUserWithPreferences,
  refreshAccessToken,
  getUserPreferences,
  updateUserPreferences,
  loginUser,
  updateRememberMePreference,
  findRememberedUser,
  loadSettingsForUser,
};
