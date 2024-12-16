// main.cjs

const dotenv = require('dotenv');
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fetch = require('node-fetch');
const { fileURLToPath } = require('url');
const { findOrCreateUser, getCurrentUser, getCurrentUserWithPreferences, refreshAccessToken, getUserPreferences, updateUserPreferences } = require('../services/usersService.js');
const db = require('../database/database');
const { postToLinkedIn } = require('../automation/linkedin');
const { getPostsByLinkedInId, savePost, deletePost, searchPosts, getPostById } = require('../services/postsService.js');
const schedule = require('node-schedule');
const { getAISuggestions } = require('../ai/ai');
const crypto = require('crypto');
const jwtDecode = require('jwt-decode');


// Load environment variables
dotenv.config();

console.log('Index HTML Path:', path.join(__dirname, 'views', 'index.html'));
console.log('Database Path:', path.resolve(__dirname, 'database', 'app.db'));

console.log('Client ID:', process.env.LINKEDIN_CLIENT_ID);
console.log('Redirect URI:', process.env.LINKEDIN_REDIRECT_URI);
console.log('Client Secret:', process.env.LINKEDIN_CLIENT_SECRET);

console.log('jwtDecode:', jwtDecode);
console.log('Type of jwtDecode:', typeof jwtDecode);

// Import the server's start function
const { startServer } = require('../backend/server.js'); // Adjust the path as needed

// Create the main application window
function createWindow() {
  console.log("Creating BrowserWindow...");
  const mainWindow = new BrowserWindow({
    width: parseInt(process.env.WINDOW_WIDTH) || 1200,
    height: parseInt(process.env.WINDOW_HEIGHT) || 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      spellcheck: true,
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
  });

  mainWindow.loadFile(path.join(__dirname, 'views', 'index.html')).catch((err) => {
    console.error('Error loading index.html:', err);
  });

  // Open DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // ======= Implement Custom Context Menu for Spell Check =======
  mainWindow.webContents.on('context-menu', (event, params) => {
    const { selectionText, misspelledWord, dictionarySuggestions } = params;

    if (misspelledWord) {
      const menu = Menu.buildFromTemplate([
        ...dictionarySuggestions.map((suggestion) => ({
          label: suggestion,
          click: () => mainWindow.webContents.replaceMisspelling(suggestion),
        })),
        { type: 'separator' },
        {
          label: 'Add to Dictionary',
          click: () => mainWindow.webContents.session.addWordToSpellCheckerDictionary(misspelledWord),
        },
      ]);
      menu.popup();
    } else {
      const menu = Menu.buildFromTemplate([
        { role: 'undo', enabled: params.editFlags.canUndo },
        { role: 'redo', enabled: params.editFlags.canRedo },
        { type: 'separator' },
        { role: 'cut', enabled: params.editFlags.canCut },
        { role: 'copy', enabled: params.editFlags.canCopy },
        { role: 'paste', enabled: params.editFlags.canPaste },
        { role: 'delete', enabled: params.editFlags.canDelete },
        { type: 'separator' },
        { role: 'selectAll', enabled: params.editFlags.canSelectAll },
      ]);
      menu.popup();
    }
  });
  // ======= End of Custom Context Menu Implementation =======
}

app.whenReady().then(() => {
  console.log("App is ready, creating window...");
  createWindow();

  // Start the Express server
  startServer();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      console.log("No windows open, creating a new one...");
      createWindow();
      scheduleExistingPosts(mainWindow);
    }
  });
});

app.on('window-all-closed', () => {
  console.log("All windows closed.");
  if (process.platform !== 'darwin') {
    console.log("Quitting the application.");
    app.quit();
  }
});

