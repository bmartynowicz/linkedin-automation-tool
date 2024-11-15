// preload.js

const { contextBridge, ipcRenderer } = require('electron');

/**
 * List of allowed IPC channels for communication between renderer and main processes.
 */
const validChannels = {
  postToLinkedIn: 'post-to-linkedin',
  postStatusUpdate: 'post-status-update',
  getAISuggestions: 'get-ai-suggestions',
  // Add other channels as needed
};

console.log("Preload script loaded and exposing API");

/**
 * Expose a secure API to the renderer process.
 */
contextBridge.exposeInMainWorld('api', {
  /**
   * Sends a request to post content to LinkedIn.
   * @param {string} content - The content to be posted.
   */
  postToLinkedIn: (content) => {
    if (typeof content === 'string') {
      ipcRenderer.send(validChannels.postToLinkedIn, content);
    } else {
      console.warn('postToLinkedIn expects a string.');
    }
  },

  /**
   * Sends a status update (e.g., loading, success, error).
   * @param {string} status - The status to be sent.
   */
  sendStatusUpdate: (status) => {
    if (typeof status === 'string') {
      ipcRenderer.send(validChannels.postStatusUpdate, status);
    } else {
      console.warn('sendStatusUpdate expects a string.');
    }
  },

  /**
   * Listens for successful post events from the main process.
   * @param {function} callback - The function to execute on success.
   */
  onPostSuccess: (callback) => {
    if (typeof callback === 'function') {
      ipcRenderer.on('post-success', (event, args) => callback(args));
    } else {
      console.warn('onPostSuccess expects a function as a callback.');
    }
  },

  /**
   * Listens for post error events from the main process.
   * @param {function} callback - The function to execute on error.
   */
  onPostError: (callback) => {
    if (typeof callback === 'function') {
      ipcRenderer.on('post-error', (event, args) => callback(args));
    } else {
      console.warn('onPostError expects a function as a callback.');
    }
  },

  /**
   * Remove all listeners for a specific channel.
   * @param {string} channel - The channel to clear.
   */
  removeAllListeners: (channel) => {
    if (Object.values(validChannels).includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    } else {
      console.warn('Invalid channel for removeAllListeners:', channel);
    }
  },

  /**
   * Request AI Suggestions from the main process.
   * @param {string} prompt - The user input to get AI suggestions.
   * @returns {Promise<string>} - A promise resolving to the AI suggestion.
   */
  getAISuggestions: (prompt) => {
    if (typeof prompt === 'string') {
      return ipcRenderer.invoke(validChannels.getAISuggestions, prompt)
        .catch((error) => {
          console.error('Error getting AI suggestions:', error);
          return ''; // Return empty string on error to keep the promise resolved
        });
    } else {
      console.warn('getAISuggestions expects a string.');
      return Promise.resolve(''); // Return a resolved promise with an empty string
    }
  },
});
