// main.cjs

const dotenv = require('dotenv');
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fetch = require('node-fetch');
const { fileURLToPath } = require('url');
const usersService = require('../services/usersService.js');
const db = require('../database/database');
const { postToLinkedIn, scheduleExistingPosts ,performNonAPIFunctionality } = require('../automation/linkedin');
const { getPostsByLinkedInId, savePost, deletePost, searchPosts, getPostById } = require('../services/postsService.js');
const schedule = require('node-schedule');
const { getAISuggestions } = require('../ai/ai');
const crypto = require('crypto');
const jwtDecode = require('jwt-decode');


// Load environment variables
dotenv.config();

global.currentUser = null; // Initialize global state for the current user

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
ipcMain.handle('get-ai-suggestions', async (event, prompt) => {
  try {
    console.log('Processing AI suggestion for:', prompt);
    const suggestion = await getAISuggestions(prompt);
    return suggestion;
  } catch (error) {
    console.error('Error fetching AI suggestions:', error);
    throw error;
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
    const userData = await usersService.getCurrentUser(); // Implement this function
    return userData || { username: 'Guest', profilePicture: '../../assets/default-profile.png' };
  } catch (error) {
    console.error('Error fetching user data:', error);
    throw error;
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
  if (!global.currentUser || !global.currentUser.linkedinId) {
    throw new Error('No user is logged in.');
  }
  const linkedinId = global.currentUser.linkedinId;
  console.log(`Fetching posts for LinkedIn ID: ${linkedinId}`);
  return getPostsByLinkedInId(linkedinId);
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
  console.log(`Deleting post with ID ${postId} for user ID ${userId}`);
  try {
    const result = await deletePost(postId, userId);
    if (result.changes === 0) {
      return { success: false, message: 'No post found or you do not have permission to delete this post.' };
    }
    return { success: true };
  } catch (error) {
    console.error('Error in delete-post IPC handler:', error.message);
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
ipcMain.handle('search-posts', async (event, { query, linkedinId }) => {
  console.log(`Searching posts for LinkedIn ID: ${linkedinId} with query: ${query}`);
  try {
    const results = await searchPosts(query, linkedinId);
    return results;
  } catch (error) {
    console.error('Error in search-posts IPC handler:', error.message);
    return { success: false, message: error.message };
  }
});

// ======= IPC Handler for LinkedIn Auth Feedback =======

ipcMain.on('linkedin-auth-success', (event, userData) => {
  console.log('LinkedIn Authentication Successful:', userData);
  // Implement logic to update UI or store user data as needed
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

  const authWindow = new BrowserWindow({
    width: 600,
    height: 700,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Generate a unique state parameter for CSRF protection
  const state = crypto.randomBytes(16).toString('hex');
  global.oauthState = state; // Store globally for later verification

  const scope = process.env.LINKEDIN_SCOPES; // 'openid profile email w_member_social'
  const encodedScope = encodeURIComponent(scope); // 'openid%20profile%20email%20w_member_social'
  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.LINKEDIN_REDIRECT_URI)}&scope=${encodedScope}&state=${state}`;
  
  authWindow.loadURL(authUrl);
  authWindow.show();
  console.log('Auth window loaded with URL:', authUrl);

  // Handle redirect to the redirect URI
  authWindow.webContents.on('will-redirect', async (event, url) => {
    console.log('Auth window redirecting to URL:', url);
    if (url.startsWith(process.env.LINKEDIN_REDIRECT_URI)) {
      event.preventDefault(); // Prevent the actual navigation

      // Parse the authorization code and state from the URL
      const urlObj = new URL(url);
      const authorizationCode = urlObj.searchParams.get('code');
      const receivedState = urlObj.searchParams.get('state');

      if (receivedState !== global.oauthState) {
        console.error('State parameter mismatch. Possible CSRF attack.');
        authWindow.close();
        // Notify renderer process about the failure
        const allWindows = BrowserWindow.getAllWindows();
        if (allWindows.length > 0) {
          const mainWindow = allWindows[0];
          mainWindow.webContents.send('linkedin-auth-failure', { message: 'State parameter mismatch' });
          console.log('Sent "linkedin-auth-failure" IPC message to renderer');
        }
        return;
      }

      if (authorizationCode) {
        console.log('Authorization code received:', authorizationCode);
        try {
          // Exchange authorization code for access token
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

          if (tokenData.error) {
            throw new Error(tokenData.error_description || 'Failed to obtain access token');
          }

          const accessToken = tokenData.access_token;
          const idToken = tokenData.id_token; // Ensure you request the id_token in scopes
          console.log('Access token obtained:', accessToken);

          // Decode id_token to get user information
          const decodedIdToken = jwtDecode(idToken);
          console.log('Decoded ID Token:', { sub: decodedIdToken.sub, name: decodedIdToken.name, email: decodedIdToken.email });

          const userID = decodedIdToken.sub; // Standard OIDC subject identifier
          const name = decodedIdToken.name;
          const email = decodedIdToken.email;
          console.log(`User ID: ${userID}, Name: ${name}, Email: ${email}`);

          // Validate user data before database operations
          if (!userID || !name) {
            throw new Error('User information is incomplete.');
          }

          // Save accessToken and userID to the database
          const user = await usersService.findOrCreateUser(userID, name, email, accessToken);
          global.currentUser = {
            linkedinId: userID,
            name: name,
            email: email,
            accessToken: accessToken,
          };
          console.log('Current user set globally:', global.currentUser);
          console.log('User data saved to database:', user);

          // Notify the renderer process about successful authentication
          const allWindows = BrowserWindow.getAllWindows();
          if (allWindows.length > 0) {
            const mainWindow = allWindows[0];
            mainWindow.webContents.send('linkedin-auth-success', { userID, name, email });
            console.log('Sent "linkedin-auth-success" IPC message to renderer');
          }

          // Close the auth window
          authWindow.close();
          console.log('Auth window closed after successful authentication');
        } catch (error) {
          console.error('Error during LinkedIn OAuth flow:', error.message);
          // Notify the renderer process about the failure
          const allWindows = BrowserWindow.getAllWindows();
          if (allWindows.length > 0) {
            const mainWindow = allWindows[0];
            mainWindow.webContents.send('linkedin-auth-failure', { message: error.message });
            console.log('Sent "linkedin-auth-failure" IPC message to renderer');
          }
          authWindow.close();
          console.log('Auth window closed after authentication failure');
        }
      } else {
        console.warn('Authorization code not found in URL.');
        authWindow.close();
        console.log('Auth window closed due to missing authorization code');
      }

      event.preventDefault();
    }
  });

  // Handle window closed before completing auth
  authWindow.on('closed', () => {
    console.log('Auth window was closed by the user');
    // Notify the renderer process about the closure
    const allWindows = BrowserWindow.getAllWindows();
    if (allWindows.length > 0) {
      const mainWindow = allWindows[0];
      mainWindow.webContents.send('linkedin-auth-closed');
      console.log('Sent "linkedin-auth-closed" IPC message to renderer');
    }
  });
});

ipcMain.on('test-message', () => {
  console.log('Received "test-message" IPC message');
});
