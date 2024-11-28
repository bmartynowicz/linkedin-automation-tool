// main.cjs

const dotenv = require('dotenv');
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const { fileURLToPath } = require('url');
const db = require('../database/database');
const { postToLinkedIn, scheduleExistingPosts ,performNonAPIFunctionality } = require('../automation/linkedin');
const schedule = require('node-schedule');
const { getAISuggestions } = require('../ai/ai');

// Load environment variables
dotenv.config();

console.log('Index HTML Path:', path.join(__dirname, 'views', 'index.html'));
console.log('Database Path:', path.resolve(__dirname, 'database', 'app.db'));

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
    const userData = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = 1', (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
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
ipcMain.handle('save-post', async (event, post) => {
  const { id, title, content, status, scheduled_time } = post;

  if (id) {
    // Update existing post
    const stmt = db.prepare(`
      UPDATE posts
      SET title = ?, content = ?, status = ?, scheduled_time = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    return new Promise((resolve, reject) => {
      stmt.run(title, content, status, scheduled_time, id, function(err) {
        if (err) {
          console.error('Error updating post:', err.message);
          return reject(err);
        }
        console.log('Post updated successfully:', id);
        resolve({ success: true, id });
      });
    });
  } else {
    // Insert new post
    const stmt = db.prepare(`
      INSERT INTO posts (title, content, status, scheduled_time)
      VALUES (?, ?, ?, ?)
    `);
    return new Promise((resolve, reject) => {
      stmt.run(title, content, status, scheduled_time, function(err) {
        if (err) {
          console.error('Error inserting post:', err.message);
          return reject(err);
        }
        console.log('Post saved successfully:', this.lastID);
        resolve({ success: true, id: this.lastID });
      });
    });
  }
});

// Retrieve all posts
ipcMain.handle('get-posts', async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM posts ORDER BY created_at DESC', (err, rows) => {
      if (err) {
        console.error('Error retrieving posts:', err.message);
        return reject(err);
      }
      console.log('Retrieved posts successfully:', rows.length);
      resolve(rows);
    });
  });
});

// Retrieve a single post by ID
ipcMain.handle('get-post-by-id', async (event, id) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM posts WHERE id = ?', [id], (err, row) => {
      if (err) {
        console.error('Error retrieving post by ID:', err.message);
        return reject(err);
      }
      if (row) {
        console.log('Retrieved post by ID successfully:', id);
        resolve(row);
      } else {
        console.warn('No post found with the given ID:', id);
        resolve(null);
      }
    });
  });
});

// Delete a post by ID
ipcMain.handle('delete-post', async (event, id) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM posts WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('Error deleting post:', err.message);
        return reject(err);
      }
      if (this.changes > 0) {
        console.log('Post deleted successfully:', id);
        resolve({ success: true });
      } else {
        console.warn('No post found to delete with the given ID:', id);
        resolve({ success: false });
      }
    });
  });
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

// Listen for 'post-published' event
ipcRenderer.on('post-published', (event, postId) => {
  showToast(`Post ID ${postId} has been published to LinkedIn.`);
  loadSavedPosts(); // Refresh the saved posts list
});

// ======= IPC Handler to Search Posts =======
ipcMain.handle('search-posts', async (event, query) => {
  if (!query) {
    return { success: false, message: 'Search query is required.' };
  }

  return new Promise((resolve, reject) => {
    const searchQuery = `%${query}%`;
    db.all('SELECT * FROM posts WHERE title LIKE ? OR content LIKE ? ORDER BY created_at DESC', [searchQuery, searchQuery], (err, rows) => {
      if (err) {
        console.error('Error searching posts:', err.message);
        return reject(err);
      }
      resolve(rows);
    });
  });
});