// Handle unexpected errors
process.on('uncaughtException', (error) => {
  console.error("Uncaught Exception:", error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Gracefully handle app shutdown
app.on('before-quit', () => {
  console.log("Application is shutting down gracefully...");
});

// ======= IPC Handlers =======

// Handle AI Suggestion requests from renderer process
ipcMain.handle('get-ai-suggestions', async (event, { prompt, userId }) => {
  try {
    console.log(`Processing AI suggestion for userId: ${userId}, prompt: ${prompt}`);
    const suggestion = await getAISuggestions(prompt, userId);
    return suggestion;
  } catch (error) {
    console.error('Error fetching AI suggestions:', error);
    throw error;
  }
});

// Handle Save Settings on Settings Page
ipcMain.handle('saveSettings', async (event, settingsData) => {
  try {
    await Database.saveSettings(settingsData); // Save to your database
    return { success: true };
  } catch (error) {
    console.error('Failed to save settings:', error);
    return { success: false, message: error.message };
  }
});

// Handle fetching the current settings
ipcMain.handle('fetchSettings', async () => {
  try {
    const settings = await Database.getSettings(); // Retrieve from your database
    return { success: true, data: settings };
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    return { success: false, message: error.message };
  }
});

// Handle LinkedIn post requests
ipcMain.on('post-to-linkedin', async (event, content) => {
  console.log('Received LinkedIn post request with content:', content);

  try {
    // Fetch user credentials from the database
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.access_token || !currentUser.linkedin_id) {
      throw new Error('LinkedIn user is not authenticated.');
    }

    // Pass content, access token, and LinkedIn ID
    const result = await postToLinkedIn(
      { title: content.title, body: content.body },
      currentUser.access_token,
      currentUser.linkedin_id
    );

    if (result.success) {
      event.sender.send('post-success', 'Post was successful!');
    } else {
      event.sender.send('post-error', `Failed to post: ${result.message}`);
    }
  } catch (error) {
    console.error('Error in post-to-linkedin handler:', error.message);
    event.sender.send('post-error', `An error occurred: ${error.message}`);
  }
});

// Handle status update requests
ipcMain.on('post-status-update', (event, status) => {
  console.log("Received status update with status:", status);
  // Implement status update logic here
  // After successful update:
  // event.sender.send('status-success', 'Status updated successfully!');
  // On error:
  // event.sender.send('status-error', 'Failed to update status.');
});

// Fetch user data
ipcMain.handle('fetch-user-data', async () => {
  try {
    const userData = await getCurrentUser(); // Call getCurrentUser directly
    global.currentUser = userData; // Keep the global user updated
    return userData || { username: 'Guest', profilePicture: '../../assets/default-profile.png' };
  } catch (error) {
    console.error('Error fetching user data:', error.message);
    throw error;
  }
});

// Fetch the current user
ipcMain.handle('fetch-current-user', async () => {
  try {
    const userData = await getCurrentUser();
    if (userData) {
      global.currentUser = userData; // Update the global user state
      console.log('Current user fetched and set globally:', global.currentUser);
    }
    return userData || { username: 'Guest', profilePicture: '../../assets/default-profile.png' };
  } catch (error) {
    console.error('Error fetching current user:', error.message);
    throw error;
  }
});

// Get the current user and their preferences
ipcMain.handle('get-current-user-with-preferences', async () => {
  try {
    const user = await getCurrentUserWithPreferences();
    console.log('Fetched user with preferences:', user); // Debug log
    return user;
  } catch (error) {
    console.error('Error fetching user with preferences:', error);
    throw error;
  }
});

// Handler for saving user settings
ipcMain.handle('save-settings', async (event, settingsData) => {
  console.log('Received save-settings IPC with:', settingsData); // Log 6

  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not found.');

    console.log('Saving settings for user:', user); // Log 7

    await updateUserPreferences(user.id, settingsData);

    console.log('Settings saved successfully:', settingsData); // Log 8
    return { success: true };
  } catch (error) {
    console.error('Error saving settings:', error);
    return { success: false, error: error.message };
  }
});

// Fetch notifications
ipcMain.handle('fetch-notifications', async () => {
  console.log('Fetching notifications from database...');
  try {
    const notifications = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM notifications', (err, rows) => {
        if (err) {
          console.error('Error fetching notifications:', err.message);
          return reject(err);
        }
        resolve(rows);
      });
    });

    console.log('Notifications fetched successfully:', notifications);
    return notifications;
  } catch (error) {
    console.error('Error in fetch-notifications handler:', error);
    throw error;
  }
});

