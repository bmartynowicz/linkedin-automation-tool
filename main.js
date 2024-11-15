// main.js

import dotenv from 'dotenv';
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

let getAISuggestions;

// Load environment variables
dotenv.config();

// Derive __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load AI dependencies
async function loadDependencies() {
  try {
    const aiModule = await import('./ai/ai.mjs');
    getAISuggestions = aiModule.getAISuggestions;
    console.log('AI Suggestions module loaded.');
  } catch (error) {
    console.error('Error loading AI Suggestions module:', error);
  }
}

await loadDependencies();

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
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
  });

  mainWindow.loadFile('index.html').catch(err => console.error("Error loading index.html:", err));

  // Open DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
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
    console.log('Main process received AI suggestion request for prompt:', prompt);
    const suggestion = await getAISuggestions(prompt);
    console.log('AI suggestion generated:', suggestion);
    return suggestion;
  } catch (error) {
    console.error('Error handling AI suggestion request:', error);
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
