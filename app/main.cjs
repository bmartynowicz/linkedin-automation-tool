// main.cjs

const dotenv = require('dotenv');
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fetch = require('node-fetch');
const { fileURLToPath } = require('url');
const usersService = require('../services/usersService.js');
const db = require('../database/database');
const { formatLinkedInText } = require('../utils/formatLinkedInText.js');
const linkedin = require('../automation/linkedin');
const postsService = require('../services/postsService.js');
const notificationsService = require('../services/notificationsService.js');
const schedule = require('node-schedule');
const { getAISuggestions } = require('../ai/ai');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwtDecode = require('jwt-decode');
const { chromium } = require('playwright');

let currentBrowser = null;
let currentPage = null;

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

// Handle fetching the current settings
ipcMain.handle('fetchSettings', async () => {
  try {
    const settings = await usersService.loadSettingsForUser(global.currentUser?.id);
    return { success: true, data: settings };
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('format-linkedin-text', async (event, delta) => {
  // Perform the formatting in the main process
  const formattedText = formatLinkedInText(delta);
  return formattedText;
});

// Handle LinkedIn post requests
ipcMain.on('post-to-linkedin', async (event, content) => {
  console.log('Received LinkedIn post request with content:', content);
  // content might be { postId, title, body }
  
  try {
    // 1) Get current user from DB
    const currentUser = await usersService.getCurrentUser();
    if (!currentUser || !currentUser.access_token || !currentUser.linkedin_id) {
      throw new Error('LinkedIn user is not authenticated.');
    }

    // 2) Post to LinkedIn
    const result = await linkedin.postToLinkedIn(
      { title: content.title, body: content.body },
      currentUser.access_token,
      currentUser.linkedin_id
    );

    if (result.success) {
      // 3) We have result.data.id => e.g. "urn:li:share:7278100664688209921"
      const linkedinShareId = result.data.id || null;

      // 4) Update the local DB record with the LinkedIn post ID, status='posted'
      if (content.postId) {
        await postsService.savePost({
          id: content.postId,
          title: content.title,
          content: content.body,
          status: 'posted',
          linkedin_id: currentUser.linkedin_id,
          linkedin_post_id: linkedinShareId
        });
      }

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

// Handle scraping analytics data
ipcMain.handle('scrape-post-analytics', async (event, userId, postId) => {
  try {
    console.log(`Scraping analytics for user ID: ${userId}, post ID: ${postId}`);
    const result = await linkedin.scrapePostAnalytics(userId, postId);
    return result;
  } catch (error) {
    console.error('Error in scrape-post-analytics handler:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-current-browser-page', async () => {
  try {
    const page = await getCurrentBrowserPage();
    return { success: true, message: "Page retrieved successfully." };
  } catch (error) {
    console.error("Error getting browser page:", error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('check-user-credentials', async () => {
  try {
    const rememberedUser = await usersService.findRememberedUser();
    if (rememberedUser) {
      global.currentUser = rememberedUser;
      return { success: true, user: rememberedUser };
    }
    return { success: false, user: null };
  } catch (error) {
    console.error('Error in check-user-credentials:', error.message);
    return { success: false, user: null };
  }
});

ipcMain.handle('register-user', async (event, { email, username, password }) => {
  try {
    const result = await usersService.registerUser(email, username, password);
    return result;
  } catch (error) {
    console.error('Error in register-user handler:', error.message);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('create-account', async (event, { email, username, password }) => {
  try {
    const result = await usersService.registerUser(email, username, password);
    return result;
  } catch (error) {
    console.error('Error in create-account handler:', error.message);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('user-login', async (event, { username, password, rememberMe }) => {
  try {
    const result = await usersService.loginUser(username, password);
    if (result.success) {
      if (rememberMe) {
        await usersService.updateRememberMePreference(result.user.id, true);
      }
      global.currentUser = await usersService.getCurrentUserWithPreferences(result.user.id); // Centralized fetch
      return { success: true, user: global.currentUser };
    }
    return { success: false, message: result.message };
  } catch (error) {
    console.error('Error in user-login handler:', error.message);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('load-settings', async (event, userId) => {
  console.log(`Loading settings for user ID: ${userId}`);
  try {
    // Fetch user settings using the service function
    const preferences = await usersService.loadSettingsForUser(userId);

    if (!preferences) {
      console.warn(`No preferences found for user ID: ${userId}`);
      return { success: false, message: 'No preferences found.' };
    }

    console.log(`Preferences loaded for user ID: ${userId}:`, preferences);
    return { success: true, preferences };
  } catch (error) {
    console.error(`Error loading settings for user ID ${userId}:`, error.message);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('logout', async () => {
  try {
    await db.run('UPDATE users SET remembered = 0'); // Clear all remember me flags
    global.currentUser = null; // Reset global state
    return { success: true };
  } catch (error) {
    console.error('Error during logout:', error.message);
    return { success: false, error: error.message };
  }
});


ipcMain.handle('change-password', async (event, { currentPassword, newPassword }) => {
  try {
    const user = global.currentUser; // Ensure current user is fetched
    if (!user) throw new Error('No user is logged in.');

    // Validate current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isPasswordValid) return { success: false, message: 'Incorrect current password.' };

    // Hash and update the new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, user.id]);

    return { success: true };
  } catch (error) {
    console.error('Error changing password:', error.message);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('update-remember-me-preference', async (event, userId, remember) => {
  try {
    const result = await usersService.updateRememberMePreference(userId, remember);
    return result;
  } catch (error) {
    console.error('Failed to update Remember Me preference:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-default-preferences', async () => {
  try {
    const defaultPreferences = defaultPreferences();
    return defaultPreferences;
  } catch (error) {
    console.error('Error fetching default preferences:', error.message);
    throw error;
  }
});


// Fetch user data
ipcMain.handle('fetch-user-data', async () => {
  try {
    const userId = global.currentUser?.id || null;
    if (!userId) throw new Error('No user logged in.');

    const userData = await usersService.getCurrentUserWithPreferences(userId);
    if (!userData) throw new Error('No user data fetched from the database.');

    global.currentUser = userData; // Update global state
    return userData;
  } catch (error) {
    console.error('Error fetching user data:', error.message);
    return null;
  }
});

// Fetch the current user
ipcMain.handle('fetch-current-user', async () => {
  try {
    const userData = await usersService.getCurrentUser();
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
    const user = await usersService.getCurrentUserWithPreferences();
    console.log('Fetched user with preferences:', user); // Debug log
    return user;
  } catch (error) {
    console.error('Error fetching user with preferences:', error);
    throw error;
  }
});

// Handle Save Settings on Settings Page
ipcMain.handle('save-settings', async (event, userId, settingsData) => {
  try {
    console.log(`Saving settings for user ID: ${userId}`, settingsData);

    // Use the usersService to update user preferences
    await usersService.updateUserPreferences(userId, settingsData);

    return { success: true };
  } catch (error) {
    console.error('Failed to save settings:', error);
    return { success: false, message: error.message };
  }
});

// Fetch notifications for the logged-in user
ipcMain.handle('fetch-notifications', async (event) => {
  console.log('Fetching notifications for the logged-in user...');
  try {
    // Get the current logged-in user
    const user = global.currentUser; // Ensure global.currentUser is updated elsewhere in your code
    if (!user || !user.id) {
      throw new Error('No logged-in user found.');
    }

    // Fetch notifications for the user
    const notifications = await notificationsService.getUserNotifications(user.id);
    console.log('Notifications fetched successfully:', notifications);

    return { success: true, notifications };
  } catch (error) {
    console.error('Error fetching notifications:', error.message);
    return { success: false, message: error.message };
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
    const result = await postsService.savePost(post);
    return result;
  } catch (error) {
    console.error('Error in savePost IPC handler:', error.message);
    return { success: false, message: error.message };
  }
});

// Retrieve all posts
ipcMain.handle('get-posts', async () => {
  try {
    if (!global.currentUser) {
      console.warn('global.currentUser is null. Reloading user data...');
      const rememberedUser = await usersService.findRememberedUser();
      if (!rememberedUser) {
        throw new Error('No remembered user found. Current user data is missing.');
      }
      global.currentUser = rememberedUser;
    }

    const { id: userId, linkedin_id: linkedinId } = global.currentUser;

    if (!userId) {
      throw new Error('User ID is missing.');
    }

    console.log(`Fetching posts for User ID: ${userId}, LinkedIn ID: ${linkedinId}`);

    if (linkedinId) {
      return await postsService.getPostsByLinkedInId(linkedinId);
    } else {
      return await postsService.getPostsByUserId(userId);
    }
  } catch (error) {
    console.error('Error fetching posts:', error.message);
    throw error;
  }
});

// Retrieve a single post by ID
ipcMain.handle('get-post-by-id', async (event, postId) => {
  console.log(`Fetching post by ID: ${postId}`);
  try {
    const post = await postsService.getPostById(postId);
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
    // Use the centralized deletePost function
    const result = await postsService.deletePost(postId, userId);

    if (!result.success) {
      console.error(`Failed to delete post: ${result.message}`);
      throw new Error(result.message || 'Post deletion failed.');
    }

    console.log(`Post with ID ${postId} deleted successfully.`);
    return result;
  } catch (error) {
    console.error('Error in delete-post handler:', error.message);
    throw error;
  }
});


ipcMain.handle('get-scheduled-posts', async (event, linkedin_id) => {
  console.log('IPC Handler: get-scheduled-posts for LinkedIn ID:', linkedin_id);
  const scheduledPosts = await postsService.getScheduledPosts(linkedin_id);
  console.log('Fetched Scheduled Posts:', scheduledPosts);
  return scheduledPosts;
});

// ======= IPC Handler for Scheduling Posts =======
ipcMain.handle('schedule-post', async (event, updatedPost) => {
  try {
    const { postId, scheduledTime, recurrence } = updatedPost;

    // Validate fields
    if (!postId || !scheduledTime) {
      return { success: false, message: 'Missing required fields.' };
    }

    const result = await postsService.schedulePost(postId, scheduledTime, recurrence);
    return result;
  } catch (error) {
    console.error('Error in schedule-post handler:', error.message);
    return { success: false, message: error.message };
  }
});

// ======= IPC Handler to Search Posts =======
ipcMain.handle('search-posts', async (event, { query, linkedin_id }) => {
  console.log(`Searching posts for LinkedIn ID: ${linkedin_id} with query: ${query}`);
  try {
    const results = await postsService.searchPosts(query, linkedin_id);
    return results;
  } catch (error) {
    console.error('Error in search-posts handler:', error.message);
    throw error;
  }
});


// ======= IPC Handler for LinkedIn Browser =======
ipcMain.handle('open-linkedin-browser', async () => {
  try {
    console.log('IPC open-linkedin-browser invoked.');
    const result = await linkedin.openLinkedInBrowser();
    return result;
  } catch (error) {
    console.error('Error in open-linkedin-browser IPC:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-browser-and-save-cookies', async (event, userId) => {
  return await linkedin.openLinkedInBrowserAndSaveCookies(userId);
});

ipcMain.handle('load-browser-with-cookies', async (event, userId) => {
  try {
    const result = await linkedin.loadCookiesAndOpenBrowser(userId);
    return result; // Return a plain object
  } catch (error) {
    console.error('Error in load-browser-with-cookies handler:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-cookies-for-user', async (event, userId) => {
  try {
    console.log(`Fetching cookies for user ID: ${userId}`);
    const cookies = await linkedin.getCookiesFromDatabase(userId); // Ensure this function exists
    return cookies;
  } catch (error) {
    console.error('Error fetching cookies:', error.message);
    throw error;
  }
});

// ======= IPC Handler for LinkedIn Auth Feedback =======

// LinkedIn Authentication and User Login
ipcMain.on('linkedin-auth-success', async (event, { userID, name, email, accessToken, refreshToken, expiresIn }) => {
  console.log('LinkedIn Authentication Successful:', { userID, name, email });

  try {
    const user = await usersService.findOrCreateUser(userID, name, email, accessToken, refreshToken, expiresIn);
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
    const newAccessToken = await usersService.refreshAccessToken(linkedin_id);
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

ipcMain.on('navigate', (event, { targetPageId, allPageIds }) => {
  console.log(`Navigating to page: ${targetPageId}`);
  event.sender.send('navigate-to-page', { targetPageId, allPageIds });
});

// Helper to create or reuse the current browser/page context
async function getCurrentBrowserPage() {
  if (currentPage && !currentPage.isClosed()) {
    console.log("Reusing existing page.");
    return currentPage;
  }

  console.log("Creating new browser and page context...");
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();

  console.log("Fetching cookies from database...");
  const cookies = await linkedin.getCookiesFromDatabase(global.currentUser?.id || 0); // Adjust user ID as necessary
  if (cookies.length > 0) {
    console.log("Setting cookies...");
    await context.addCookies(cookies);
  }

  const page = await context.newPage();
  currentBrowser = browser;
  currentPage = page;

  return page;
}

// Gracefully close the browser on application exit
app.on('before-quit', async () => {
  if (currentBrowser) {
    console.log("Closing browser before quitting...");
    await currentBrowser.close();
  }
});

