const { contextBridge, ipcRenderer } = require('electron');

// Expose secure APIs to the renderer process
contextBridge.exposeInMainWorld('api', {
  postToLinkedIn: (content) => ipcRenderer.send('post-to-linkedin', content),
  sendStatusUpdate: (status) => ipcRenderer.send('post-status-update', status),
  onPostSuccess: (callback) => ipcRenderer.on('post-success', (_, args) => callback(args)),
  onPostError: (callback) => ipcRenderer.on('post-error', (_, args) => callback(args)),
  getAISuggestions: (prompt) => ipcRenderer.invoke('get-ai-suggestions', prompt),
  fetchNotifications: () => ipcRenderer.invoke('fetch-notifications'),
  fetchUserData: () => ipcRenderer.invoke('fetch-user-data'),
});
