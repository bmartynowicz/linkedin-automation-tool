// ======= Initialize the Renderer Process =======
document.addEventListener('DOMContentLoaded', () => {
  console.log('Renderer process loaded.');

  let globalCurrentUser = null; // Stores the currently logged-in user
  let isModalOpen = false;
  let quill;
  let selectedPost = null;
  let postIdToDelete = null;
  let lastSuggestionTime = 0;
  let suggestionCooldown = false;
  let editingPostId = null;
  let modalCalendarInstance = null;
  let isSchedulerCalendarInitialized = false;
  let isAppInitializing = false;

  // ======= Sidebar =======
  const toggleMenuButton = document.getElementById('toggle-menu');
  const sidebar = document.getElementById('sidebar');

  const allPageIds = ['dashboard', 'content-editor', 'settings-page', 'scheduler-page', 'analytics-page'];

  const sidebarButtons = {
    'dashboard': document.querySelector('#sidebar .nav-item a[href="#dashboard"]'),
    'content-editor': document.querySelector('#sidebar .nav-item a[href="#content-creation"]'),
    'settings-page': document.querySelector('#sidebar .nav-item a[href="#settings"]'),
    'scheduler-page': document.querySelector('#sidebar .nav-item a[href="#scheduler"]'),
    'analytics-page': document.querySelector('#sidebar .nav-item a[href="#analytics"]'),
  };

  // ======= Modals =======

  const modals = {
    login: document.getElementById('login-modal'),
    createAccount: document.getElementById('create-account-modal'),
    profile: document.getElementById('profile-modal'),
    notifications: document.getElementById('notifications-dropdown'),
    savedPosts: document.getElementById('saved-posts-modal'),
    deleteConfirmation: document.getElementById('delete-confirmation-modal'),
    scheduler: document.getElementById('schedule-form-modal'),
  };

  const modalConfig = [
    { trigger: 'create-account-button', show: 'createAccount', hide: 'login' },
    { trigger: 'back-to-login', show: 'login', hide: 'createAccount' },
    { trigger: 'close-login-modal', hide: 'login' },
    { trigger: 'close-create-account-modal', hide: 'createAccount' },
    { trigger: 'profile', show: 'profile' },
    { trigger: 'close-profile', hide: 'profile' },
    { trigger: 'open-saved-posts', show: 'savedPosts' },
    { trigger: 'close-saved-posts', hide: 'savedPosts' },
    { trigger: 'confirm-delete', hide: 'deleteConfirmation' },
    { trigger: 'cancel-delete', hide: 'deleteConfirmation' },
    { trigger: 'close-scheduler-modal', hide: 'scheduler' },
  ];

  // ======= Notifications =======
  const notificationsDropdown = document.getElementById('notifications-dropdown');
  const notificationCount = document.getElementById('notification-count');
  const notificationsList = document.getElementById('notifications-list');

  // ======= Profile Modal =======
  const profileButton = document.getElementById('profile');
  const profileModal = document.getElementById('profile-modal');
  const closeProfileButton = document.getElementById('close-profile');
  const usernameDisplay = document.getElementById('username');
  const profilePicture = document.getElementById('profile-picture');
  const linkedinLoginButton = document.getElementById('linkedin-login-button');

  // ==== Account Creation Modal ====
  const loginModal = document.getElementById('login-modal');
  const createAccountModal = document.getElementById('create-account-modal');
  const createAccountButton = document.getElementById('create-account-button');
  const createAccountForm = document.getElementById('create-account-form');
  const backToLoginButton = document.getElementById('back-to-login');
  const closeLoginModalButton = document.getElementById('close-login-modal');
  const closeCreateAccountModalButton = document.getElementById('close-create-account-modal');

  // ======= Settings Page =======
  const settingsPage = document.getElementById('settings-page');
  const saveSettingsButton = document.getElementById('save-settings');
  const reauthenticateButton = document.getElementById('reauthenticate-linkedin');
  const restoreDefaultsButton = document.getElementById('restore-defaults');
  const promptPreviewElement = document.getElementById('prompt-preview');

  // ======= Scheduler Page =======
  const schedulerPage = document.getElementById('scheduler-page');
  const schedulePostButton = document.getElementById('schedule-post');
  const addSchedule = document.getElementById('add-schedule');
  const saveSchedule = document.getElementById('save-schedule')
  const closeScheduleModalButton = document.getElementById('close-scheduler-modal');
  const scheduleDateTimeInput = document.getElementById('schedule-datetime');
  const calendarElement = document.getElementById('calendar');

  // ======= Saved Posts Modal =======
  const savedPostsModal = document.getElementById('saved-posts-modal');
  const openSavedPostsButton = document.getElementById('open-saved-posts');
  const closeSavedPostsButton = savedPostsModal.querySelector('.close-button');
  const savedPostsList = document.getElementById('saved-posts-list');
  const searchPostsInput = document.getElementById('search-posts');
  const searchButton = document.getElementById('search-button');
  const editPostButton = document.getElementById('edit-post');
  const deletePostButton = document.getElementById('delete-post');
  const deleteConfirmationModal = document.getElementById('delete-confirmation-modal');
  const confirmDeleteButton = document.getElementById('confirm-delete');
  const cancelDeleteButton = document.getElementById('cancel-delete');
  const closeDeleteConfirmationButton = document.getElementById('close-delete-confirmation');
  const postToLinkedInButton = document.getElementById('post-to-linkedin');

  // ======= Save Post Button Functionality =======
  const savePostButton = document.getElementById('save-post');
  const postTitleInput = document.getElementById('post-title');

  // ======== Suggestion Box Button Functionality =========
  // Keywords or phrases to trigger suggestions
  const suggestionKeywords = ['help', 'need', 'assist', 'improve', 'suggest', 'idea'];
  //Delays to prevent overwhelming the user with suggestions
  const TYPING_PAUSE_DURATION = 3000; // 3 seconds
  const SUGGESTION_COOLDOWN_DURATION = 10000; // 10 seconds cooldown between suggestions
  const manualSuggestButton = document.getElementById('manual-suggest-button');
  const suggestionBox = document.getElementById('suggestion-box');
  const suggestionText = document.getElementById('suggestion-text');
  const acceptButton = document.getElementById('accept-suggestion');
  const rejectButton = document.getElementById('reject-suggestion');
  const closeSuggestionBoxButton = document.getElementById('close-suggestion-box');

  function debugModalState() {
    const loginModal = document.getElementById('login-modal');
    const isVisible = loginModal && getComputedStyle(loginModal).display !== 'none';
    console.log(`Login Modal State: isModalOpen=${isModalOpen}, isVisible=${isVisible}`);
  }

  function showLoginModal() {
    if (isModalVisible('login-modal')) {
      console.warn('Login modal is already open. Skipping...');
      return;
    }
    showModal('login');
    console.log('Login modal displayed.');
  }

  function hideLoginModal() {
    if (!isModalVisible('login-modal')) {
      console.warn('Login modal is already closed. Skipping...');
      return;
    }
    hideModal('login');
    console.log('Login modal hidden successfully.');
  }

  // Event Listener Setup for Modals
  function initializeModals() {
    modalConfig.forEach(({ trigger, show, hide }) => {
      const button = document.getElementById(trigger);
      if (button) {
        button.addEventListener('click', () => {
          if (hide) hideModal(hide);
          if (show) showModal(show);
        });
      } else {
        console.warn(`Trigger button "${trigger}" not found.`);
      }
    });
  }

  initializeModals();

  // Load application data on startup
  async function initializeApp() {
    if (isAppInitializing) {
      console.warn('Application initialization already in progress. Skipping...');
      return;
    }
    isAppInitializing = true;
  
    console.log('Starting application initialization...');
  
    try {
      const rememberedUser = await window.api.checkUserCredentials();
      console.log('checkUserCredentials result:', rememberedUser);
  
      if (rememberedUser.success && rememberedUser.user) {
        console.log('Remembered user found:', rememberedUser.user);
        globalCurrentUser = rememberedUser.user;
  
        // Validate and refresh session based on user type
        await validateAndRefreshSession(globalCurrentUser);
  
        if (isLoggedIn) {
          hideLoginModal();
          await loadSettings();
          await loadSchedulerData();
          console.log('Application initialized successfully for remembered user.');
        } else {
          console.warn('Session validation failed. Showing login modal.');
          showLoginModal();
        }
      } else {
        console.warn('No remembered user found. Showing login modal.');
        globalCurrentUser = null;
        showLoginModal();
      }
    } catch (error) {
      console.error('Error during application initialization:', error.message);
      showLoginModal();
    } finally {
      isAppInitializing = false;
      console.log('Application initialization completed.');
    }
  }  
  
  async function validateAndRefreshSession(user) {
    if (!user || !user.id) {
      console.warn('Invalid user session detected. Logging out...');
      showLoginModal();
      isLoggedIn = false;
      globalCurrentUser = null;
      return;
    }
  
    console.log('Validating session for user:', user);
  
    // Skip session validation for local-only users
    if (!user.linkedin_id) {
      console.log('No LinkedIn ID. Skipping session validation for local-only user.');
      isLoggedIn = true;
      globalCurrentUser = user; // Retain user state
      return;
    }
  
    // Validate session for LinkedIn-authenticated users
    try {
      const userDetails = await window.api.fetchUserData();
      if (!userDetails || !userDetails.linkedin_id) {
        console.warn('Session validation failed. Logging out...');
        showLoginModal();
        isLoggedIn = false;
        globalCurrentUser = null;
      } else {
        console.log('Session validation successful.');
        globalCurrentUser = userDetails; // Update with refreshed data
        isLoggedIn = true;
      }
    } catch (error) {
      console.error('Error during session validation:', error.message);
      showLoginModal();
      isLoggedIn = false;
      globalCurrentUser = null;
    }
  }   

  // Load settings into the UI
  const loadSettings = async () => {
    if (!globalCurrentUser || !globalCurrentUser.id) {
      console.warn('No user logged in. Skipping settings load.');
      return;
    }
  
    try {
      console.log(`Loading settings for user ID: ${globalCurrentUser.id}`);
      const rawPreferences = await window.api.loadSettingsForUser(globalCurrentUser.id);
      const preferences = rawPreferences.preferences; // Extract the nested preferences

      console.log('Preferences structure:', preferences);

      if (!preferences) {
        console.warn('No preferences found for the current user.');
        return;
      }
  
      const fieldMapping = {
        'theme-select': 'theme',
        'tone-select': 'tone',
        'suggestion-readiness': 'notification_settings.suggestion_readiness', // Nested structure
        'engagement-tips': 'notification_settings.engagement_tips',         // Nested structure
        'system-updates': 'notification_settings.system_updates',           // Nested structure
        'notification-frequency': 'notification_settings.frequency',
        'language': 'language',
        'data-sharing': 'data_sharing',
        'auto-logout': 'auto_logout',
        'save-session': 'save_session',
        'font-size': 'font_size',
        'text-to-speech': 'text_to_speech',
        'writing-style': 'writing_style',
        'engagement-focus': 'engagement_focus',
        'vocabulary-level': 'vocabulary_level',
        'content-type': 'content_type',
        'content-perspective': 'content_perspective',
        'emphasis-tags': 'emphasis-tags',
      };      
  
      Object.entries(fieldMapping).forEach(([fieldId, prefKey]) => {
        const element = document.getElementById(fieldId);
        if (!element) {
          console.warn(`Element with ID "${fieldId}" not found.`);
          return;
        }
  
        const value = prefKey.split('.').reduce((acc, key) => acc?.[key], preferences);
        
        console.log(`Setting field "${fieldId}" with value:`, value);
        
        if (element.type === 'checkbox') {
          element.checked = !!value;
        } else {
          element.value = value || '';
        }
      });
  
      // Update AI prompt preview
      const promptPreviewElement = document.getElementById('prompt-preview');
      if (promptPreviewElement) {
        const aiPrompt = generateAIPrompt(preferences);
        promptPreviewElement.textContent = aiPrompt;
        console.log('AI Prompt displayed:', aiPrompt);
      } else {
        console.warn('Prompt preview element not found.');
      }
  
      console.log('Settings successfully loaded and reflected in the UI.');
    } catch (error) {
      console.error('Error loading settings into UI:', error.message);
    }
  };   

  // Check if valid cookies exist for LinkedIn
  async function checkCookies() {
  try {
    console.log('Checking LinkedIn cookies...');
    const user = await window.api.getCurrentUserWithPreferences();
    if (!user || !user.id) {
      console.warn('User ID is not available. Ensure the user is logged in.');
      return false;
    }

    const cookies = await window.api.getCookiesForUser(user.id); // Implement this in preload.js and main.cjs
    if (!cookies || cookies.length === 0) {
      console.warn('No cookies found for the current user.');
      return false;
    }

    console.log('Cookies are valid for the current user.');
    return true;
  } catch (error) {
    console.error('Error checking cookies:', error.message);
    return false;
  }
  }

  initializeApp();

  // Sidebar navigation buttons
  Object.keys(sidebarButtons).forEach((pageId) => {
    const button = sidebarButtons[pageId];
    if (button) {
      button.addEventListener('click', () => {
        window.api.navigateToPage(pageId, allPageIds);
      });
    }
  });

  // Listen for navigation events
  window.api.onNavigate(({ targetPageId, allPageIds }) => {
    switchPage(targetPageId, allPageIds);
  });

  // Utility Functions
  function showModal(modalKey) {
    const modal = modals[modalKey];
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('show');
      document.body.classList.add('modal-open');
      console.log(`Modal "${modalKey}" displayed.`);
    } else {
      console.warn(`Modal "${modalKey}" not found.`);
    }
  }

  function hideModal(modalKey) {
    const modal = modals[modalKey];
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('show');
      document.body.classList.remove('modal-open');
      console.log(`Modal "${modalKey}" hidden.`);
    } else {
      console.warn(`Modal "${modalKey}" not found.`);
    }
  }

  function isModalVisible(modalId) {
    const modal = document.getElementById(modalId);
    return modal && getComputedStyle(modal).display !== 'none';
  }

  // ======= Emoji Bullet Button =======
  const emojiBulletButton = document.getElementById('ql-custom-bullet');

  const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), delay);
    };
  };

  function toggleElement(element, className) {
    element.classList.toggle(className);
    return element.classList.contains(className);
  }

  function switchPage(targetPageId, allPageIds) {
    try {
      const allPages = allPageIds.map((pageId) => document.getElementById(pageId));
      const targetPage = document.getElementById(targetPageId);
  
      if (!targetPage) {
        console.error(`Target page "${targetPageId}" not found.`);
        return;
      }
  
      allPages.forEach((page) => {
        if (page) {
          page.classList.toggle('hidden', page.id !== targetPageId);
        }
      });
  
      // Hook-based refresh logic
      if (targetPageId === 'settings-page') {
        loadSettings(); // Refresh settings page
      } else if (targetPageId === 'scheduler-page') {
        loadSchedulerData(); // Refresh scheduler data
      }
  
      console.log(`Switched to page: ${targetPageId}`);
    } catch (error) {
      console.error('Error in switchPage:', error.message);
    }
  }

  // Event listener for "Create Account" button
  if (createAccountButton) {
    createAccountButton.addEventListener('click', () => {
      hideModal('login-modal');
      showModal('create-account-modal');
    });
  }

  // Event listener for "Back to Login" button
  if (backToLoginButton) {
    backToLoginButton.addEventListener('click', () => {
      hideModal('create-account-modal');
      showModal('login-modal');
    });
  }

  // Close modal buttons
  if (closeLoginModalButton) {
    closeLoginModalButton.addEventListener('click', () => hideModal('login-modal'));
  }

  if (closeCreateAccountModalButton) {
    closeCreateAccountModalButton.addEventListener('click', () => hideModal('create-account-modal'));
  }

  if (createAccountForm) {
    createAccountForm.addEventListener('submit', async (event) => {
      event.preventDefault();
  
      const username = document.getElementById('new-username').value.trim();
      const email = document.getElementById('new-email').value.trim();
      const password = document.getElementById('new-password').value.trim();
      const confirmPassword = document.getElementById('confirm-password').value.trim();
  
      if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
      }
  
      try {
        const result = await window.api.createAccount({ username, email, password });
        if (result.success) {
          alert('Account created successfully!');
          hideModal('create-account-modal'); // Close the Create Account Modal
          showModal('login-modal'); // Show the Login Modal
        } else {
          alert(`Failed to create account: ${result.message}`);
        }
      } catch (error) {
        console.error('Error creating account:', error);
        alert('An error occurred while creating the account.');
      }
    });
  }  

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
  
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const rememberMe = document.getElementById('remember-me').checked;
  
    try {
      const result = await window.api.userLogin(username, password);
      console.log('Login result:', result);
  
      if (result.success) {
        alert('Login successful!');
        isLoggedIn = true;
        globalCurrentUser = result.user; // Update globalCurrentUser immediately
        console.log('Updated globalCurrentUser:', globalCurrentUser);
  
        await window.api.updateRememberMePreference(globalCurrentUser.id, rememberMe);
  
        hideLoginModal();
        await loadSettings(); // Load settings for the logged-in user
        await loadSchedulerData(); // Load scheduler data for the logged-in user
      } else {
        alert('Login failed: ' + result.message);
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  });
  
  // Apply Theme Dynamically
  function applyTheme(theme) {
    document.body.classList.toggle('dark-theme', theme === 'dark');
    console.log(`Applied ${theme} theme.`);
  }

  function showToast(message) {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
  
    // Append the toast to the container
    toastContainer.appendChild(toast);
  
    // Show the toast
    setTimeout(() => {
      toast.classList.add('show');
    }, 100);
  
    // Hide and remove the toast after a delay
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toastContainer.removeChild(toast);
      }, 500);
    }, 3000);
  }  

  const openModal = (modal) => {
    if (modal) {
      modal.style.display = 'flex';
      document.body.classList.add('modal-open');
      isModalOpen = true;
      console.log(`Modal opened: ${modal.id}`);
    }
  };

  const closeModal = (modal) => {
    if (modal) {
      modal.style.display = 'none';
      document.body.classList.remove('modal-open');
      isModalOpen = false;
      console.log(`Modal closed: ${modal.id}`);
    }
  };

  // Generate AI Prompt based on preferences
  const generateAIPrompt = (preferences) => {
    const {
      tone = 'professional',
      writing_style = 'brief',
      engagement_focus = 'comments',
      vocabulary_level = 'simplified',
      content_type = 'linkedin-post',
      content_perspective = 'first-person',
      emphasis_tags = '',
    } = preferences;
  
    return `
      You are assisting a LinkedIn user who focuses on ${content_type}.
      They prefer a ${tone} tone with a ${writing_style} style.
      Their engagement goal is ${engagement_focus}, using a ${vocabulary_level} vocabulary and ${content_perspective} perspective.
      Emphasize the following tags where relevant: ${emphasis_tags}.
      Provide a professional and engaging revision with tailored hashtags and a concise call-to-action.
    `.trim();
    };
  
  if (toggleMenuButton && sidebar) {
    toggleMenuButton.addEventListener('click', () => {
      // Toggle the 'collapsed' class on the sidebar to switch between expanded/collapsed states
      const collapsed = toggleElement(sidebar, 'collapsed');
      toggleElement(document.body, 'sidebar-collapsed');

      // Update the toggle button's icon based on the new state
      const icon = toggleMenuButton.querySelector('i');
      if (collapsed) {
        icon.classList.remove('fa-chevron-left');
        icon.classList.add('fa-chevron-right');
      } else {
        icon.classList.remove('fa-chevron-right');
        icon.classList.add('fa-chevron-left');
      }

      // Log the current state of the sidebar for debugging purposes
      console.log(`Sidebar ${collapsed ? 'Collapsed' : 'Expanded'}.`);
    });
  }

  async function loadNotifications() {
    try {
      const response = await window.api.fetchNotifications();
      if (response.success) {
        console.log('Notifications:', response.notifications);
        // Update the UI with notifications
      } else {
        console.error('Error fetching notifications:', response.message);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }  

  const notificationsButton = document.getElementById('notifications');
  if (notificationsButton) {
    notificationsButton.addEventListener('click', () => {
      const modalKey = 'notifications';
      const modal = modals[modalKey];
      if (modal) {
        modal.classList.toggle('hidden');
        const isVisible = !modal.classList.contains('hidden');
        notificationsButton.setAttribute('aria-expanded', isVisible);
        console.log(`Notifications dropdown ${isVisible ? 'opened' : 'closed'}.`);
      }
    });
  } else {
    console.warn('Notifications button not found.');
  }
  
  if (profileButton && profileModal && closeProfileButton) {
    profileButton.addEventListener('click', async () => {
      openModal(profileModal);
      const userData = await window.api.fetchUserData();
      if (userData) {
        document.getElementById('username').textContent = userData.name || 'User';
        document.getElementById('profile-picture').src = userData.profilePicture || '../../assets/default-profile.png';
      }
    });
  
    closeProfileButton.addEventListener('click', () => closeModal(profileModal));
  }

  // Logout Button Logic
const logoutButton = document.getElementById('logout-button');
if (logoutButton) {
  logoutButton.addEventListener('click', async () => {
    await window.api.logout(); // Ensure you have an IPC handler to clear the session
    showToast('Logged out successfully!');
    closeModal(profileModal);
    showLoginModal(); // Redirect to login modal
  });
}

// Password Change Logic
const changePasswordForm = document.getElementById('change-password-form');
if (changePasswordForm) {
  changePasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const currentPassword = document.getElementById('current-password').value.trim();
    const newPassword = document.getElementById('new-password').value.trim();
    const confirmPassword = document.getElementById('confirm-password').value.trim();

    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match!');
      return;
    }

    try {
      const result = await window.api.changePassword(currentPassword, newPassword);
      if (result.success) {
        showToast('Password changed successfully!');
        changePasswordForm.reset();
      } else {
        showToast(result.message || 'Failed to change password.');
      }
    } catch (error) {
      console.error('Error changing password:', error.message);
      showToast('An error occurred while changing your password.');
    }
  });
}
  
 // Attach Event Listener for Form Submission
  if (saveSettingsButton) {
  saveSettingsButton.addEventListener('click', async (e) => {
    e.preventDefault();
    console.log('Save Settings button clicked.');

    const fieldMapping = {
      'theme-select': 'theme',
      'tone-select': 'tone',
      'suggestion-readiness': 'notification_settings.suggestion_readiness',
      'engagement-tips': 'notification_settings.engagement_tips',
      'system-updates': 'notification_settings.system_updates',
      'notification-frequency': 'notification_settings.frequency',
      'language': 'language',
      'data-sharing': 'data_sharing',
      'auto-logout': 'auto_logout',
      'save-session': 'save_session',
      'font-size': 'font_size',
      'text-to-speech': 'text_to_speech',
      'writing-style': 'writing_style',
      'engagement-focus': 'engagement_focus',
      'vocabulary-level': 'vocabulary_level',
      'content-type': 'content_type',
      'content-perspective': 'content_perspective',
      'emphasis-tags': 'emphasis_tags',
    };

    const preferences = {};
    const notificationSettings = {};

    Object.entries(fieldMapping).forEach(([fieldId, prefKey]) => {
      const element = document.getElementById(fieldId);
      if (!element) return;

      const keys = prefKey.split('.');
      if (keys[0] === 'notification_settings') {
        // Handle notification_settings separately
        notificationSettings[keys[1]] =
          element.type === 'checkbox' ? element.checked : element.value.trim();
      } else {
        // Handle general preferences
        preferences[keys[0]] =
          element.type === 'checkbox' ? element.checked : element.value.trim();
      }
    });

    // Add flattened notification settings to preferences
    preferences.notification_settings = {
      suggestion_readiness: !!notificationSettings.suggestion_readiness, // Convert to boolean
      engagement_tips: !!notificationSettings.engagement_tips,
      system_updates: !!notificationSettings.system_updates,
      frequency: notificationSettings.frequency || 'realtime',
    };    

    console.log('Preferences to save:', preferences);

    try {
      const result = await window.api.saveSettingsForUser(globalCurrentUser.id, preferences);
      if (result.success) {
        showToast('Settings saved successfully!');
      } else {
        showToast('Failed to save settings.');
      }
    } catch (error) {
      console.error('Error saving settings:', error.message);
      showToast('An error occurred while saving settings.');
    }
  });
  } 

  if (restoreDefaultsButton) {
    restoreDefaultsButton.addEventListener('click', async () => {
      console.log('Restoring default preferences.');
  
      try {
        const defaultPreferences = await window.api.getDefaultPreferences(); // Fetch from backend
        const fieldMapping = {
          'theme-select': 'theme',
          'tone-select': 'tone',
          'suggestion-readiness': 'notification_settings.suggestion_readiness',
          'engagement-tips': 'notification_settings.engagement_tips',
          'system-updates': 'notification_settings.system_updates',
          'notification-frequency': 'notification_settings.frequency',
          'language': 'language',
          'data-sharing': 'data_sharing',
          'auto-logout': 'auto_logout',
          'save-session': 'save_session',
          'font-size': 'font_size',
          'text-to-speech': 'text_to_speech',
          'writing-style': 'writing_style',
          'engagement-focus': 'engagement_focus',
          'vocabulary-level': 'vocabulary_level',
          'content-type': 'content_type',
          'content-perspective': 'content_perspective',
          'emphasis-tags': 'emphasis_tags',
        };
  
        // Update UI elements
        Object.entries(fieldMapping).forEach(([fieldId, prefKey]) => {
          const element = document.getElementById(fieldId);
          if (!element) return;
  
          const keys = prefKey.split('.');
          const value = keys.reduce((acc, key) => acc[key], defaultPreferences);
  
          if (element.type === 'checkbox') {
            element.checked = !!value;
          } else {
            element.value = value || '';
          }
        });
  
        // Update AI prompt preview
        const promptPreviewElement = document.getElementById('prompt-preview');
        if (promptPreviewElement) {
          const aiPrompt = generateAIPrompt(defaultPreferences);
          promptPreviewElement.textContent = aiPrompt;
          console.log('Defaults restored. AI Prompt generated:', aiPrompt);
        }
      } catch (error) {
        console.error('Error restoring defaults:', error.message);
      }
    });
  }

  // Attach Event Listener for LinkedIn Reauthentication
  if (reauthenticateButton) {
    reauthenticateButton.addEventListener('click', async () => {
      try {
        console.log('Reauthentication button clicked');
        const result = await window.api.reauthenticateLinkedIn();
        if (result.success) {
          showToast('Reauthenticated with LinkedIn successfully.');
        } else {
          showToast('Failed to reauthenticate with LinkedIn.');
        }
      } catch (error) {
        console.error('Error during reauthentication:', error.message);
        showToast('An error occurred during LinkedIn reauthentication.');
      }
    });    
  }

  // Add a handler for managing the save post functionality
  if (openSavedPostsButton && savedPostsModal && closeSavedPostsButton) {
    openSavedPostsButton.addEventListener('click', () => {
      openModal(savedPostsModal);
      loadSavedPosts(); // Function to load saved posts when modal opens
    });

    // Close Saved Posts Modal
    closeSavedPostsButton.addEventListener('click', () => {
      closeModal(savedPostsModal);
      resetSelection();
    });

    // Handle clicks outside the modal to close it
    window.addEventListener('click', (event) => {
      if (event.target === savedPostsModal) {
        closeModal(savedPostsModal);
        resetSelection();
      }
    });
  }

  // ======= Function to Load a Post for Editing =======
  async function loadPostForEditing(post) {
    console.log('loadPostForEditing called with post:', post);
    
    if (quill && postTitleInput) {
      console.log('Quill and postTitleInput are initialized.');
      
      // Set the post title
      postTitleInput.value = post.title || '';
      console.log('Post title set to:', post.title || '');
  
      // Convert HTML to Delta and set the editor content
      try {
        const delta = quill.clipboard.convert(post.content);
        quill.setContents(delta);
        console.log('Current editor content:', quill.root.innerHTML);
        console.log('Editor content set using setContents.');
      } catch (error) {
        console.error('Error setting editor content:', error);
        showToast('Failed to load post content.');
        return;
      }
  
      // Track the post being edited
      editingPostId = post.id;
      console.log('Editing post ID set to:', editingPostId);
  
      // Close the modal
      closeModal(savedPostsModal);
      console.log('Saved Posts modal closed.');
  
      // Show success toast
      showToast('Loaded post for editing.');
  
      // Focus the editor (optional)
      quill.focus();
      console.log('Editor focused.');
  
      // Optionally, scroll to the editor
      document.getElementById('editor-container').scrollIntoView({ behavior: 'smooth' });
    } else {
      showToast('Editor is not initialized.');
      console.error('Quill or Post Title Input is not available.');
    }
  }

  // ===== Modal Calendar for Scheduling =====
  function initializeModalCalendar(defaultDate, onChangeCallback) {
  const modalDateTimeInput = document.getElementById('schedule-datetime');
  if (!modalDateTimeInput) {
    console.error('Modal date/time input not found.');
    return;
  }

  if (modalCalendarInstance) {
    modalCalendarInstance.destroy();
  }

  modalCalendarInstance = flatpickr(modalDateTimeInput, {
    enableTime: true,
    dateFormat: 'Y-m-d H:i',
    defaultDate: defaultDate || new Date(),
    onChange: (selectedDates) => {
      if (selectedDates.length === 0) {
        console.warn('No date selected in modal.');
        return;
      }
      console.log('Date selected in modal:', selectedDates);
      onChangeCallback(selectedDates);
    },
  });
  }

  // ===== Load Scheduler Data =====
  // Load scheduler data into the UI
