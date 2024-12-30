// ======= Initialize the Renderer Process =======
document.addEventListener('DOMContentLoaded', () => {
  console.log('Renderer process loaded.');

  let isModalOpen = false;
  let quill;
  let selectedPost = null;
  let postIdToDelete = null;
  let lastSuggestionTime = 0;
  let suggestionCooldown = false;
  let editingPostId = null;

  // ======= Content Editor =======
  const contentEditor = document.getElementById('content-editor');

  // ======= Sidebar =======
  const toggleMenuButton = document.getElementById('toggle-menu');
  const sidebar = document.getElementById('sidebar');
  const settingsButton = document.querySelector('#sidebar .nav-item a[href="#settings"]');
  const contentCreationButton = document.querySelector('#sidebar .nav-item a[href="#content-creation"]');
  const dashboardButton = document.querySelector('#sidebar .nav-item a[href="#dashboard"]');
  const analyticsButton = document.querySelector('#sidebar .nav-item a[href="#analytics"]');
  const schedulerButton = document.querySelector('#sidebar .nav-item a[href="#scheduler"]');

  // ======= Notifications =======
  const notificationsButton = document.getElementById('notifications');
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

  const fetchNotifications = async () => {
    try {
      const notifications = await window.api.fetchNotifications();
      console.log('Fetched Notifications:', notifications);

      notificationsList.innerHTML = notifications.length
        ? notifications.map((n) => `<li>${n.message}</li>`).join('')
        : '<li>No new notifications.</li>';

      notificationCount.textContent = notifications.length || '';
      notificationCount.style.display = notifications.length ? 'inline' : 'none';
    } catch (error) {
      console.error('Error fetching notifications:', error);
      notificationsList.innerHTML = '<li>Failed to load notifications.</li>';
      notificationCount.style.display = 'none';
    }
  };

  if (notificationsButton && notificationsDropdown) {
    notificationsButton.addEventListener('click', () => {
      const expanded = toggleElement(notificationsDropdown, 'hidden');
      notificationsButton.setAttribute('aria-expanded', expanded);
    });
    fetchNotifications();
  }

  const fetchUserData = async () => {
    try {
      const user = await window.api.fetchUserData();
  
      // Update UI with user data
      document.getElementById('username').textContent = user.name;
      document.getElementById('profile-picture').src = user.profile_picture || '../../assets/default-profile.png';
  
      console.log('User data displayed:', user.name);
    } catch (error) {
      console.error('Error fetching user data:', error);
      document.getElementById('username').textContent = 'Guest';
      document.getElementById('profile-picture').src = '../../assets/default-profile.png';
    }
  };

  if (profileButton && profileModal && closeProfileButton) {
    profileButton.addEventListener('click', () => openModal(profileModal));
    closeProfileButton.addEventListener('click', () => closeModal(profileModal));
    fetchUserData();
  }

  // Handle Settings Navigation
  if (settingsButton && contentEditor && settingsPage) {
    settingsButton.addEventListener('click', () => {
      try {
        // Switch to the settings page
        contentEditor.classList.add('hidden');
        settingsPage.classList.remove('hidden');
  
        // Call loadSettings to populate the settings form
        loadSettings();
  
        console.log('Settings page displayed.');
      } catch (error) {
        console.error('Error showing settings page:', error.message);
      }
    });
  }

  // Handle Scheduler Navigation
  if (schedulerButton && contentEditor && schedulerPage) {
    schedulerButton.addEventListener('click', async () => {
      try {
        console.log('Navigating to Scheduler Page...');
        
        // Hide all other pages
        contentEditor.classList.add('hidden');
        settingsPage.classList.add('hidden');
        
        // Show the scheduler page
        schedulerPage.classList.remove('hidden');

        console.log('Scheduler Page Classes:', schedulerPage.classList);
        console.log('Content Editor Classes:', contentEditor.classList);
  
        // Initialize the scheduler
        await initializeScheduler();
      } catch (error) {
        console.error('Error navigating to Scheduler Page:', error.message);
      }
    });
  }    

  // Attach Event Listener for Form Submission
  if (saveSettingsButton) {
    saveSettingsButton.addEventListener('click', async (e) => {
      e.preventDefault();
      console.log('Save Settings button clicked.');
  
      // Map of field IDs to preference keys
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
  
      // Collect preferences dynamically
      const preferences = {};
      console.log('Language:', preferences.language);
      console.log('Data Sharing:', preferences.data_sharing);

      Object.entries(fieldMapping).forEach(([fieldId, prefKey]) => {
        const element = document.getElementById(fieldId);
        if (!element) {
          console.warn(`Element with ID "${fieldId}" not found.`);
          return;
        }
  
        const keys = prefKey.split('.');
        let target = preferences;
        keys.forEach((key, index) => {
          if (index === keys.length - 1) {
            target[key] = element.type === 'checkbox' ? element.checked : element.value.trim();
          } else {
            target[key] = target[key] || {};
            target = target[key];
          }
        });
      });
  
      console.log('Preferences to save:', preferences);
  
      try {
        const result = await window.api.saveSettings(preferences);
        console.log('Result from saveSettings IPC:', result);
  
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
    restoreDefaultsButton.addEventListener('click', () => {
      console.log('Restoring default preferences.');
  
      // Default preferences
      const defaultPreferences = {
        theme: 'light',
        tone: 'professional',
        writing_style: 'brief',
        engagement_focus: 'comments',
        vocabulary_level: 'simplified',
        content_type: 'linkedin-post',
        content_perspective: 'first-person',
        emphasis_tags: '',
        notification_settings: {
          suggestion_readiness: false,
          engagement_tips: false,
          system_updates: false,
          frequency: 'realtime',
        },
      };
  
      // Update the settings UI
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
  
      // Regenerate the AI prompt
      const promptPreviewElement = document.getElementById('prompt-preview');
      if (promptPreviewElement) {
        const aiPrompt = generateAIPrompt(defaultPreferences);
        promptPreviewElement.textContent = aiPrompt;
        console.log('Defaults restored. AI Prompt generated:', aiPrompt);
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

  // Add a handler for returning to the Content Editor
  if (contentCreationButton) {
    contentCreationButton.addEventListener('click', () => {
      // Show content editor and hide settings page
      settingsPage.classList.add('hidden');
      schedulerPage.classList.add('hidden');
      contentEditor.classList.remove('hidden');
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

  // ======= Initialize the Calendar =======
async function initializeCalendar() {
  const calendarElement = document.getElementById('calendar');
  if (!calendarElement) {
    console.error('Calendar element not found.');
    return;
  }

  const posts = await window.api.getPosts(); // Fetch posts
  const datesWithPosts = posts.map(post => post.scheduled_time?.split('T')[0]);

  flatpickr(calendarElement, {
    inline: true,
    enableTime: false,
    onChange: ([selectedDate]) => loadPostsForDay(selectedDate),
    onReady: () => updateCalendarWithPostCounts(posts), // Highlight dates
  });
} 

// ======= Load Scheduler Data =======
async function loadSchedulerData() {
  try {
    // Fetch posts and schedules separately
    const posts = await window.api.getPosts();
    const schedules = await window.api.getSchedules(); // New IPC endpoint

    // Merge schedules with their corresponding posts
    const scheduledPosts = schedules.map(schedule => {
      const post = posts.find(p => p.id === schedule.post_id);
      return { ...post, scheduled_time: schedule.scheduled_time, schedule_status: schedule.status };
    });

    const unscheduledPosts = posts.filter(post => !scheduledPosts.some(s => s.id === post.id));

    // Display posts in their respective sections
    displayPosts('#unscheduled-posts', unscheduledPosts);
    displayPosts('#upcoming-posts', scheduledPosts);

    // Update the calendar with highlights
    updateCalendarHighlights(scheduledPosts);
  } catch (error) {
    console.error('Error loading scheduler data:', error.message);
  }
}

// Update calendar highlights with scheduled posts
function updateCalendarHighlights(scheduledPosts) {
  console.log("Scheduled Posts for Highlights:", scheduledPosts);

  const calendarElement = document.getElementById('calendar');
  if (!calendarElement || !calendarElement._flatpickr) return;

  const datesWithPosts = scheduledPosts.map(post => post.scheduled_time.split('T')[0]);
  calendarElement._flatpickr.redraw();

  calendarElement._flatpickr.days.forEach(dayElement => {
    const date = dayElement.dateObj.toISOString().split('T')[0];
    if (datesWithPosts.includes(date)) {
      dayElement.classList.add('has-posts'); // Highlight
    } else {
      dayElement.classList.remove('has-posts'); // Remove highlight
    }
  });
}


function updateCalendarWithPostCounts(posts) {
  const calendarElement = document.getElementById('calendar');
  const datesWithPosts = posts
    .filter(post => post.scheduled_time) // Ensure scheduled_time exists
    .map(post => post.scheduled_time.split('T')[0]);

  if (calendarElement._flatpickr) {
    const fp = calendarElement._flatpickr;
    fp.redraw();
    fp.days.forEach(dayElement => {
      const date = dayElement.dateObj.toISOString().split('T')[0];
      if (datesWithPosts.includes(date)) {
        dayElement.setAttribute('data-has-posts', 'true');
      } else {
        dayElement.removeAttribute('data-has-posts');
      }
    });
  }
}

// ======= Initialize the Scheduler =======
async function initializeScheduler() {
    try {
      console.log('Initializing Scheduler...');
      await loadSchedulerData();
      initializeCalendar();
    } catch (error) {
      console.error('Error initializing Scheduler:', error.message);
    }
}  
  
async function populatePostSelect() {
    const postSelectEl = document.getElementById('post-select');
    if (!postSelectEl) return;
  
    try {
      const posts = await window.api.getPosts(); // Fetch all posts
      const unscheduledPosts = posts.filter(post => post.status === 'draft');
  
      postSelectEl.innerHTML = ''; // Clear existing options
      if (unscheduledPosts.length === 0) {
        const option = document.createElement('option');
        option.textContent = 'No unscheduled posts available';
        option.disabled = true;
        postSelectEl.appendChild(option);
        return;
      }
  
      unscheduledPosts.forEach(post => {
        const option = document.createElement('option');
        option.value = post.id;
        option.textContent = post.title || `Post #${post.id}`;
        postSelectEl.appendChild(option);
      });
    } catch (error) {
      console.error('Error populating post select:', error.message);
      showToast('Failed to load unscheduled posts.');
    }
}  

// Load posts for a selected date
function loadPostsForDay(selectedDate) {
  const formattedDate = selectedDate.toISOString().split('T')[0];
  document.getElementById('selected-date').textContent = formattedDate;

  window.api.getSchedules()
    .then(schedules => schedules.filter(schedule => schedule.scheduled_time.startsWith(formattedDate)))
    .then(daySchedules => {
      return Promise.all(daySchedules.map(schedule =>
        window.api.getPostById(schedule.post_id).then(post => ({
          ...post,
          scheduled_time: schedule.scheduled_time,
        }))
      ));
    })
    .then(dayPosts => {
      console.log("Posts for the selected date:", dayPosts);
      displayPosts('#day-posts', dayPosts);
    })
    .catch(error => console.error('Failed to load posts for the day:', error));
}

  // Function to display posts in a given list
  function displayPosts(listId, posts) {
    const listElement = document.querySelector(listId);
    listElement.innerHTML = ''; // Clear existing content
  
    if (posts.length === 0) {
      listElement.innerHTML = '<div>No posts found.</div>';
      return;
    }
  
    posts.forEach(post => {
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
  
      const postActions = document.createElement('div');
      postActions.className = 'post-actions';
  
      const editButton = document.createElement('button');
      editButton.className = 'btn-edit';
      editButton.innerHTML = '<i class="fas fa-edit"></i>';
      editButton.title = 'Edit';
      editButton.addEventListener('click', () => handleEditPost(post));
  
      const deleteButton = document.createElement('button');
      deleteButton.className = 'btn-delete';
      deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
      deleteButton.title = 'Delete';
      deleteButton.addEventListener('click', () => handleDeletePost(post.id));
  
      postActions.appendChild(editButton);
      postActions.appendChild(deleteButton);
  
      postCard.appendChild(postDetails);
      postCard.appendChild(postActions);
  
      listElement.appendChild(postCard);
    });
  }
  
function handleEditPost(post) {
    window.api.getPostById(post.id)
      .then(post => {
        if (!post) {
          showToast('Post not found!');
          return;
        }
        // Populate editor fields
        document.getElementById('post-title').value = post.title || '';
        const quillEditor = document.querySelector('.ql-editor');
        if (quillEditor) {
          quillEditor.innerHTML = post.content || '';
        }
  
        // Switch views
        document.getElementById('scheduler-page').classList.add('hidden');
        document.getElementById('content-editor').classList.remove('hidden');
        showToast('Post loaded into editor!');
      })
      .catch(error => console.error('Failed to load post:', error));
}
  
function handleDeletePost(postId) {
  if (!confirm('Are you sure you want to delete this post?')) return;

  // Fetch the current user's identifier
  window.api.fetchUserData()
    .then(user => {
      if (!user || (!user.linkedin_id && !user.user_id)) {
        showToast('Unable to identify the current user. Please log in again.');
        return;
      }

      const identifier = user.linkedin_id || user.user_id;

      return window.api.deletePost(postId, identifier);
    })
    .then(result => {
      if (result.success) {
        showToast('Post and associated schedule deleted successfully!');
        loadSchedulerData(); // Refresh scheduler
        loadSavedPosts(); // Refresh saved posts list
      } else {
        showToast(result.message || 'Failed to delete the post.');
      }
    })
    .catch(error => console.error('Failed to delete post:', error));
}
  
  function openEditModal(post) {
    document.getElementById('edit-post-title').value = post.title;
    document.getElementById('edit-post-content').value = post.content;
    document.getElementById('edit-post-date').value = post.scheduled_time;
    document.getElementById('edit-post-modal').classList.remove('hidden');
  }

  function closeEditModal() {
    document.getElementById('edit-post-modal').classList.add('hidden');
  }

  // ======= Load Saved Posts Function =======
  const loadSavedPosts = async () => {
    showLoader();
    try {
      const posts = await window.api.getPosts();
      displaySavedPosts(posts);
    } catch (error) {
      console.error('Error loading saved posts:', error);
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

  function initializeFlatpickr(defaultDate) {
    flatpickr('#schedule-datetime', {
      enableTime: true,
      dateFormat: 'Y-m-d H:i',
      defaultDate: defaultDate || new Date(), // Use the provided date or fallback to the current date/time
    });
  }
  
// Schedule Post Button Click Event
schedulePostButton.addEventListener('click', () => {
  if (selectedPost) {
    const modal = document.getElementById('schedule-form-modal');
    const postSelectEl = document.getElementById('post-select');

    if (postSelectEl) {
      postSelectEl.innerHTML = ''; // Clear existing options
      const option = document.createElement('option');
      option.value = selectedPost.id;
      option.textContent = selectedPost.title || `Post #${selectedPost.id}`;
      postSelectEl.appendChild(option);
      postSelectEl.value = selectedPost.id; // Pre-select the current post
    }

    // Get the selected date from the scheduler and pass it to Flatpickr
    const selectedDate = document.getElementById('selected-date')?.textContent || '';
    initializeFlatpickr(selectedDate); // Initialize Flatpickr with the selected date
    openModal(modal);
  } else {
    showToast('Please select a post to schedule.');
  }
});

if (addSchedule) {
  addSchedule.addEventListener('click', () => {
    const selectedDate = document.getElementById('selected-date').textContent;
    if (!selectedDate) {
      showToast('Please select a date first.');
      return;
    }
    populatePostSelect();
    initializeFlatpickr(selectedDate);
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

// Load settings into the UI
const loadSettings = async () => {
  try {
    const user = await window.api.getCurrentUserWithPreferences();
    console.log('Loaded user with preferences:', user);

    if (!user || !user.preferences) {
      console.warn('No preferences found for the current user.');
      return;
    }

    const { preferences } = user;

    // Map of field IDs to preference keys
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

    // Populate fields dynamically
    Object.entries(fieldMapping).forEach(([fieldId, prefKey]) => {
      const element = document.getElementById(fieldId);
      if (!element) {
        console.warn(`Element with ID "${fieldId}" not found.`);
        return;
      }

      const value = prefKey.split('.').reduce((acc, key) => acc?.[key], preferences);
      if (element.type === 'checkbox') {
        element.checked = !!value;
      } else {
        element.value = value || '';
      }
    });

    // Generate and display the AI prompt in the preview section
    const promptPreviewElement = document.getElementById('prompt-preview');
    if (promptPreviewElement) {
      const aiPrompt = generateAIPrompt(preferences);
      promptPreviewElement.textContent = aiPrompt; // Display the prompt
      console.log('AI Prompt displayed:', aiPrompt);
    } else {
      console.warn('Prompt preview element not found.');
    }
  } catch (error) {
    console.error('Error loading settings into UI:', error.message);
  }
};

// Ensure settings load when the page is ready
document.addEventListener('DOMContentLoaded', loadSettings);

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
      const user = await window.api.fetchUserData();
      if (!user || !user.linkedin_id) {
        showToast('Unable to fetch user information. Please log in again.');
        return;
      }
  
      const post = {
        id: editingPostId, // Include the editing post ID (null for new posts)
        title: postTitleInput.value.trim(),
        content: quill.root.innerHTML.trim(),
        status: 'draft',
        linkedin_id: user.linkedin_id, // Use linkedin_id to associate the post
      };
  
      try {
        const result = await window.api.savePost(post);
        if (result.success) {
          showToast('Post saved successfully!');
          // Clear the editor and inputs
          postTitleInput.value = '';
          quill.setContents([]);
          editingPostId = null; // Reset editing ID after save
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

