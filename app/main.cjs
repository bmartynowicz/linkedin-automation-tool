// main.cjs

const dotenv = require('dotenv');
const { app, BrowserWindow, BrowserView, ipcMain } = require('electron');
const path = require('path');
const fetch = require('node-fetch');
const { fileURLToPath } = require('url');
const { findOrCreateUser, getCurrentUser, getCurrentUserWithPreferences, refreshAccessToken, getUserPreferences, updateUserPreferences } = require('../services/usersService.js');
const db = require('../database/database');
const { postToLinkedIn, scheduleExistingPosts, performNonAPIFunctionality } = require('../automation/linkedin');
const { getPostsByLinkedInId, savePost, deletePost, searchPosts, getPostById } = require('../services/postsService.js');
const schedule = require('node-schedule');
const { getAISuggestions } = require('../ai/ai');
const crypto = require('crypto');
const jwtDecode = require('jwt-decode');
const { startServer } = require('../backend/server.js');

// Load environment variables
dotenv.config();

let mainWindow;
let contentView;
let isSidebarCollapsed = false;

console.log('Index HTML Path:', path.join(__dirname, 'views', 'index.html'));
console.log('Database Path:', path.resolve(__dirname, 'database', 'app.db'));
console.log('Client ID:', process.env.LINKEDIN_CLIENT_ID);
console.log('Redirect URI:', process.env.LINKEDIN_REDIRECT_URI);
console.log('jwtDecode:', jwtDecode);
console.log('Type of jwtDecode:', typeof jwtDecode);

