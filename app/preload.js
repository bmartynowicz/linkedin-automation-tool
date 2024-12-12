// preload.js

const { contextBridge, ipcRenderer } = require('electron');

// Define allowed channels for event listening (received from main)
const allowedChannels = [
  'post-success',
  'post-error',
  'post-published',
  'linkedin-auth-success',
  'linkedin-auth-failure',
  'linkedin-auth-closed',
  'update-user-data',
  'savePost'
  // Add any other event channels if needed
];

// Define allowed channels for sending messages (from renderer to main)
const allowedSendChannels = [
  'post-to-linkedin',
  'post-status-update',
  'send-feedback',
  'open-linkedin-auth-window',
  'load-page',
  'toggle-sidebar',
];

contextBridge.exposeInMainWorld('api', {
  // Generic method to listen to events
  on: (channel, callback) => {
    if (allowedChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    } else {
      console.warn(`Attempted to listen to unauthorized channel: ${channel}`);
    }
  },

  // Generic method to remove event listeners
  off: (channel, callback) => {
    if (allowedChannels.includes(channel)) {
      ipcRenderer.removeListener(channel, callback);
    } else {
      console.warn(`Attempted to remove listener from unauthorized channel: ${channel}`);
    }
  },

  // Send a request to load a new page into the BrowserView
  loadPage: (page) => {
    if (allowedSendChannels.includes('load-page')) {
      ipcRenderer.send('load-page', page);
    } else {
      console.warn('Unauthorized attempt to send on channel: load-page');
    }
  },

  toggleSidebar: (collapsed) => {
    if (allowedSendChannels.includes('toggle-sidebar')) {
      ipcRenderer.send('toggle-sidebar', collapsed);
    } else {
      console.warn('Unauthorized attempt to send on channel: toggle-sidebar');
    }
  },

  // Post to LinkedIn
  postToLinkedIn: (content) => {
    if (allowedSendChannels.includes('post-to-linkedin')) {
      ipcRenderer.send('post-to-linkedin', content);
    } else {
      console.warn('Unauthorized attempt to send on channel: post-to-linkedin');
    }
  },

  // Send status update
  sendStatusUpdate: (status) => {
    if (allowedSendChannels.includes('post-status-update')) {
      ipcRenderer.send('post-status-update', status);
    } else {
      console.warn('Unauthorized attempt to send on channel: post-status-update');
    }
  },

  // Send feedback about AI suggestions
  sendFeedback: (type, suggestion) => {
    if (allowedSendChannels.includes('send-feedback')) {
      ipcRenderer.send('send-feedback', type, suggestion);
    } else {
      console.warn('Unauthorized attempt to send on channel: send-feedback');
    }
  },

  // Open LinkedIn auth window
  openLinkedInAuthWindow: () => {
    if (allowedSendChannels.includes('open-linkedin-auth-window')) {
      console.log('Sending "open-linkedin-auth-window" message to main process');
      ipcRenderer.send('open-linkedin-auth-window');
    } else {
      console.warn('Unauthorized attempt to send on channel: open-linkedin-auth-window');
    }
  },

  // Invoke-based IPC methods
  getAISuggestions: (prompt, options, userId) => {
    console.log('Invoking "get-ai-suggestions" with prompt:', prompt);
    return ipcRenderer.invoke('get-ai-suggestions', prompt, options, userId);
  },

  fetchNotifications: () => {
    console.log('Invoking "fetch-notifications"');
    return ipcRenderer.invoke('fetch-notifications');
  },

  fetchUserData: () => {
    console.log('Invoking "fetch-user-data"');
    return ipcRenderer.invoke('fetch-user-data');
  },

  getCurrentUserWithPreferences: () => {
    console.log('Invoking "get-current-user-with-preferences"');
    return ipcRenderer.invoke('get-current-user-with-preferences');
  },

  searchPosts: (query) => {
    console.log('Invoking "search-posts" with query:', query);
    return ipcRenderer.invoke('search-posts', query);
  },

  savePost: (post) => {
    console.log('Invoking "savePost" with post:', post);
    return ipcRenderer.invoke('savePost', post);
  },

  getPosts: () => {
    console.log('Invoking "get-posts"');
    return ipcRenderer.invoke('get-posts');
  },

  getPostById: (id) => {
    console.log('Invoking "get-post-by-id" with ID:', id);
    return ipcRenderer.invoke('get-post-by-id', id);
  },

  deletePost: (postId) => {
    console.log('Invoking "delete-post" with Post ID:', postId);
    return ipcRenderer.invoke('delete-post', postId);
  },

  schedulePost: (updatedPost) => {
    console.log('Invoking "schedule-post" with updated post:', updatedPost);
    return ipcRenderer.invoke('schedule-post', updatedPost);
  },

  getEnv: (variable) => {
    console.log('Invoking "get-env" for variable:', variable);
    return ipcRenderer.invoke('get-env', variable);
  },

  sendTestMessage: () => {
    console.log('Sending "test-message" to main process');
    ipcRenderer.send('test-message');
  },

  saveSettings: (settingsData) => {
    console.log('Invoking saveSettings with data:', settingsData);
    return ipcRenderer.invoke('save-settings', settingsData);
  },
});
