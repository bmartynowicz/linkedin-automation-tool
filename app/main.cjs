// main.js

const dotenv = require('dotenv');
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const { fileURLToPath } = require('url');
const db = require('../database/database');
const { getAISuggestions } = require('../ai/ai');

// Load environment variables
dotenv.config()

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
ipcMain.on('post-to-linkedin', (event, content) => {
  console.log("Received LinkedIn post request with content:", content);
  // Implement LinkedIn post logic here
  // After successful post:
  // event.sender.send('post-success', 'Post was successful!');
  // On error:
  // event.sender.send('post-error', 'Failed to post.');
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
    // Replace with your actual database query logic
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