function createWindow() {
  console.log("Creating main application window...");
  mainWindow = new BrowserWindow({
    width: parseInt(process.env.WINDOW_WIDTH) || 1200,
    height: parseInt(process.env.WINDOW_HEIGHT) || 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: true,
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
  });

  mainWindow.loadFile(path.join(__dirname, 'views', 'index.html')).catch((err) => {
    console.error('Error loading index.html:', err);
  });

  mainWindow.webContents.openDevTools({ mode: 'detach' });

  // Create the BrowserView for content area
  contentView = new BrowserView({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  // Attach the BrowserView to mainWindow
  mainWindow.setBrowserView(contentView);

  // Attach resize event
  mainWindow.on('resize', updateContentBounds);

  // Initial bounds setup
  updateContentBounds();

  // Example toggle function for sidebar (if needed)
  const toggleSidebar = () => {
    isSidebarCollapsed = !isSidebarCollapsed;
    updateContentBounds();
  };

  // Load a default page (e.g., editor.html) initially
  contentView.webContents.loadFile(path.join(__dirname, 'views', 'editor.html')).catch((err) => {
    console.error('Error loading initial page:', err);
  });
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

// Function to dynamically update bounds
const updateContentBounds = () => {
  const [windowWidth, windowHeight] = mainWindow.getContentSize();
  const sidebarWidth = isSidebarCollapsed ? 60 : 250; // Adjust sidebar width
  const headerHeight = 60; // Fixed header height
  const rightPadding = 10; // Additional padding for the right
  const bottomPadding = 20; // Additional padding for the bottom

  contentView.setBounds({
    x: sidebarWidth, // Adjust for sidebar
    y: headerHeight, // Adjust for header
    width: windowWidth - sidebarWidth - rightPadding, // Subtract sidebar and padding
    height: windowHeight - headerHeight - bottomPadding, // Subtract header and padding
  });
};

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

// IPC handler to load a page into the BrowserView
ipcMain.on('load-page', (event, page) => {
  const pagePath = path.join(__dirname, 'views', page);
  console.log(`Loading page into BrowserView: ${pagePath}`);
  contentView.webContents.loadFile(pagePath).catch((err) => {
    console.error(`Error loading ${page}:`, err);
  });
});

// Listen for sidebar toggle from the renderer process
// Handle sidebar toggle from the renderer process
ipcMain.on('toggle-sidebar', (event, collapsed) => {
  console.log(`Sidebar toggled: ${collapsed ? 'Collapsed' : 'Expanded'}`);
  isSidebarCollapsed = collapsed; // Update sidebar state
  updateContentBounds(); // Recalculate bounds
});

// Get the current user and their preferences
ipcMain.handle('get-current-user-with-preferences', async () => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not found.');
    const userPreferences = await getUserPreferences(user.id);
    if (!userPreferences) throw new Error('User preferences not found.');
    return { user, userPreferences };
  } catch (error) {
    console.error('Error fetching user with preferences:', error);
    throw error;
  }
});

// Handle AI Suggestion requests
ipcMain.handle('get-ai-suggestions', async (event, prompt, options, userId) => {
  try {
    console.log('Processing AI suggestion for:', prompt);
    const suggestion = await getAISuggestions(prompt, options, userId);
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
  console.log("Received LinkedIn post request with content:", content);
  try {
    const result = await postToLinkedIn(content);
    if (result.success) {
      event.sender.send('post-success', 'Post was successful!');
    } else {
      event.sender.send('post-error', `Failed to post: ${result.message}`);
    }
  } catch (error) {
    console.error('Error in post-to-linkedin handler:', error);
    event.sender.send('post-error', 'An unexpected error occurred while posting.');
  }
});

// Handle status update requests (placeholder)
ipcMain.on('post-status-update', (event, status) => {
  console.log("Received status update with status:", status);
  // Implement status update logic if needed
});

// Fetch user data
ipcMain.handle('fetch-user-data', async () => {
  try {
    const userData = await getCurrentUser();
    global.currentUser = userData;
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
      global.currentUser = userData;
      console.log('Current user fetched and set globally:', global.currentUser);
    }
    return userData || { username: 'Guest', profilePicture: '../../assets/default-profile.png' };
  } catch (error) {
    console.error('Error fetching current user:', error.message);
    throw error;
  }
});

// Handler for saving user settings
ipcMain.handle('save-settings', async (event, settingsData) => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not found.');
    await updateUserPreferences(user.id, settingsData);

    console.log('Settings saved:', settingsData);
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
    type === 'accepted' ? 1 : 0,
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

// Scheduling posts
ipcMain.handle('schedule-post', async (event, updatedPost) => {
  try {
    const { id, title, content, status, scheduled_time } = updatedPost;

    if (!id || !scheduled_time) {
      console.error('Missing required fields for scheduling:', updatedPost);
      return { success: false, message: 'Missing required fields.' };
    }

    const scheduledDate = new Date(scheduled_time);
    if (isNaN(scheduledDate.getTime())) {
      console.error('Invalid scheduled_time:', scheduled_time);
      return { success: false, message: 'Invalid scheduled time.' };
    }

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

    schedule.scheduleJob(scheduledDate, async () => {
      console.log(`Executing scheduled post ID ${id} at ${scheduledDate}`);
      try {
        const result = await postToLinkedIn(content);
        if (result.success) {
          db.run("UPDATE posts SET status = 'posted', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [id], (err) => {
            if (err) {
              console.error('Error updating post status to posted:', err.message);
            } else {
              console.log('Post successfully posted to LinkedIn.', { id });
              if (mainWindow && mainWindow.webContents) {
                mainWindow.webContents.send('post-published', id);
              }
            }
          });
        } else {
          console.error('Failed to post to LinkedIn.', { id, error: result.message });
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

// LinkedIn Auth IPC handlers
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
    console.log('User logged in and set globally:', global.currentUser);
    event.sender.send('auth-success', { userID, name, email });
  } catch (error) {
    console.error('Error saving user data after LinkedIn auth:', error.message);
    event.sender.send('auth-error', { message: error.message });
  }
});

ipcMain.handle('refresh-access-token', async (event, linkedin_id) => {
  console.log('Refreshing access token for LinkedIn ID:', linkedin_id);
  try {
    const newAccessToken = await refreshAccessToken(linkedin_id);
    if (global.currentUser && global.currentUser.linkedin_id === linkedin_id) {
      global.currentUser.accessToken = newAccessToken;
    }
    return { success: true, accessToken: newAccessToken };
  } catch (error) {
    console.error('Error refreshing LinkedIn access token:', error.message);
    return { success: false, message: error.message };
  }
});

ipcMain.on('linkedin-auth-failure', (event, errorData) => {
  console.error('LinkedIn Authentication Failed:', errorData);
});

ipcMain.on('linkedin-auth-closed', () => {
  console.warn('LinkedIn Authentication Window was closed by the user.');
});

// Auth window helpers
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

function generateAuthUrl(state) {
  const scope = process.env.LINKEDIN_SCOPES;
  const encodedScope = encodeURIComponent(scope);

  return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(
    process.env.LINKEDIN_REDIRECT_URI
  )}&scope=${encodedScope}&state=${state}`;
}

async function handleAuthRedirect(event, url, authWindow) {
  console.log('Auth window redirecting to URL:', url);

  if (!url.startsWith(process.env.LINKEDIN_REDIRECT_URI)) return;

  event.preventDefault();

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

function notifyRenderer(channel, data = {}) {
  const allWindows = BrowserWindow.getAllWindows();
  if (allWindows.length > 0) {
    const mainWindow = allWindows[0];
    mainWindow.webContents.send(channel, data);
    console.log(`Sent "${channel}" IPC message to renderer`, data);
  }
}