// Load scheduler data into the UI
const loadSchedulerData = async () => {
  if (!globalCurrentUser || !globalCurrentUser.id) {
    console.warn('No user logged in. Skipping scheduler data load.');
    return;
  }

  console.log(`Loading scheduler data for user ID: ${globalCurrentUser.id}`);

  try {
    // Fetch all posts for the current user
    const allPosts = await window.api.getPosts();
    console.log('All Posts:', allPosts);

    // Fetch scheduled posts if the user has a LinkedIn ID
    let scheduledPosts = [];
    if (globalCurrentUser.linkedin_id) {
      scheduledPosts = await window.api.getScheduledPosts(globalCurrentUser.linkedin_id);
      console.log('Scheduled Posts:', scheduledPosts);
    } else {
      console.warn('User does not have a LinkedIn ID. Scheduling disabled.');
    }

    // Merge schedules with their corresponding posts
    const mergedScheduledPosts = scheduledPosts.map((schedule) => {
      const post = allPosts.find((p) => p.id === schedule.post_id);
      return {
        ...post,
        scheduled_time: schedule.scheduled_time, // Add scheduled time from schedule
        schedule_status: schedule.status, // Add status from schedule
      };
    });

    // Identify unscheduled posts
    const unscheduledPosts = allPosts.filter(
      (post) =>
        post.status === 'draft' &&
        !mergedScheduledPosts.some((s) => s.id === post.id)
    );

    console.log('Unscheduled Posts:', unscheduledPosts);
    console.log('Merged Scheduled Posts:', mergedScheduledPosts);

    // Display posts in their respective sections
    displayPosts('#unscheduled-posts', unscheduledPosts);
    displayPosts('#upcoming-posts', mergedScheduledPosts);

    // Update or initialize the calendar
    if (!isSchedulerCalendarInitialized) {
      initializeMainSchedulerCalendar(mergedScheduledPosts);
      isSchedulerCalendarInitialized = true;
    } else {
      updateCalendarHighlights(mergedScheduledPosts);
    }

    // Disable scheduling actions if the user lacks a LinkedIn ID
    if (!globalCurrentUser.linkedin_id) {
      console.log('Disabling scheduling options for non-LinkedIn user.');
      disableSchedulingActions();
    }
  } catch (error) {
    console.error('Error loading scheduler data:', error.message);
  }
};

