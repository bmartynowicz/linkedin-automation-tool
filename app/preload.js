const { contextBridge, ipcRenderer } = require('electron');

// Expose secure APIs to the renderer process
contextBridge.exposeInMainWorld('api', {
  /**
   * Sends a request to post content to LinkedIn.
   * @param {string} content - The content to be posted.
   */
  postToLinkedIn: (content) => ipcRenderer.send('post-to-linkedin', content),

  /**
   * Sends a status update (e.g., loading, success, error).
   * @param {string} status - The status to be sent.
   */
  sendStatusUpdate: (status) => ipcRenderer.send('post-status-update', status),

  /**
   * Listens for successful post events from the main process.
   * @param {function} callback - The function to execute on success.
   */
  onPostSuccess: (callback) => ipcRenderer.on('post-success', (_, args) => callback(args)),

  /**
   * Listens for post error events from the main process.
   * @param {function} callback - The function to execute on error.
   */
  onPostError: (callback) => ipcRenderer.on('post-error', (_, args) => callback(args)),

  /**
   * Request AI Suggestions from the main process.
   * @param {string} prompt - The user input to get AI suggestions.
   * @returns {Promise<string>} - A promise resolving to the AI suggestion.
   */
  getAISuggestions: (prompt) => ipcRenderer.invoke('get-ai-suggestions', prompt),

  /**
   * Fetch notifications from the main process.
   * @returns {Promise<Array>} - A promise resolving to an array of notifications.
   */
  fetchNotifications: () => ipcRenderer.invoke('fetch-notifications'),

  /**
   * Fetch user data from the main process.
   * @returns {Promise<Object>} - A promise resolving to the user data object.
   */
  fetchUserData: () => ipcRenderer.invoke('fetch-user-data'),
});
