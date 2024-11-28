// preload.js

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
  sendFeedback: (type, suggestion) => ipcRenderer.send('send-feedback', type, suggestion),
  searchPosts: (query) => ipcRenderer.invoke('search-posts', query),
  savePost: (post) => ipcRenderer.invoke('save-post', post),
  getPosts: () => ipcRenderer.invoke('get-posts'),
  getPostById: (id) => ipcRenderer.invoke('get-post-by-id', id),
  deletePost: (id) => ipcRenderer.invoke('delete-post', id),
  schedulePost: (updatedPost) => ipcRenderer.invoke('schedule-post', updatedPost),
  onPostPublished: (callback) => ipcRenderer.on('post-published', callback),
});