// Handle Feedback from Renderer Process
ipcMain.on('send-feedback', (event, type, suggestion) => {
  console.log("Received feedback with type:", type, "for suggestion:", suggestion);
  if (!['accepted', 'rejected'].includes(type)) {
    console.error('Invalid feedback type:', type);
    return;
  }

  const stmt = db.prepare('INSERT INTO ai_suggestions (suggested_text, feedback, accepted) VALUES (?, ?, ?)');
  stmt.run(
    suggestion,
    type,
    type === 'accepted' ? 1 : 0,  // Assuming `accepted` is BOOLEAN (0 or 1)
    (err) => {
      if (err) {
        console.error('Error inserting feedback into database:', err.message);
      } else {
        console.log(`Feedback recorded: ${type}`);
      }
    }
  );
  stmt.finalize();
});

// ======= IPC Handlers for Post Operations =======

// Save a new or updated post
ipcMain.handle('savePost', async (event, post) => {
  console.log('Saving post:', post);
  try {
    const result = await savePost(post);
    return result;
  } catch (error) {
    console.error('Error in savePost IPC handler:', error.message);
    return { success: false, message: error.message };
  }
});

// Retrieve all posts
ipcMain.handle('get-posts', async () => {
  if (!global.currentUser || !global.currentUser.linkedin_id) {
    console.error('No user is logged in. Current user:', global.currentUser);
    throw new Error('No user is logged in.');
  }
  const linkedin_id = global.currentUser.linkedin_id;
  console.log(`Fetching posts for LinkedIn ID: ${linkedin_id}`);
  try {
    return await getPostsByLinkedInId(linkedin_id);
  } catch (error) {
    console.error('Error fetching posts:', error.message);
    throw error;
  }
});

// Retrieve a single post by ID
ipcMain.handle('get-post-by-id', async (event, postId) => {
  console.log(`Fetching post by ID: ${postId}`);
  try {
    const post = await getPostById(postId);
    if (!post) {
      return { success: false, message: 'Post not found.' };
    }
    return post;
  } catch (error) {
    console.error('Error in get-post-by-id IPC handler:', error.message);
    return { success: false, message: error.message };
  }
});


// Delete a post by ID
ipcMain.handle('delete-post', async (event, { postId, userId }) => {
  if (!postId || !userId) {
    console.error('Post ID or User ID is missing:', { postId, userId });
    throw new Error('Invalid post or user identifier.');
  }

  console.log(`Deleting post with ID ${postId} for user ID ${userId}`);

  try {
    const result = await deletePost(postId, userId);
    if (result.changes === 0) {
      console.error(`No post found with ID ${postId} for user ID ${userId}`);
      return { success: false, message: 'No post found or unauthorized.' };
    }
    return { success: true };
  } catch (error) {
    console.error('Error deleting post:', error.message);
    return { success: false, message: error.message };
  }
});

