// ======= Initialize the Renderer Process =======
document.addEventListener('DOMContentLoaded', () => {
  console.log('Renderer process loaded.');

  let isModalOpen = false;
  let quill;
  let selectedPost = null;
  let postIdToDelete = null;
  let lastSuggestionTime = 0;
  let suggestionCooldown = false;

    // ======= Sidebar Toggle =======
    const toggleMenuButton = document.getElementById('toggle-menu');
    const sidebar = document.getElementById('sidebar');

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

    // ======= Settings Modal =======
    const settingsButton = document.getElementById('settings');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsButton = document.getElementById('close-settings');
    const settingsForm = document.getElementById('settings-form');

    // ======= Saved Posts Modal =======
    const savedPostsModal = document.getElementById('saved-posts-modal');
    const openSavedPostsButton = document.getElementById('open-saved-posts');
    const closeSavedPostsButton = savedPostsModal.querySelector('.close-button');
    const savedPostsList = document.getElementById('saved-posts-list');
    const searchPostsInput = document.getElementById('search-posts');
    const searchButton = document.getElementById('search-button');
    const editPostButton = document.getElementById('edit-post');
    const schedulePostButton = document.getElementById('schedule-post');
    const deletePostButton = document.getElementById('delete-post');
    const deleteConfirmationModal = document.getElementById('delete-confirmation-modal');
    const confirmDeleteButton = document.getElementById('confirm-delete');
    const cancelDeleteButton = document.getElementById('cancel-delete');
    const closeDeleteConfirmationButton = document.getElementById('close-delete-confirmation');

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

  // Listener for 'post-published' event
  window.api.onPostPublished((event, postId) => {
    showToast(`Post ID ${postId} has been published to LinkedIn.`);
    loadSavedPosts(); // Refresh the saved posts list
  });


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
  
// Schedule Post Button Click Event
schedulePostButton.addEventListener('click', () => {
  if (selectedPost) {
    schedulePost(selectedPost);
    // Optionally keep the modal open or close it based on your preference

    // Reset selection and disable buttons
    resetSelection();
  } else {
    showToast('Please select a post to schedule.');
  }
});

// Delete Post Button Click Event
deletePostButton.addEventListener('click', () => {
  if (selectedPost) {
    openDeleteConfirmation(selectedPost.id);
  } else {
    showToast('Please select a post to delete.');
  }
});

// ======= Function to Open Delete Confirmation Modal =======
const openDeleteConfirmation = (postId) => {
  if (!deleteConfirmationModal) return;

  postIdToDelete = postId; // Store the post ID to delete

  // Open the modal
  openModal(deleteConfirmationModal);
};


// Event Listener for Confirm Delete Button
if (confirmDeleteButton) {
  confirmDeleteButton.addEventListener('click', async () => {
    if (postIdToDelete !== null) {
      try {
        const result = await window.api.deletePost(postIdToDelete);
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

      const suggestion = await window.api.getAISuggestions(userInput);
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
    if (range) {
      const bounds = quill.getBounds(range.index);
      const containerRect = quill.container.getBoundingClientRect();
  
      // Temporarily make the suggestion box visible to get accurate dimensions
      suggestionBox.style.visibility = 'hidden';
      suggestionBox.style.display = 'block';
      const suggestionBoxRect = suggestionBox.getBoundingClientRect();
      suggestionBox.style.visibility = '';
      suggestionBox.style.display = '';
  
      let top, left;
  
      if (window.innerWidth <= 600) {
        // Use fixed positioning for small screens
        suggestionBox.style.top = null;
        suggestionBox.style.left = null;
        suggestionBox.style.transform = null;
      } else {
        // Position relative to viewport since position is fixed
        const cursorTop = containerRect.top + bounds.bottom;
        const cursorLeft = containerRect.left + bounds.left;
  
        // Preferred position: below and to the right of the cursor
        top = cursorTop + 5; // 5px below the cursor
        left = cursorLeft + 5; // 5px to the right of the cursor
  
        // Adjust if the suggestion box goes beyond the viewport
        if (left + suggestionBoxRect.width > window.innerWidth) {
          left = window.innerWidth - suggestionBoxRect.width - 5;
        }
  
        if (top + suggestionBoxRect.height > window.innerHeight) {
          // Try to position above the cursor
          if (cursorTop - suggestionBoxRect.height - 5 > 0) {
            top = cursorTop - suggestionBoxRect.height - bounds.height - 5;
          } else {
            // If not enough space above, adjust height of suggestion box
            top = 5;
            suggestionBox.style.maxHeight = `${window.innerHeight - top - 10}px`;
            suggestionBox.style.overflowY = 'auto';
          }
        }
  
        suggestionBox.style.top = `${top}px`;
        suggestionBox.style.left = `${left}px`;
      }
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
  //document.querySelector('#editor-container').appendChild(saveDraftButton);

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
