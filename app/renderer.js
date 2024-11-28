// ======= Initialize the Renderer Process =======
document.addEventListener('DOMContentLoaded', () => {
  console.log('Renderer process loaded.');

  let isModalOpen = false;
  let quill;

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

  const applyTheme = (theme) => {
    document.body.classList.toggle('dark-theme', theme === 'dark');
    console.log(`${theme.charAt(0).toUpperCase() + theme.slice(1)} theme applied.`);
  };

  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast show';
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
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

  // ======= Sidebar Toggle =======
  const toggleMenuButton = document.getElementById('toggle-menu');
  const sidebar = document.getElementById('sidebar');

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

  // ======= Notifications =======
  const notificationsButton = document.getElementById('notifications');
  const notificationsDropdown = document.getElementById('notifications-dropdown');
  const notificationCount = document.getElementById('notification-count');
  const notificationsList = document.getElementById('notifications-list');

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

  // ======= Profile Modal =======
  const profileButton = document.getElementById('profile');
  const profileModal = document.getElementById('profile-modal');
  const closeProfileButton = document.getElementById('close-profile');
  const usernameDisplay = document.getElementById('username');
  const profilePicture = document.getElementById('profile-picture');

  const fetchUserData = async () => {
    try {
      const user = await window.api.fetchUserData();
      usernameDisplay.textContent = user.username;
      profilePicture.src = user.profilePicture || '../../assets/default-profile.png';
      console.log('User Data Displayed:', user.username);
    } catch (error) {
      console.error('Error fetching user data:', error);
      usernameDisplay.textContent = 'Guest';
      profilePicture.src = '../../assets/default-profile.png';
    }
  };

  if (profileButton && profileModal && closeProfileButton) {
    profileButton.addEventListener('click', () => openModal(profileModal));
    closeProfileButton.addEventListener('click', () => closeModal(profileModal));
    fetchUserData();
  }

  // ======= Settings Modal =======
  const settingsButton = document.getElementById('settings');
  const settingsModal = document.getElementById('settings-modal');
  const closeSettingsButton = document.getElementById('close-settings');
  const settingsForm = document.getElementById('settings-form');

  if (settingsButton && settingsModal && closeSettingsButton && settingsForm) {
    settingsButton.addEventListener('click', () => openModal(settingsModal));
    closeSettingsButton.addEventListener('click', () => closeModal(settingsModal));

    settingsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const theme = document.getElementById('theme-select').value;
      applyTheme(theme);
      closeModal(settingsModal);
    });
  }

  // ======= Saved Posts Modal =======
  const savedPostsModal = document.getElementById('saved-posts-modal');
  const openSavedPostsButton = document.getElementById('open-saved-posts');
  const closeSavedPostsButton = savedPostsModal.querySelector('.close-button');
  const savedPostsList = document.getElementById('saved-posts-list');
  const createNewPostModalButton = document.getElementById('create-new-post-modal');
  const searchPostsInput = document.getElementById('search-posts');
  const searchButton = document.getElementById('search-button');

  if (openSavedPostsButton && savedPostsModal && closeSavedPostsButton) {
    openSavedPostsButton.addEventListener('click', () => {
      openModal(savedPostsModal);
      loadSavedPosts(); // Function to load saved posts when modal opens
    });

    closeSavedPostsButton.addEventListener('click', () => closeModal(savedPostsModal));

    window.addEventListener('click', (event) => {
      if (event.target === savedPostsModal) {
        closeModal(savedPostsModal);
      }
    });
  }

  // ======= Function to Load a Post for Editing =======
  async function loadPostForEditing(post) {
    if (quill && postTitleInput) {
      postTitleInput.value = post.title || '';
      quill.root.innerHTML = post.content;
      closeModal(savedPostsModal);
      showToast('Loaded post for editing.');
    } else {
      showToast('Editor is not initialized.');
      console.error('Quill or Post Title Input is not available.');
    }
  }

  // ======= Function to Schedule a Post =======
  const schedulePost = (post) => {
    // Create a modal for scheduling
    const schedulerModal = document.createElement('div');
    schedulerModal.classList.add('modal', 'hidden');
    schedulerModal.setAttribute('role', 'dialog');
    schedulerModal.setAttribute('aria-modal', 'true');
    schedulerModal.setAttribute('aria-labelledby', 'scheduler-title');
    schedulerModal.innerHTML = `
    <div class="modal-content">
      <span class="close-button" id="close-scheduler">&times;</span>
      <h2 id="scheduler-title">Schedule Post</h2>
      <form id="schedule-form">
        <label for="schedule-date">Select Date and Time:</label>
        <input type="text" id="schedule-date" name="schedule-date" placeholder="Select Date and Time" required>
        <button type="submit">Schedule</button>
      </form>
    </div>
  `;
    document.body.appendChild(schedulerModal);

    const closeSchedulerButton = schedulerModal.querySelector('#close-scheduler');
    const scheduleForm = schedulerModal.querySelector('#schedule-form');
    const scheduleDateInput = schedulerModal.querySelector('#schedule-date');

    // Initialize Flatpickr
    if (typeof flatpickr !== 'undefined') {
      flatpickr(scheduleDateInput, {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        minDate: "today",
      });
    } else {
      console.error('Flatpickr is not available.');
    }

    // Open the Scheduler Modal
    openModal(schedulerModal);

    // Event Listener to Close Scheduler Modal
    closeSchedulerButton.addEventListener('click', () => {
      closeModal(schedulerModal);
      schedulerModal.remove();
    });

    /// Handle Schedule Form Submission
  scheduleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const scheduledTime = scheduleDateInput.value;

    if (!scheduledTime) {
      showToast('Please select a date and time.');
      return;
    }

    // Basic validation for the scheduled time
    const isValid = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(scheduledTime);
    if (!isValid) {
      showToast('Invalid date format. Please use YYYY-MM-DD HH:MM.');
      return;
    }

    // Update the post status and scheduled_time in the database via IPC
    const updatedPost = {
      id: post.id,
      title: post.title, // Include title if available
      content: quill.root.innerHTML.trim(),
      status: 'scheduled',
      scheduled_time: scheduledTime,
    };

    showLoader(); // Show loader during the async operation
    try {
      const result = await window.api.schedulePost(updatedPost);
      if (result.success) {
        showToast('Post scheduled successfully!');
        loadSavedPosts(); // Refresh the saved posts list
      } else {
        showToast(`Failed to schedule the post: ${result.message}`);
      }
    } catch (error) {
      console.error('Error scheduling post:', error);
      showToast('An error occurred while scheduling the post.');
    } finally {
      hideLoader(); // Hide loader after the operation
      closeModal(schedulerModal);
      schedulerModal.remove();
    }
    });
  };

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

      // Action Buttons Container
      const actions = document.createElement('div');
      actions.classList.add('post-actions');

      // Edit Button
      const editButton = document.createElement('button');
      editButton.classList.add('action-button', 'edit-button');
      editButton.setAttribute('aria-label', 'Edit Post');
      editButton.innerHTML = '<i class="fas fa-edit"></i>';
      editButton.addEventListener('click', () => loadPostForEditing(post));
      actions.appendChild(editButton);

      // Schedule Button
      const scheduleButton = document.createElement('button');
      scheduleButton.classList.add('action-button', 'schedule-button');
      scheduleButton.setAttribute('aria-label', 'Schedule Post');
      scheduleButton.innerHTML = '<i class="fas fa-calendar-alt"></i>';
      scheduleButton.addEventListener('click', () => schedulePost(post));
      actions.appendChild(scheduleButton);

      // Delete Button
      const deleteButton = document.createElement('button');
      deleteButton.classList.add('action-button', 'delete-button');
      deleteButton.setAttribute('aria-label', 'Delete Post');
      deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
      deleteButton.addEventListener('click', () => openDeleteConfirmation(post.id));
      actions.appendChild(deleteButton);

      li.appendChild(actions);
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

