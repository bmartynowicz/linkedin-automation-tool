// preload.js

const { contextBridge, ipcRenderer } = require('electron');

// Define allowed channels for event listening
const allowedChannels = [
  'post-success',
  'post-error',
  'post-published',
  'linkedin-auth-success',
  'linkedin-auth-failure',
  'linkedin-auth-closed',
  'update-user-data',
  'savePost',
  'saveSettings',
  'getScheduledPosts',
  'fetchUserData',
  'fetchNotifications',
  'getAISuggestions',
  'getEnv',
  'getPosts',
  'getPostById',
  'scrapeAnalytics',
  // Add any other event channels you intend to expose
];

// Define allowed channels for sending messages (if needed)
const allowedSendChannels = [
  'post-to-linkedin',
  'post-status-update',
  'send-feedback',
  'open-linkedin-auth-window',
  // Add any other channels you intend to send messages on
];

contextBridge.exposeInMainWorld('api', {
  on: (channel, callback) => {
    if (allowedChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    } else {
      console.warn(`Attempted to listen to unauthorized channel: ${channel}`);
    }
  },
  off: (channel, callback) => {
    if (allowedChannels.includes(channel)) {
      ipcRenderer.removeListener(channel, callback);
    } else {
      console.warn(`Attempted to remove listener from unauthorized channel: ${channel}`);
    }
  },
  formatLinkedInText: (delta) => {
    console.log('Invoking "format-linkedin-text" with delta:', delta);
    return ipcRenderer.invoke('format-linkedin-text', delta);
  },
  postToLinkedIn: (content) => {
    if (allowedSendChannels.includes('post-to-linkedin')) {
      ipcRenderer.send('post-to-linkedin', content);
    } else {
      console.warn('Unauthorized attempt to send on channel: post-to-linkedin');
    }
  },
  sendStatusUpdate: (status) => {
    if (allowedSendChannels.includes('post-status-update')) {
      ipcRenderer.send('post-status-update', status);
    } else {
      console.warn('Unauthorized attempt to send on channel: post-status-update');
    }
  },
  sendFeedback: (type, suggestion) => {
    if (allowedSendChannels.includes('send-feedback')) {
      ipcRenderer.send('send-feedback', type, suggestion);
    } else {
      console.warn('Unauthorized attempt to send on channel: send-feedback');
    }
  },
  openLinkedInAuthWindow: () => {
    if (allowedSendChannels.includes('open-linkedin-auth-window')) {
      console.log('Sending "open-linkedin-auth-window" message to main process');
      ipcRenderer.send('open-linkedin-auth-window');
    } else {
      console.warn('Unauthorized attempt to send on channel: open-linkedin-auth-window');
    }
  },
  getAISuggestions: ({ prompt, userId }) => {
    console.log('Invoking "get-ai-suggestions" with prompt and userId:', prompt, userId);
    return ipcRenderer.invoke('get-ai-suggestions', { prompt, userId });
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
  getSchedules: () => {
    console.log('Invoking "get-schedules"');
    return ipcRenderer.invoke('get-schedules');
  },
  getScheduledPosts: (linkedinId) => {
    console.log('Invoking "get-scheduled-posts" with LinkedIn ID:', linkedinId);
    return ipcRenderer.invoke('get-scheduled-posts', linkedinId);
  },
  scrapeAnalytics: (postId) => {
    console.log('Invoking "scrape-analytics" with PostID:', postId);
    return ipcRenderer.invoke('scrape-analytics', postId);
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