// Function to disable scheduling actions
const disableSchedulingActions = () => {
  const scheduleButtons = document.querySelectorAll('.schedule-action');
  scheduleButtons.forEach((button) => (button.disabled = true));
  showToast('Scheduling disabled. Connect your LinkedIn account to enable this feature.');
};

  const loadUserAnalytics = async () => {
    if (!globalCurrentUser) {
      console.warn('No user logged in. Skipping analytics load.');
      return;
    }
  
    try {
      const analytics = await window.api.getUserAnalytics(globalCurrentUser.id);
      displayAnalytics(analytics); // Assume this is a function to update the UI
    } catch (error) {
      console.error('Error loading analytics:', error.message);
      showToast('An error occurred while loading analytics.');
    }
  };  

  // ===== Event Handlers =====

  document.getElementById("scrape-analytics").addEventListener("click", async () => {
    try {
      console.log("Scrape Analytics button clicked.");
  
      // Fetch current user data
      const user = await window.api.getCurrentUserWithPreferences();
      if (!user || !user.id) {
        throw new Error("User data not available. Please log in.");
      }
  
      // Get or create the current browser page
      const pageResult = await window.api.getCurrentBrowserPage();
  
      if (pageResult.success) {
        console.log("Using existing browser page.");
        const postId = 'urn:li:share:7280464486644289536'; // Example post ID
  
        console.log(`Initiating scraping for post ID: ${postId}`);
        const scrapeResult = await window.api.scrapePostAnalytics(user.id, postId);
  
        if (scrapeResult.success) {
          console.log("Scraped Analytics Data:", scrapeResult.data);
          alert("Analytics data scraped successfully!");
        } else {
          console.error("Error scraping analytics:", scrapeResult.error);
          alert("Failed to scrape analytics. Check console for details.");
        }
      } else {
        console.error("Failed to get browser page:", pageResult.error);
        alert("Failed to get browser page. Please try again.");
      }
    } catch (error) {
      console.error("Error scraping analytics:", error.message);
      alert("An error occurred. Check the console for details.");
    }
  });  

  document.getElementById('add-schedule').addEventListener('click', () => {
  const selectedDate = document.getElementById('selected-date')?.textContent || new Date();
  initializeModalCalendar(selectedDate, (selectedDates) => {
    console.log('Date selected in modal:', selectedDates);
  });
  document.getElementById('schedule-form-modal').style.display = 'block';
  });

  document.getElementById('close-scheduler-modal').addEventListener('click', () => {
  document.getElementById('schedule-form-modal').style.display = 'none';
  });

  // Highlight dates in the scheduler calendar
  function updateCalendarHighlights(scheduledPosts) {
  if (!scheduledPosts || !Array.isArray(scheduledPosts)) {
    console.warn('No scheduled posts provided to highlight.');
    return;
  }

  // Convert scheduled posts to a set of formatted dates
  const scheduledDates = new Set(
    scheduledPosts.map((post) =>
      new Date(post.scheduled_time).toISOString().split('T')[0]
    )
  );

  // Get all day elements in the calendar
  const dayElements = document.querySelectorAll('.flatpickr-day');

  dayElements.forEach((dayElement) => {
    const date = dayElement.dateObj?.toISOString().split('T')[0];
    if (date && scheduledDates.has(date)) {
      dayElement.classList.add('has-posts'); // Add a custom class for styling
    } else {
      dayElement.classList.remove('has-posts'); // Remove if no posts
    }
  });

  console.log('Calendar highlights updated with scheduled posts:', scheduledDates);
  }
  
  async function populatePostSelect(selectedPostId = null) {
  const postSelectEl = document.getElementById('post-select');
  if (!postSelectEl) return;

  try {
    const posts = await window.api.getPosts(); // Fetch all posts
    const unscheduledPosts = posts.filter((post) => post.status === 'draft');

    postSelectEl.innerHTML = ''; // Clear existing options
    if (unscheduledPosts.length === 0) {
      const option = document.createElement('option');
      option.textContent = 'No unscheduled posts available';
      option.disabled = true;
      postSelectEl.appendChild(option);
      return;
    }

    unscheduledPosts.forEach((post) => {
      const option = document.createElement('option');
      option.value = post.id;
      option.textContent = post.title || `Post #${post.id}`;
      postSelectEl.appendChild(option);
    });

    // Pre-select the provided post ID if available
    if (selectedPostId) {
      postSelectEl.value = selectedPostId;
    }
  } catch (error) {
    console.error('Error populating post select:', error.message);
    showToast('Failed to load unscheduled posts.');
  }
  }

  // Load posts for a selected date
  async function loadPostsForSelectedDate(selectedDate) {
  try {
    if (!selectedDate) throw new Error('Invalid date provided.');

    const user = await window.api.fetchUserData();
    const linkedinId = user.linkedin_id;

    if (!linkedinId) throw new Error('LinkedIn ID not found.');

    const allScheduledPosts = await window.api.getScheduledPosts(linkedinId);
    const formattedDate = selectedDate.toISOString().split('T')[0];

    const postsForDate = allScheduledPosts.filter(
      (post) => new Date(post.scheduled_time).toISOString().split('T')[0] === formattedDate
    );

    displayPosts('#day-posts', postsForDate);
  } catch (error) {
    console.error('Error loading posts for selected date:', error.message);
  }
  }

  // Function to display posts in a given list
  function displayPosts(listId, posts) {
    console.log(`Attempting to display posts in ${listId}`);
    const listElement = document.querySelector(listId);
  
    if (!listElement) {
      console.error(`List element ${listId} not found in DOM.`);
      return;
    }
  
    listElement.innerHTML = ''; // Clear existing content
    console.log(`Cleared existing content for ${listId}`);
  
    if (!posts || posts.length === 0) {
      console.warn(`No posts available to display in ${listId}.`);
      listElement.innerHTML = '<div>No posts found.</div>';
      return;
    }
  
    console.log(`Rendering ${posts.length} posts in ${listId}...`);
    posts.forEach((post) => {
      console.log('Rendering post:', post);
      const postCard = document.createElement('div');
      postCard.className = 'post-card';
  
      const postDetails = document.createElement('div');
      postDetails.className = 'post-details';
  
      const postTitle = document.createElement('h4');
      postTitle.className = 'post-title';
      postTitle.textContent = post.title || `Post #${post.id}`;
  
      const postDate = document.createElement('p');
      postDate.className = 'post-date';
      postDate.textContent = post.scheduled_time
        ? `Scheduled: ${new Date(post.scheduled_time).toLocaleString()}`
        : 'Not Scheduled';
  
      postDetails.appendChild(postTitle);
      postDetails.appendChild(postDate);
      postCard.appendChild(postDetails);
      listElement.appendChild(postCard);
    });
    console.log(`Posts successfully displayed in ${listId}.`);
  } 

  // ======= Load Saved Posts Function =======
  const loadSavedPosts = async () => {
    if (!globalCurrentUser) {
      console.warn('No user logged in. Skipping post loading.');
      return;
    }
  
    try {
      showLoader();
      const posts = await window.api.getPosts();
      displaySavedPosts(posts);
    } catch (error) {
      console.error('Error loading saved posts:', error.message);
      showToast('An error occurred while loading saved posts.');
    } finally {
      hideLoader();
    }
  };  

  // ======= Function to Display Saved Posts =======
  const displaySavedPosts = (posts) => {
  savedPostsList.innerHTML = ''; // Clear existing list

  if (posts.length === 0) {
    savedPostsList.innerHTML = '<li>No saved posts found.</li>';
    return;
  }

  posts.forEach((post) => {
    const li = document.createElement('li');
    li.classList.add('saved-post-item');
    li.dataset.id = post.id;

    // Post Title
    const title = document.createElement('span');
    title.classList.add('post-title');
    title.innerText = post.title || `Post #${post.id}`;
    li.appendChild(title);

    // Post Status
    const status = document.createElement('span');
    status.classList.add('post-status');
    status.innerText = `[${post.status}]`;
    li.appendChild(status);

    // Remove individual action buttons from each post

    // Add click event listener to handle selection
    li.addEventListener('click', () => {
      // Deselect previously selected post
      const previouslySelected = savedPostsList.querySelector('.selected');
      if (previouslySelected) {
        previouslySelected.classList.remove('selected');
      }

      // Select the clicked post
      li.classList.add('selected');
      selectedPost = post;

      // Enable action buttons at the bottom
      editPostButton.disabled = false;
      schedulePostButton.disabled = false;
      deletePostButton.disabled = false;

      console.log(`Post selected: ID ${post.id}`);
    });

    savedPostsList.appendChild(li);
  });
  };

  // ======= Function to Perform Search =======
  const performSearch = debounce(async () => {
    const query = searchPostsInput.value.trim();
    if (query.length === 0) {
      loadSavedPosts(); // Load all posts if search query is empty
      return;
    }
  
    showLoader();
    try {
      const posts = await window.api.searchPosts(query);
      displaySavedPosts(posts);
      showToast(`Found ${posts.length} post(s) matching "${query}".`);
      // Reset selection
      resetSelection();
    } catch (error) {
      console.error('Error searching posts:', error);
      showToast('An error occurred while searching posts.');
    } finally {
      hideLoader();
    }
  }, 500);  

  // ======= Event Listeners for Search Functionality =======
  if (searchButton && searchPostsInput) {
    searchButton.addEventListener('click', performSearch);
  }

  if (searchPostsInput) {
    searchPostsInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        performSearch();
      }
    });
  }

  // Edit Post Button Click Event
  editPostButton.addEventListener('click', () => {
    if (selectedPost) {
      loadPostForEditing(selectedPost);
      // Close the modal after loading the post
      closeModal(savedPostsModal);

      // Reset selection and disable buttons
      resetSelection();
    } else {
      showToast('Please select a post to edit.');
    }
  });

  // Clear the saved posts modal selector
  function resetSelection() {
    // Deselect any selected post
    const selectedLi = savedPostsList.querySelector('.selected');
    if (selectedLi) {
      selectedLi.classList.remove('selected');
    }
  
    selectedPost = null;
  
    // Disable action buttons
    editPostButton.disabled = true;
    schedulePostButton.disabled = true;
    deletePostButton.disabled = true;
  }

  function initializeFlatpickr(elementOrId, options) {
  let element;

  // Handle if a string selector or DOM element is passed
  if (typeof elementOrId === 'string') {
    if (!elementOrId.trim()) {
      console.error('initializeFlatpickr called with an empty or invalid selector.');
      return null;
    }
    element = document.querySelector(elementOrId);
  } else if (elementOrId instanceof HTMLElement) {
    element = elementOrId;
  } else {
    console.error('initializeFlatpickr called with an invalid argument. Expected a string or DOM element.');
    return null;
  }

  if (!element) {
    console.error(`Element not found for selector: ${elementOrId}`);
    return null;
  }

  // Destroy any existing Flatpickr instance
  if (element._flatpickr) {
    console.log(`Destroying existing Flatpickr instance for ${elementOrId}.`);
    element._flatpickr.destroy();
  }

  // Initialize Flatpickr
  return flatpickr(element, options);
  }

  // Function to initialize the main scheduler calendar
  async function initializeMainSchedulerCalendar(scheduledPosts) {
  const schedulerCalendarElement = document.getElementById('main-scheduler-calendar');
  if (!schedulerCalendarElement) {
    console.error('Main Scheduler Calendar element not found.');
    return;
  }

  flatpickr(schedulerCalendarElement, {
    inline: true,
    enableTime: false,
    dateFormat: 'Y-m-d',
    onReady: () => {
      console.log('Main Scheduler Calendar initialized.');
      updateCalendarHighlights(scheduledPosts); // Only update highlights here
    },
    onChange: ([selectedDate]) => {
      console.log('Date selected on Main Scheduler Calendar:', selectedDate);
      loadPostsForSelectedDate(selectedDate); // Load posts for the selected date
    },
  });
  }
  
  // Schedule Post Button Click Event
  schedulePostButton.addEventListener('click', async () => {
  if (selectedPost) {
    const modal = document.getElementById('schedule-form-modal');
    const scheduleDateTimeInput = document.getElementById('schedule-datetime');

    // Populate the dropdown and pre-select the post
    await populatePostSelect(selectedPost.id);

    // Initialize Flatpickr using the DOM element directly
    initializeFlatpickr(scheduleDateTimeInput, {
      enableTime: true,
      dateFormat: 'Y-m-d H:i',
      defaultDate: new Date(), // Default to now or set a preferred date
    });

    openModal(modal);
  } else {
    showToast('Please select a post to schedule.');
  }
  });

  if (addSchedule) {
  addSchedule.addEventListener('click', async () => {
    const selectedDate = document.getElementById('selected-date')?.textContent;
    if (!selectedDate) {
      showToast('Please select a date first.');
      return;
    }

    // Populate dropdown with unscheduled posts
    await populatePostSelect();

    // Initialize Flatpickr for the selected date
    initializeFlatpickr(scheduleDateTimeInput, {
      enableTime: true,
      dateFormat: 'Y-m-d H:i',
      defaultDate: selectedDate || new Date(),
    });

    openModal(document.getElementById('schedule-form-modal'));
  });
  }

  if (scheduleDateTimeInput) {
  flatpickr(scheduleDateTimeInput, {
    enableTime: true,
    dateFormat: 'Y-m-d H:i',
    defaultDate: document.getElementById('selected-date')?.textContent || new Date(), // Use selected date or fallback to now
  });
  }

  if (saveSchedule) {
  saveSchedule.addEventListener('click', async () => {
    const postId = document.getElementById('post-select').value;
    const scheduleDateTime = document.getElementById('schedule-datetime').value;
    const recurrenceType = document.getElementById('recurrence-type')?.value || 'none';

    if (!postId || !scheduleDateTime) {
      showToast('Please fill out all fields.');
      return;
    }

    console.log('Scheduling post', postId, 'at', scheduleDateTime, 'with recurrence:', recurrenceType);

    try {
      const result = await window.api.schedulePost({
        postId,
        scheduledTime: scheduleDateTime,
        recurrence: recurrenceType,
      });

      if (result.success) {
        showToast('Post scheduled successfully!');
        closeModal(document.getElementById('schedule-form-modal'));
        await loadSchedulerData(); // Refresh calendar and posts
      } else {
        showToast(`Failed to schedule the post: ${result.message}`);
      }
    } catch (error) {
      console.error('Error scheduling the post:', error.message);
      showToast('An error occurred while scheduling the post.');
    }
  });
  }

  if (closeScheduleModalButton) {
  closeScheduleModalButton.addEventListener('click', () => {
    const modal = document.getElementById('schedule-form-modal');
    if (modal) closeModal(modal);
  });
  }

  // Delete Post Button Click Event
  deletePostButton.addEventListener('click', () => {
  if (selectedPost) {
    openDeleteConfirmation(selectedPost.id);
  } else {
    showToast('Please select a post to delete.');
  }
  });

  // ======= Function to Open Delete Confirmation Modal =======
  const openDeleteConfirmation = async (postId) => {
  if (!deleteConfirmationModal) return;

  postIdToDelete = postId; // Store the post ID to delete
  console.log('Post ID to delete:', postId);

  try {
    const user = await window.api.fetchUserData(); // Await user data
    console.log('Current user:', user);
  } catch (error) {
    console.error('Error fetching current user:', error);
  }

  // Open the modal
  openModal(deleteConfirmationModal);
  };

  // Event Listener for Confirm Delete Button
  if (confirmDeleteButton) {
  confirmDeleteButton.addEventListener('click', async () => {
    if (postIdToDelete !== null) {
      try {
        // Fetch the current user
        const user = await window.api.fetchUserData();
        if (!user || !user.linkedin_id) {
          showToast('Unable to identify the current user. Please log in again.');
          return;
        }

        const result = await window.api.deletePost({
          postId: postIdToDelete,
          userId: user.linkedin_id, // Pass LinkedIn ID for ownership validation
        });

        if (result.success) {
          showToast('Post deleted successfully.');
          loadSavedPosts(); // Refresh the posts list
          resetSelection(); // Reset selection and disable action buttons
        } else {
          showToast('Failed to delete the post.');
        }
      } catch (error) {
        console.error('Error deleting post:', error);
        showToast('An error occurred while deleting the post.');
      } finally {
        closeModal(deleteConfirmationModal);
        postIdToDelete = null; // Reset the variable
      }
    }
  });
  }

  // Event Listener for Cancel Delete Button
  if (cancelDeleteButton) {
  cancelDeleteButton.addEventListener('click', () => {
    closeModal(deleteConfirmationModal);
    postIdToDelete = null; // Reset the variable
  });
  }

  // Event Listener for Close Button
  if (closeDeleteConfirmationButton) {
  closeDeleteConfirmationButton.addEventListener('click', () => {
    closeModal(deleteConfirmationModal);
    postIdToDelete = null; // Reset the variable
  });
  }

  // Loader Management
  const showLoader = () => {
  const loader = document.getElementById('posts-loader');
  if (loader) {
    loader.classList.remove('hidden');
  }
  };

  const hideLoader = () => {
  const loader = document.getElementById('posts-loader');
  if (loader) {
    loader.classList.add('hidden');
  }
  };

  // ======= Handle LinkedIn Auth Feedback =======

  // Listen to 'post-success' event
  window.api.on('post-success', (args) => {
  console.log('Received "post-success" event:', args);
  showToast(`Post ID ${args} has been published to LinkedIn.`);
  loadSavedPosts(); // Refresh the saved posts list
  });

  // Listen to 'post-error' event
  window.api.on('post-error', (args) => {
  console.error('Received "post-error" event:', args);
  showToast(`Error posting to LinkedIn: ${args}`);
  });

  // Listen to 'post-published' event
  window.api.on('post-published', (postId) => {
  console.log('Received "post-published" event:', postId);
  showToast(`Post ID ${postId} has been published to LinkedIn.`);
  loadSavedPosts(); // Refresh the saved posts list
  });

  // Listen to 'update-user-data' event (example)
  window.api.on('update-user-data', (userData) => {
  console.log('Received "update-user-data" event:', userData);
  usernameDisplay.textContent = userData.name;
  profilePicture.src = userData.profilePicture || '../../assets/default-profile.png';
  showToast('User data updated.');
  });

  // Listen to 'linkedin-auth-success' event
  window.api.on('linkedin-auth-success', (userData) => {
  console.log('Received "linkedin-auth-success" event:', userData);
  usernameDisplay.textContent = userData.name;
  profilePicture.src = userData.profilePicture || '../../assets/default-profile.png';
  showToast('Successfully logged in with LinkedIn!');
  });

  // Listen to 'linkedin-auth-failure' event
  window.api.on('linkedin-auth-failure', (errorData) => {
  console.error('Received "linkedin-auth-failure" event:', errorData);
  showToast('Failed to authenticate with LinkedIn.');
  });

  // Listen to 'linkedin-auth-closed' event
  window.api.on('linkedin-auth-closed', () => {
  console.warn('Received "linkedin-auth-closed" event');
  showToast('LinkedIn authentication was canceled.');
  });

  if (linkedinLoginButton) {
  linkedinLoginButton.addEventListener('click', () => {
    console.log('LinkedIn login button clicked');
    window.api.openLinkedInAuthWindow();
  });
  } else {
    console.error('LinkedIn login button not found.');
  }

  // ======= Register the Custom Bullet Format =======
  const Block = Quill.import('blots/block');

  class CustomBullet extends Block {
  static create(value) {
    const node = super.create();
    node.setAttribute('data-custom-bullet', value || '◾');
    node.style.listStyleType = 'none'; // Remove native list style
    node.style.display = 'list-item'; // Treat as a list item
    node.style.paddingLeft = '20px'; // Add padding for text alignment
    node.style.textIndent = '-20px'; // Ensure proper bullet alignment
    return node;
  }

  static formats(node) {
      return node.getAttribute('data-custom-bullet') || '◾';
  }

  format(name, value) {
      if (name === CustomBullet.blotName && value) {
          this.domNode.setAttribute('data-custom-bullet', value);
      } else {
          super.format(name, value);
      }
  }
  }

  CustomBullet.blotName = 'custom-bullet';
  CustomBullet.tagName = 'LI'; // Use list item tag
  Quill.register(CustomBullet, true);

  // Function to apply custom formatting
  function applyCustomFormat(format) {
  const range = quill.getSelection();
  if (range) {
    const selectedText = quill.getText(range.index, range.length);
    const formattedText = textFormat[format](selectedText);

    // Replace the selected text with formatted text
    quill.deleteText(range.index, range.length);
    quill.insertText(range.index, formattedText);
    quill.setSelection(range.index + formattedText.length, 0);
  }
  }

  // ======= Initialize the Quill Editor =======
  if (typeof Quill !== 'undefined') {
  console.log('Quill is available.');

  // Initialize Quill
  quill = new Quill('#editor', {
    theme: 'snow',
    modules: {
      toolbar: {
        container: '#toolbar', // Use your custom toolbar
        handlers: {
          // Add a custom handler for 'custom-bullet'
          'custom-bullet': function () {
            const range = this.quill.getSelection(); // Get current selection
            if (range) {
              const currentFormat = this.quill.getFormat(range.index, range.length);
              if (currentFormat['custom-bullet']) {
                this.quill.format('custom-bullet', false); // Remove the format
                console.log('Custom bullet removed.');
              } else {
                this.quill.format('custom-bullet', '◾'); // Apply the format
                console.log('Custom bullet applied.');
              }
            } else {
              console.error('No text selected.');
            }
          },
        },
      },
      'emoji-toolbar': true, // Emoji picker support
      history: {
        delay: 1000,
        maxStack: 100,
        userOnly: true,
      },
    },
    formats: [
      'bold', 'italic', 'underline', 'header', 'emoji', 'custom-bullet', // Include custom-bullet in formats
    ],
  });

  console.log('Quill editor initialized.');

  // ======= Add Toolbar Handler for Custom Bullet =======
  const toolbar = quill.getModule('toolbar');

  const applyCustomFormat = (format) => {
    const range = quill.getSelection();
    if (range) {
      const currentFormat = quill.getFormat(range.index, range.length);
      quill.format(format, !currentFormat[format]); // Toggle the format
      console.log(`${format} format toggled.`);
    } else {
      console.error('No text selected.');
    }
  };

  toolbar.addHandler('bold', () => applyCustomFormat('bold'));
  toolbar.addHandler('italic', () => applyCustomFormat('italic'));
  toolbar.addHandler('underline', () => applyCustomFormat('underline'));


  toolbar.addHandler('custom-bullet', function () {
    const range = this.quill.getSelection();
    if (range) {
      const currentFormat = this.quill.getFormat(range.index, range.length);
      if (currentFormat['custom-bullet']) {
        this.quill.format('custom-bullet', false); // Remove custom bullet
        console.log('Custom bullet removed.');
      } else {
        this.quill.format('custom-bullet', '◾'); // Apply custom bullet
        console.log('Custom bullet applied.');
      }
    } else {
      console.error('No text selected.');
    }
  });

  console.log('Custom bullet list handler registered.');

// Add Click Event Listener for Manual Use (Optional)

if (emojiBulletButton) {
  emojiBulletButton.addEventListener('click', () => {
    const range = quill.getSelection();
    if (range) {
      const currentFormat = quill.getFormat(range.index, range.length);
      if (currentFormat['custom-bullet']) {
        quill.format('custom-bullet', false); // Remove the format
        console.log('Custom bullet removed.');
      } else {
        quill.format('custom-bullet', '◾'); // Apply the format
        console.log('Custom bullet applied.');
      }
    } else {
      console.error('No text selected.');
    }
  });
} else {
  console.error('Custom bullet button not found in toolbar.');
}

console.log('Custom bullet list initialized.');

// ======= Add Event Listener for Toolbar Undo/Redo Buttons =======
document.getElementById('toolbar').addEventListener('click', (e) => {
    if (e.target.closest('.ql-undo')) {
      quill.history.undo();
    } else if (e.target.closest('.ql-redo')) {
      quill.history.redo();
    }
});

  // Set spellcheck attribute to true on the editable area
quill.on('editor-change', () => {
  const editorElement = document.querySelector('.ql-editor');
  if (editorElement) {
    editorElement.setAttribute('spellcheck', 'true');
  }
});

// Initial setting in case the editor-change event hasn't fired yet
const editorElement = document.querySelector('.ql-editor');
if (editorElement) {
  editorElement.setAttribute('spellcheck', 'true');
}

  // ======= Autosave Draft Periodically =======
  setInterval(() => {
    if (quill && postTitleInput) {
      const draft = {
        title: postTitleInput.value.trim(),
        content: quill.root.innerHTML.trim(),
        lastSaved: new Date().toLocaleTimeString(),
      };
      localStorage.setItem('draft', JSON.stringify(draft));
      console.log(`Autosaved at ${draft.lastSaved}`);
    }
  }, 15000);  // Autosave every 15 seconds

  // ======= Create New Post Button in Editor =======
  const createNewPostEditorButton = document.getElementById('create-new-post-editor');

  if (createNewPostEditorButton) {
    createNewPostEditorButton.addEventListener('click', () => {
      if (quill && postTitleInput) {
        quill.setContents([]); // Clear the editor for a new post
        postTitleInput.value = ''; // Clear the title input
        closeModal(savedPostsModal);
        showToast('Ready to create a new post.');
      } else {
        showToast('Editor is not initialized.');
        console.error('Quill or Post Title Input is not available.');
      }
    });
  }

  if (savePostButton) {
    savePostButton.addEventListener('click', async () => {
      try {
        const user = await window.api.fetchUserData();
        if (!user || (!user.linkedin_id && !user.id)) {
          showToast('Unable to fetch user information. Please log in again.');
          return;
        }
  
        const post = {
          id: editingPostId, // Include the editing post ID (null for new posts)
          title: postTitleInput.value.trim(),
          content: quill.root.innerHTML.trim(),
          status: 'draft',
          linkedin_id: user.linkedin_id || null, // Use linkedin_id if available
          user_id: user.id || null, // Fallback to user_id for local-only users
        };
  
        const result = await window.api.savePost(post);
        if (result.success) {
          showToast('Post saved successfully!');
          // Clear the editor and inputs
          postTitleInput.value = '';
          quill.setContents([]);
          editingPostId = null; // Reset editing ID after save
        } else {
          showToast('Failed to save post.');
        }
      } catch (error) {
        console.error('Error saving post:', error.message);
        showToast('Failed to save post.');
      }
    });
  }  

  postToLinkedInButton.addEventListener('click', async () => {
  // 1) Validate inputs
  const title = postTitleInput.value.trim();
  const delta = quill.getContents();

  if (!title || !delta) {
    showToast('Please provide a title and content before posting to LinkedIn.');
    return;
  }

  // 2) Format the content
  const formattedContent = await window.api.formatLinkedInText(delta);

  // 3) Fetch the current user (to get linkedin_id, etc.)
  const user = await window.api.fetchUserData();
  if (!user || !user.linkedin_id) {
    showToast('User not authenticated. Please log in with LinkedIn.');
    return;
  }

  // 4) If we have no 'editingPostId', then we create a new local post. 
  //    Otherwise, we update the existing one.
  let localPostId = editingPostId; // from your renderer code
  let savePostResult;

  try {
    // Build the post object we’ll send to the DB
    const postData = {
      id: localPostId, // null or undefined => new record
      title,
      content: formattedContent,
      status: 'draft',           // for now
      linkedin_id: user.linkedin_id
    };

    // Call the "savePost" IPC
    savePostResult = await window.api.savePost(postData);

    if (savePostResult.success) {
      // If it's a new post, set localPostId to the newly created record
      localPostId = savePostResult.postId;
      // If we had no editingPostId, now we store it in the renderer so we can keep track
      if (!editingPostId) {
        editingPostId = localPostId;
      }
    } else {
      showToast('Failed to save post in the database.');
      return;
    }
  } catch (error) {
    console.error('Error saving post before LinkedIn posting:', error);
    showToast('An error occurred while saving the post.');
    return;
  }

  // 5) Now that the local DB record is saved, call postToLinkedIn 
  //    with the local ID as well
  console.log('Saved post in DB. Now posting to LinkedIn with local ID:', localPostId);
  window.api.postToLinkedIn({
    postId: localPostId,         // <--- The local post ID
    title, 
    body: formattedContent
  });
});

  
  // Listen for success or error feedback from main process
  window.api.on('post-success', (message) => {
    showToast(`Success: ${message}`);
  });
  
  window.api.on('post-error', (message) => {
    showToast(`Error: ${message}`);
  });

  // Fetch suggestion and display in suggestion box
const fetchSuggestion = async (isManual = false) => {
  if (isModalOpen) return;

  const userInput = quill.getText().trim();

  // If manual request but editor is empty, show a toast and exit
  if (isManual && userInput.length === 0) {
    showToast('Please enter some text in the editor.');
    return;
  }

  // Check if in cooldown period
  const now = Date.now();
  if (!isManual && (suggestionCooldown || now - lastSuggestionTime < SUGGESTION_COOLDOWN_DURATION)) {
    return;
  }

  try {
    if (isManual) {
      // Show loading indicator on the button (optional)
      manualSuggestButton.disabled = true;
      manualSuggestButton.classList.add('loading');
    }

    // Get user ID (fetch dynamically if needed)
    const userId = await window.api.fetchUserData().then((user) => user.id); // Replace with correct user-fetching logic

    if (!userId) {
      throw new Error('User ID is not available.');
    }

    console.log('Fetching AI suggestions for user ID:', userId);

    // Fetch the suggestion
    const suggestion = await window.api.getAISuggestions({ prompt: userInput, userId });
    console.log('Fetched suggestion:', suggestion);

    if (suggestion) {
      suggestionText.innerText = suggestion;
      showSuggestionBox();
      lastSuggestionTime = now;
      suggestionCooldown = true;
      // Reset cooldown after duration
      setTimeout(() => {
        suggestionCooldown = false;
      }, SUGGESTION_COOLDOWN_DURATION);
    } else {
      suggestionBox.classList.remove('show');
      if (isManual) showToast('No suggestion available at this time.');
    }
  } catch (error) {
    console.error('Error fetching AI suggestion:', error);
    suggestionBox.classList.remove('show');
    if (isManual) showToast('An error occurred while fetching the suggestion.');
  } finally {
    if (isManual) {
      manualSuggestButton.disabled = false;
      manualSuggestButton.classList.remove('loading');
    }
  }
};

const showSuggestionBox = () => {
  const range = quill.getSelection();
  if (!range) return;

  const bounds = quill.getBounds(range.index);
  const containerRect = quill.container.getBoundingClientRect();

  // Temporarily make the suggestion box visible to get accurate dimensions
  suggestionBox.style.visibility = 'hidden';
  suggestionBox.style.display = 'block';
  const suggestionBoxRect = suggestionBox.getBoundingClientRect();
  suggestionBox.style.visibility = '';
  suggestionBox.style.display = '';

  let top, left;
  const fixedHeaderHeight = 60; // Adjust based on header height
  const fixedFooterHeight = 0; // Adjust if footer exists

  const cursorTop = containerRect.top + bounds.bottom;
  const cursorLeft = containerRect.left + bounds.left;

  const availableSpaceBelow = window.innerHeight - cursorTop - fixedFooterHeight - 10;
  const availableSpaceAbove = cursorTop - fixedHeaderHeight - 10;

  if (window.innerWidth <= 600) {
    // Mobile: Use fixed positioning
    suggestionBox.style.top = null;
    suggestionBox.style.left = null;
    suggestionBox.style.transform = null;
    suggestionBox.style.maxHeight = `${window.innerHeight - fixedHeaderHeight - fixedFooterHeight - 20}px`;
    suggestionBox.style.overflowY = 'auto';
  } else {
    // Calculate dynamic positioning for larger screens
    if (availableSpaceBelow >= suggestionBoxRect.height || availableSpaceBelow >= availableSpaceAbove) {
      // Position below the cursor
      top = cursorTop + 5;
      suggestionBox.style.maxHeight = `${availableSpaceBelow}px`;
    } else {
      // Position above the cursor
      top = cursorTop - suggestionBoxRect.height - bounds.height - 5;
      suggestionBox.style.maxHeight = `${availableSpaceAbove}px`;
    }

    left = cursorLeft + 5;

    // Adjust if suggestion box goes beyond the viewport width
    if (left + suggestionBoxRect.width > window.innerWidth) {
      left = window.innerWidth - suggestionBoxRect.width - 10;
    }

    suggestionBox.style.top = `${top}px`;
    suggestionBox.style.left = `${left}px`;
    suggestionBox.style.overflowY = 'auto';
  }

  suggestionBox.classList.add('show');
};

// Event listener for the manual suggest button
if (manualSuggestButton) {
  manualSuggestButton.addEventListener('click', () => {
    // Fetch suggestion manually
    fetchSuggestion(true);
  });
}

// Quill Editor will wait for a set of keyword variables or TYPING_PAUSE_DURATION to surface a suggestion
quill.on('text-change', debounce(() => {
  const userInput = quill.getText().toLowerCase();

  // Check if any of the keywords are present
  const keywordDetected = suggestionKeywords.some(keyword => userInput.includes(keyword));

  if (keywordDetected) {
    fetchSuggestion(false); // Trigger suggestion automatically
  }
}, TYPING_PAUSE_DURATION));

if (acceptButton && rejectButton) {
  acceptButton.addEventListener('click', async () => {
    const suggestion = suggestionText.innerText;
    quill.insertText(quill.getLength(), ` ${suggestion}`);
    suggestionBox.classList.remove('show');
    await window.api.sendFeedback('accepted', suggestion);

    // Update last suggestion time and set cooldown
    lastSuggestionTime = Date.now();
    suggestionCooldown = true;
    setTimeout(() => {
      suggestionCooldown = false;
    }, SUGGESTION_COOLDOWN_DURATION);
  });

  rejectButton.addEventListener('click', async () => {
    const suggestion = suggestionText.innerText;
    suggestionBox.classList.remove('show');
    await window.api.sendFeedback('rejected', suggestion);

    // Update last suggestion time and set cooldown
    lastSuggestionTime = Date.now();
    suggestionCooldown = true;
    setTimeout(() => {
      suggestionCooldown = false;
    }, SUGGESTION_COOLDOWN_DURATION / 2); // Shorter cooldown after rejection
  });
}

if (closeSuggestionBoxButton) {
  closeSuggestionBoxButton.addEventListener('click', async () => {
    suggestionBox.classList.remove('show');
    await window.api.sendFeedback('closed', suggestionText.innerText);

    // Update last suggestion time and set cooldown
    lastSuggestionTime = Date.now();
    suggestionCooldown = true;
    setTimeout(() => {
      suggestionCooldown = false;
    }, SUGGESTION_COOLDOWN_DURATION / 2); // Shorter cooldown
  });
}

  // ======= Distraction-Free Mode =======
  const toggleDistractionFreeButton = document.getElementById('toggle-distraction-free');

  if (toggleDistractionFreeButton) {
    toggleDistractionFreeButton.addEventListener('click', () => {
      const isDistractionFree = toggleElement(document.body, 'distraction-free');
      toggleDistractionFreeButton.innerHTML = isDistractionFree 
        ? '<i class="fas fa-eye"></i> Exit Focus Mode' 
        : '<i class="fas fa-eye-slash"></i> Focus Mode';
    });
  }

  // ======= Save Draft =======
  const saveDraftButton = document.createElement('button');
  saveDraftButton.id = 'save-draft';
  saveDraftButton.innerText = 'Save Draft';
  saveDraftButton.classList.add('editor-action-button', 'save-draft-button');

  saveDraftButton.addEventListener('click', () => {
    if (quill && postTitleInput) {
      const draft = {
        title: postTitleInput.value.trim(),
        content: quill.root.innerHTML.trim(),
      };
      localStorage.setItem('draft', JSON.stringify(draft));
      showToast('Draft saved successfully!');
    } else {
      showToast('Editor is not initialized.');
      console.error('Quill or Post Title Input is not available.');
    }
  });

  const savedDraft = localStorage.getItem('draft');
  if (savedDraft && quill && postTitleInput) {
    const { title, content } = JSON.parse(savedDraft);
    postTitleInput.value = title || '';
    quill.root.innerHTML = content || '';
  }

  // ======= Accessibility Enhancements =======
  document.querySelectorAll('.modal').forEach((modal) => {
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal(modal);
    });
  });

  } else {
    console.error('Quill is not available.');
  }
  
});