// ======= Initialize the Quill Editor with Emoji Toolbar =======
if (typeof Quill !== 'undefined') {
  console.log('Quill is available.');

  // Check if QuillEmoji is defined
  console.log('QuillEmoji:', window.QuillEmoji);

  if (window.QuillEmoji && window.QuillEmoji.default) {
    // Access modules via window.QuillEmoji.default
    const { EmojiBlot, ToolbarEmoji, TextAreaEmoji, ShortNameEmoji } = window.QuillEmoji.default;

    // Log the modules to verify they are defined
    console.log('EmojiBlot:', EmojiBlot);
    console.log('ToolbarEmoji:', ToolbarEmoji);

    // Register the emoji modules
    Quill.register(
      {
        'formats/emoji': EmojiBlot,
        'modules/emoji-toolbar': ToolbarEmoji,
        'modules/emoji-textarea': TextAreaEmoji,
        'modules/emoji-shortname': ShortNameEmoji,
      },
      true
    );
  } else {
    console.error('QuillEmoji is not available or does not have a default export.');
  }

  // Initialize Quill with the emoji toolbar
  quill = new Quill('#editor', {
    theme: 'snow',
    modules: {
      toolbar: {
        container: '#toolbar',
      },
      'emoji-toolbar': true,
      'emoji-shortname': true,
      'emoji-textarea': false,
      history: {
        delay: 1000,
        maxStack: 100,
        userOnly: true,
      },
    },
    formats: [
      'bold', 'italic', 'underline', 'strike',
      'blockquote', 'code-block',
      'header', 'list', 'script', 'indent', 'direction',
      'size', 'color', 'background', 'font', 'align',
      'emoji', // Include 'emoji' in formats
    ],
  });

  console.log('Quill editor initialized with emoji support.');

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
      };
      localStorage.setItem('draft', JSON.stringify(draft));
      console.log('Autosave draft.');
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

  // ======= Save Post Button Functionality =======
  const savePostButton = document.getElementById('save-post');
  const postTitleInput = document.getElementById('post-title');

  if (savePostButton) {
    savePostButton.addEventListener('click', async () => {
      if (!quill || !postTitleInput) {
        showToast('Editor is not initialized.');
        console.error('Quill or Post Title Input is not available.');
        return;
      }

      const title = postTitleInput.value.trim();
      const content = quill.root.innerHTML.trim();

      if (!title) {
        showToast('Please enter a title for your post.');
        return;
      }

      if (!content) {
        showToast('Post content cannot be empty.');
        return;
      }

      // Prepare the post object
      const post = {
        title: title,
        content: content,
        status: 'draft', // You can set this to 'draft' or any other status as needed
        // Add other necessary fields if required
      };

      // Show loader or disable the button to indicate saving is in progress
      savePostButton.disabled = true;
      savePostButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

      try {
        const result = await window.api.savePost(post);
        if (result.success) {
          showToast('Post saved successfully!');
          // Optionally, clear the editor and title input
          quill.setContents([]);
          postTitleInput.value = '';
          // Refresh the saved posts list if it's open
          if (!savedPostsModal.classList.contains('hidden')) {
            loadSavedPosts();
          }
        } else {
          showToast(`Failed to save post: ${result.message}`);
          console.error('Save Post Error:', result.message);
        }
      } catch (error) {
        showToast('An error occurred while saving the post.');
        console.error('Save Post Exception:', error);
      } finally {
        // Re-enable the button and reset its text
        savePostButton.disabled = false;
        savePostButton.innerHTML = '<i class="fas fa-save"></i> Save Post';
      }
    });
  }

  const manualSuggestButton = document.getElementById('manual-suggest-button');
  const suggestionBox = document.getElementById('suggestion-box');
  const suggestionText = document.getElementById('suggestion-text');
  const acceptButton = document.getElementById('accept-suggestion');
  const rejectButton = document.getElementById('reject-suggestion');

  // Fetch suggestion and display in suggestion box
  const fetchSuggestion = async (isManual = false) => {
  if (isModalOpen) return;

  const userInput = quill.getText().trim();

  // Check if we should trigger suggestion based on word count
  if (!isManual && userInput.split(/\s+/).length < 50) return;

  // If manual request but editor is empty, show a toast and exit
  if (isManual && userInput.length === 0) {
    showToast('Please enter some text in the editor.');
    return;
  }

  try {
    if (isManual) {
      // Show loading indicator on the button (optional)
      manualSuggestButton.disabled = true;
      manualSuggestButton.classList.add('loading');
    }

    const suggestion = await window.api.getAISuggestions(userInput);
    console.log('Fetched suggestion:', suggestion);
    if (suggestion) {
      suggestionText.innerText = suggestion;
      suggestionBox.classList.add('show');
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

// Event listener for the manual suggest button
if (manualSuggestButton) {
  manualSuggestButton.addEventListener('click', () => {
    // Fetch suggestion manually
    fetchSuggestion(true);
  });
}

// Automatic suggestion on text change
quill.on('text-change', debounce(() => fetchSuggestion(false), 5000));

if (acceptButton && rejectButton) {
  acceptButton.addEventListener('click', async () => {
    const suggestion = suggestionText.innerText;
    quill.insertText(quill.getLength(), ` ${suggestion}`);
    suggestionBox.classList.remove('show');
    await window.api.sendFeedback('accepted', suggestion);
  });

  rejectButton.addEventListener('click', async () => {
    const suggestion = suggestionText.innerText;
    suggestionBox.classList.remove('show');
    await window.api.sendFeedback('rejected', suggestion);
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
  document.querySelector('#editor-container').appendChild(saveDraftButton);

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