// ======= IPC Handler for Scheduling Posts =======
ipcMain.handle('schedule-post', async (event, updatedPost) => {
  try {
    const { id, title, content, status, scheduled_time } = updatedPost;

    // Validate required fields
    if (!id || !scheduled_time) {
      console.error('Missing required fields for scheduling:', updatedPost);
      return { success: false, message: 'Missing required fields.' };
    }

    // Validate scheduled_time format
    const scheduledDate = new Date(scheduled_time);
    if (isNaN(scheduledDate.getTime())) {
      console.error('Invalid scheduled_time:', scheduled_time);
      return { success: false, message: 'Invalid scheduled time.' };
    }

    // Update the post in the database
    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE posts SET title = ?, content = ?, status = ?, scheduled_time = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [title, content, status, scheduled_time, id],
        function (err) {
          if (err) {
            console.error('Error updating post for scheduling:', err.message);
            return reject({ success: false, message: err.message });
          }
          console.log('Post updated successfully for scheduling:', id);
          resolve();
        }
      );
    });

    // Schedule the post
    schedule.scheduleJob(scheduledDate, async () => {
      console.log(`Executing scheduled post ID ${id} at ${scheduledDate}`);
      try {
        const result = await postToLinkedIn(content);
        if (result.success) {
          // Update post status to 'posted'
          db.run("UPDATE posts SET status = 'posted', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [id], (err) => {
            if (err) {
              console.error('Error updating post status to posted:', err.message);
            } else {
              console.log('Post successfully posted to LinkedIn.', { id });
              // Notify renderer about the post being published
              if (mainWindow && mainWindow.webContents) {
                mainWindow.webContents.send('post-published', id);
              }
            }
          });
        } else {
          console.error('Failed to post to LinkedIn.', { id, error: result.message });
          // Optionally, handle failed scheduling (e.g., retry, notify user)
        }
      } catch (error) {
        console.error('Error posting to LinkedIn during scheduled job:', { error: error.message, id });
      }
    });

    console.log('Scheduled a new post:', { id, scheduled_time });
    return { success: true };
  } catch (error) {
    console.error('Error in schedule-post handler:', error);
    return { success: false, message: error.message };
  }
});

// ======= IPC Handler to Search Posts =======
ipcMain.handle('search-posts', async (event, { query, linkedin_id }) => {
  console.log(`Searching posts for LinkedIn ID: ${linkedin_id} with query: ${query}`);
  try {
    const results = await searchPosts(query, linkedin_id);
    return results;
  } catch (error) {
    console.error('Error in search-posts handler:', error.message);
    throw error;
  }
});

// ======= IPC Handler for LinkedIn Auth Feedback =======

// LinkedIn Authentication and User Login
ipcMain.on('linkedin-auth-success', async (event, { userID, name, email, accessToken, refreshToken, expiresIn }) => {
  console.log('LinkedIn Authentication Successful:', { userID, name, email });

  try {
    const user = await findOrCreateUser(userID, name, email, accessToken, refreshToken, expiresIn);
    global.currentUser = {
      linkedinId: user.linkedin_id,
      name: user.name,
      email: user.email,
      accessToken: user.access_token,
    };
    console.log('User logged in and set globally:', global.currentUser); // Debug log
    event.sender.send('auth-success', { userID, name, email });
  } catch (error) {
    console.error('Error saving user data after LinkedIn auth:', error.message);
    event.sender.send('auth-error', { message: error.message });
  }
});

// Refresh LinkedIn Access Token
ipcMain.handle('refresh-access-token', async (event, linkedin_id) => {
  console.log('Refreshing access token for LinkedIn ID:', linkedin_id);
  try {
    const newAccessToken = await refreshAccessToken(linkedin_id);
    if (global.currentUser && global.currentUser.linkedin_id === linkedin_id) {
      global.currentUser.accessToken = newAccessToken; // Update global user state
    }
    return { success: true, accessToken: newAccessToken };
  } catch (error) {
    console.error('Error refreshing LinkedIn access token:', error.message);
    return { success: false, message: error.message };
  }
});

ipcMain.on('linkedin-auth-failure', (event, errorData) => {
  console.error('LinkedIn Authentication Failed:', errorData);
  // Implement logic to notify the user about the failure
});

ipcMain.on('linkedin-auth-closed', () => {
  console.warn('LinkedIn Authentication Window was closed by the user.');
  // Implement logic to handle window closure without authentication
});

// ======= Handle LinkedIn Auth Window =======
ipcMain.on('open-linkedin-auth-window', () => {
  console.log('Received "open-linkedin-auth-window" IPC message');

  const authWindow = createAuthWindow();

  // Generate a unique state parameter for CSRF protection
  const state = crypto.randomBytes(16).toString('hex');
  global.oauthState = state; // Store globally for later verification

  const authUrl = generateAuthUrl(state);
  authWindow.loadURL(authUrl);
  authWindow.show();
  console.log('Auth window loaded with URL:', authUrl);

  // Handle redirect to the redirect URI
  authWindow.webContents.on('will-redirect', async (event, url) => {
    await handleAuthRedirect(event, url, authWindow);
  });

  // Handle window closed before completing auth
  authWindow.on('closed', () => {
    console.log('Auth window was closed by the user');
    notifyRenderer('linkedin-auth-closed');
  });
});

