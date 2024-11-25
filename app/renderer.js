// ======= Initialize the Renderer Process =======
document.addEventListener('DOMContentLoaded', () => {
  console.log('Renderer process loaded.');

  let isModalOpen = false;
  let emojiPicker = null;

  // ======= Utility Functions =======
  /**
   * Debounce function: Delays the execution of the given function until after the specified delay.
   * @param {Function} func - The function to debounce.
   * @param {number} delay - The delay in milliseconds.
   * @returns {Function} - The debounced function.
   */
  const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), delay);
    };
  };

  /**
   * Toggles a class on an element.
   * @param {HTMLElement} element - The element to toggle the class on.
   * @param {string} className - The class to toggle.
   * @returns {boolean} - True if the class is added, false if removed.
   */
  function toggleElement(element, className) {
    element.classList.toggle(className);
    return element.classList.contains(className);
  }

  const applyTheme = (theme) => {
    document.body.classList.toggle('dark-theme', theme === 'dark');
    console.log(`${theme.charAt(0).toUpperCase() + theme.slice(1)} theme applied.`);
  };

  /**
   * Shows a toast notification.
   * @param {string} message - The message to display in the toast.
   */
  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);

    console.log('Toast shown:', message);
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

      // Toggle the 'sidebar-collapsed' class on the body
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
  const quill = new Quill('#editor', {
    theme: 'snow',
    modules: {
      toolbar: {
        container: '#toolbar',
      },
      'emoji-toolbar': true,
      'emoji-shortname': true,
      'emoji-textarea': false,
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
    const content = quill.root.innerHTML;
    localStorage.setItem('draft', content);
    console.log('Autosave draft.');
  }, 15000);  // Autosave every 10 seconds

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
  acceptButton.addEventListener('click', () => {
    quill.insertText(quill.getLength(), ` ${suggestionText.innerText}`);
    suggestionBox.classList.remove('show');
  });

  rejectButton.addEventListener('click', () => {
    suggestionBox.classList.remove('show');
  });
}

  // ======= Distraction-Free Mode =======
  const toggleDistractionFreeButton = document.getElementById('toggle-distraction-free');

  if (toggleDistractionFreeButton) {
    toggleDistractionFreeButton.addEventListener('click', () => {
      const isDistractionFree = toggleElement(document.body, 'distraction-free');
      toggleDistractionFreeButton.innerText = isDistractionFree ? 'Exit Focus Mode' : 'Focus Mode';
    });
  }

  // ======= Save Draft =======
  const saveDraftButton = document.createElement('button');
  saveDraftButton.id = 'save-draft';
  saveDraftButton.innerText = 'Save Draft';
  saveDraftButton.classList.add('toggle-button');
  document.querySelector('#editor-container').appendChild(saveDraftButton);

  saveDraftButton.addEventListener('click', () => {
    localStorage.setItem('draft', quill.root.innerHTML);
    showToast('Draft saved successfully!');
  });

  const savedDraft = localStorage.getItem('draft');
  if (savedDraft) quill.root.innerHTML = savedDraft;

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
