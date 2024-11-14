console.log("Electron app is starting...");
require('dotenv').config();
const { app, BrowserWindow } = require('electron');
const { join } = require('path');

function createWindow() {
  console.log("Creating BrowserWindow...");
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: join(__dirname, 'assets', 'icon.png'),
  });

  mainWindow.loadFile('index.html').catch(err => console.error("Error loading index.html:", err));
  //mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  console.log("App is ready, creating window...");
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  console.log("All windows closed.");
  if (process.platform !== 'darwin') app.quit();
});