// Helper: Create LinkedIn Authentication Window
function createAuthWindow() {
  return new BrowserWindow({
    width: 600,
    height: 700,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
}

// Helper: Generate LinkedIn Auth URL
function generateAuthUrl(state) {
  const scope = process.env.LINKEDIN_SCOPES; // 'openid profile email w_member_social'
  const encodedScope = encodeURIComponent(scope); // 'openid%20profile%20email%20w_member_social'

  return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(
    process.env.LINKEDIN_REDIRECT_URI
  )}&scope=${encodedScope}&state=${state}`;
}

// Helper: Handle Redirect and Authentication
async function handleAuthRedirect(event, url, authWindow) {
  console.log('Auth window redirecting to URL:', url);

  if (!url.startsWith(process.env.LINKEDIN_REDIRECT_URI)) return;

  event.preventDefault(); // Prevent the actual navigation

  const urlObj = new URL(url);
  const authorizationCode = urlObj.searchParams.get('code');
  const receivedState = urlObj.searchParams.get('state');

  if (receivedState !== global.oauthState) {
    console.error('State parameter mismatch. Possible CSRF attack.');
    authWindow.close();
    notifyRenderer('linkedin-auth-failure', { message: 'State parameter mismatch' });
    return;
  }

  if (!authorizationCode) {
    console.warn('Authorization code not found in URL.');
    authWindow.close();
    return;
  }

  console.log('Authorization code received:', authorizationCode);
  try {
    const tokenData = await exchangeAuthorizationCodeForTokens(authorizationCode);
    const user = await handleUserAuthentication(tokenData);
    global.currentUser = user;

    console.log('Current user set globally:', global.currentUser);
    notifyRenderer('linkedin-auth-success', user);

    authWindow.close();
  } catch (error) {
    console.error('Error during LinkedIn OAuth flow:', error.message);
    notifyRenderer('linkedin-auth-failure', { message: error.message });
    authWindow.close();
  }
}

// Helper: Exchange Authorization Code for Access and Refresh Tokens
async function exchangeAuthorizationCodeForTokens(authorizationCode) {
  const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: authorizationCode,
      redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
      client_id: process.env.LINKEDIN_CLIENT_ID,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET,
    }),
  });

  const tokenData = await tokenResponse.json();
  console.log('Token data received:', {
    access_token: tokenData.access_token ? '*****' : undefined,
    expires_in: tokenData.expires_in,
    scope: tokenData.scope,
    token_type: tokenData.token_type,
    id_token: tokenData.id_token ? '*****' : undefined,
  });

  if (tokenData.error) throw new Error(tokenData.error_description || 'Failed to obtain access token');

  return tokenData;
}

// Helper: Handle User Authentication and Save to Database
async function handleUserAuthentication(tokenData) {
  const decodedIdToken = jwtDecode(tokenData.id_token);
  const userID = decodedIdToken.sub;
  const name = decodedIdToken.name;
  const email = decodedIdToken.email;

  if (!userID || !name) throw new Error('User information is incomplete.');

  console.log(`User ID: ${userID}, Name: ${name}, Email: ${email}`);

  return await findOrCreateUser(
    userID,
    name,
    email,
    tokenData.access_token,
    tokenData.refresh_token,
    tokenData.expires_in
  );
}

// Helper: Notify Renderer Process
function notifyRenderer(channel, data = {}) {
  const allWindows = BrowserWindow.getAllWindows();
  if (allWindows.length > 0) {
    const mainWindow = allWindows[0];
    mainWindow.webContents.send(channel, data);
    console.log(`Sent "${channel}" IPC message to renderer`, data);
  }
}

