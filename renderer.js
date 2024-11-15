// renderer.js

const backendURL = 'http://localhost:3000';

// Wait for the DOM to fully load before accessing elements
document.addEventListener('DOMContentLoaded', () => {
  console.log('Renderer process loaded.');

  let isModalOpen = false; // Flag to track if any modal is open

  // ======= Sidebar Toggle Functionality =======
  const toggleMenuButton = document.getElementById('toggle-menu');
  const sidebar = document.getElementById('sidebar');

  if (toggleMenuButton && sidebar) {
    toggleMenuButton.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      const icon = sidebar.classList.contains('collapsed')
        ? '<i class="fas fa-chevron-right"></i>'
        : '<i class="fas fa-chevron-left"></i>';
      toggleMenuButton.innerHTML = icon;
      console.log('Sidebar toggled:', sidebar.classList.contains('collapsed') ? 'Collapsed' : 'Expanded');
    });
  } else {
    console.error('Toggle Menu Button or Sidebar not found.');
  }

  // ======= Notifications Dropdown Functionality =======
  const notificationsButton = document.getElementById('notifications');
  const notificationsDropdown = document.getElementById('notifications-dropdown');
  const notificationCount = document.getElementById('notification-count');
  const notificationsList = document.getElementById('notifications-list');

  if (notificationsButton && notificationsDropdown && notificationCount && notificationsList) {
    notificationsButton.addEventListener('click', () => {
      const isExpanded = notificationsButton.getAttribute('aria-expanded') === 'true';
      notificationsButton.setAttribute('aria-expanded', !isExpanded);
      notificationsDropdown.classList.toggle('hidden');
      console.log('Notifications Dropdown toggled:', notificationsDropdown.classList.contains('hidden') ? 'Hidden' : 'Visible');
    });
  } else {
    console.error('Notifications elements not found.');
  }

  // ======= Fetch Notifications from Backend =======
  async function fetchNotifications() {
    try {
      const response = await fetch(`${backendURL}/notifications`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const notifications = await response.json(); // notifications is an array
      console.log('Fetched Notifications:', notifications);
      displayNotifications(notifications); // Pass the array directly
    } catch (error) {
      console.error('Error fetching notifications:', error);
      notificationsList.innerHTML = '<li>Failed to load notifications. Please try again later.</li>';
      notificationCount.classList.add('hidden');
    }
  }

  function displayNotifications(notifications) {
    notificationsList.innerHTML = '';
    if (!notifications || notifications.length === 0) {
      notificationCount.classList.add('hidden');
      const li = document.createElement('li');
      li.textContent = 'No new notifications.';
      notificationsList.appendChild(li);
      return;
    }

    notificationCount.textContent = notifications.length;
    notificationCount.classList.remove('hidden');

    notifications.forEach(notification => {
      const li = document.createElement('li');
      li.textContent = notification.message;
      notificationsList.appendChild(li);
    });
  }

  // Initial Fetch
  fetchNotifications();

  // ======= Settings Modal Functionality =======
  const settingsButton = document.getElementById('settings');
  const settingsModal = document.getElementById('settings-modal');
  const closeSettingsButton = document.getElementById('close-settings');
  const settingsForm = document.getElementById('settings-form');

  if (settingsButton && settingsModal && closeSettingsButton && settingsForm) {
    settingsButton.addEventListener('click', () => {
      openModal(settingsModal);
      console.log('Settings Modal opened.');
    });

    closeSettingsButton.addEventListener('click', () => {
      closeModal(settingsModal);
      console.log('Settings Modal closed.');
    });

    settingsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const theme = document.getElementById('theme-select').value;
      applyTheme(theme);
      closeModal(settingsModal);
      console.log(`Theme applied: ${theme}`);
    });

    // Ensure modal closes when clicking outside its content
    settingsModal.addEventListener('click', (event) => {
      if (event.target === settingsModal) {
        closeModal(settingsModal);
        console.log('Settings Modal closed by clicking outside.');
      }
    });
  } else {
    console.error('Settings elements not found.');
  }

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
      console.log('Dark theme applied.');
    } else {
      document.body.classList.remove('dark-theme');
      console.log('Light theme applied.');
    }
  }

  // ======= Modal Control Functions =======
  function openModal(modal) {
    if (modal) {
      modal.style.display = "flex";
      document.body.classList.add('modal-open');
      isModalOpen = true;
      console.log(`Modal opened: ${modal.id}`);
    }
  }

  function closeModal(modal) {
    if (modal) {
      //modal.classList.add('hidden');
      modal.style.display = "none";
      document.body.classList.remove('modal-open');
      isModalOpen = false;
      console.log(`Modal closed: ${modal.id}`);
    }
  }

  // ======= Profile Modal Functionality =======
  const profileButton = document.getElementById('profile');
  const profileModal = document.getElementById('profile-modal');
  const closeProfileButton = document.getElementById('close-profile');
  const logoutButton = document.getElementById('logout-button');
  const usernameDisplay = document.getElementById('username');
  const profilePicture = document.getElementById('profile-picture');

  if (profileButton && profileModal && closeProfileButton && logoutButton && usernameDisplay && profilePicture) {
    profileButton.addEventListener('click', () => {
      openModal(profileModal);
      console.log('Profile Modal opened.');
    });

    closeProfileButton.addEventListener('click', () => {
      closeModal(profileModal);
      console.log('Profile Modal closed.');
    });

    profileModal.addEventListener('click', (event) => {
      if (event.target === profileModal) {
        closeModal(profileModal);
        console.log('Profile Modal closed by clicking outside.');
      }
    });

    logoutButton.addEventListener('click', () => {
      console.log('Logout button clicked.');
      // Implement logout functionality
      window.location.href = '/logout';
    });
  } else {
    console.error('Profile elements not found.');
  }

  // ======= Optional: Close Modal When Clicking Outside the Modal Content =======
  window.addEventListener('click', (event) => {
    if (event.target === profileModal) {
      closeModal(profileModal);
      console.log('Profile Modal closed by clicking outside.');
    }
    if (event.target === settingsModal) {
      closeModal(settingsModal);
      console.log('Settings Modal closed by clicking outside.');
    }
  });

  // ======= Fetch User Data from Backend =======
  async function fetchUserData() {
    try {
      const response = await fetch(`${backendURL}/users/1`); // Fetching user with id=1
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const user = await response.json(); // user is the object directly
      console.log('Fetched User Data:', user);
      displayUserData(user); // Pass the user object directly
    } catch (error) {
      console.error('Error fetching user data:', error);
      usernameDisplay.textContent = 'Guest';
      profilePicture.src = 'assets/default-profile.png';
    }
  }

  function displayUserData(user) {
    usernameDisplay.textContent = user.username;
    profilePicture.src = user.profilePicture || 'assets/default-profile.png';
    console.log('User Data Displayed:', user.username);
  }

  // Initial Fetch
  fetchUserData();

  // ======= Accessibility Enhancements =======
  // Ensure modals are focus-trapped
  const modals = document.querySelectorAll('.modal');

  modals.forEach(modal => {
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        // Implement focus trapping logic
        const focusableElements = modal.querySelectorAll('a[href], button, textarea, input, select');
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) { // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else { // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
      if (e.key === 'Escape') {
        closeModal(modal);
        console.log(`Modal closed via Escape key: ${modal.id}`);
      }
    });

    // Optional: Close modal when clicking outside the modal content
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        closeModal(modal);
        console.log(`Modal closed by clicking outside: ${modal.id}`);
      }
    });
  });

  // ======= Initialize Quill Editor =======
  const quill = new Quill('#editor', {
    theme: 'snow',
    modules: {
      toolbar: [
        ['bold', 'italic', 'underline'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link', 'image'],
        ['clean'],
      ],
    },
  });

  // ======= Distraction-Free Mode Toggle =======
  const toggleDistractionFreeButton = document.getElementById('toggle-distraction-free');

  if (toggleDistractionFreeButton) {
    toggleDistractionFreeButton.addEventListener('click', () => {
      document.body.classList.toggle('distraction-free');

      // Update the button text based on mode
      const isDistractionFree = document.body.classList.contains('distraction-free');
      toggleDistractionFreeButton.innerText = isDistractionFree
        ? 'Exit Focus Mode'
        : 'Focus Mode';
      console.log(`Distraction-Free Mode: ${isDistractionFree ? 'Enabled' : 'Disabled'}`);
    });
  } else {
    console.error('Distraction-Free Toggle Button not found.');
  }

  // ======= AI Suggestions Integration =======
  // Suggestion Box Elements
  const suggestionBox = document.getElementById('suggestion-box');
  const suggestionText = document.getElementById('suggestion-text');
  const acceptButton = document.getElementById('accept-suggestion');
  const rejectButton = document.getElementById('reject-suggestion');

  if (suggestionBox && suggestionText && acceptButton && rejectButton) {
    // Debounce Function to Limit API Calls
    function debounce(func, delay) {
      let debounceTimer;
      return function () {
        const context = this;
        const args = arguments;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(context, args), delay);
      };
    }

    // Fetch AI Suggestion (Debounced)
    const fetchSuggestion = debounce(async () => {
      if (isModalOpen) {
        // Do not fetch suggestions if a modal is open
        hideSuggestionBox();
        return;
      }

      const userInput = quill.getText().trim();

      // Trigger AI after 100 words
      const wordCount = userInput.split(/\s+/).length;
      if (wordCount < 100) {
        hideSuggestionBox();
        return;
      }

      try {
        // Request AI suggestions via IPC
        const suggestion = await window.api.getAISuggestions(userInput);
        if (suggestion) {
          displayAISuggestion(suggestion);
        }
      } catch (error) {
        if (error.message.includes('quota')) {
          showToast('API quota exceeded. Please check your OpenAI billing plan.');
        } else {
          console.error('Error fetching AI suggestion:', error);
          hideSuggestionBox();
        }
      }
    }, 5000); // 5-second debounce to prevent excessive API calls

    // Listen to Text Changes in Quill
    quill.on('text-change', fetchSuggestion);

    // Display AI Suggestion in the Suggestion Box
    function displayAISuggestion(suggestion) {
      suggestionText.innerText = suggestion;
      suggestionBox.classList.remove('hidden');
      console.log('AI Suggestion Displayed:', suggestion);
    }

    // Hide the Suggestion Box
    function hideSuggestionBox() {
      suggestionBox.classList.add('hidden');
      suggestionText.innerText = '';
      console.log('AI Suggestion Hidden.');
    }

    // Accept Suggestion: Insert the AI suggestion into the editor
    acceptButton.addEventListener('click', () => {
      const position = quill.getSelection()?.index || quill.getLength();
      quill.insertText(position, ` ${suggestionText.innerText}`);
      hideSuggestionBox();
      console.log('AI Suggestion Accepted.');
    });

    // Reject Suggestion: Simply hide the suggestion box
    rejectButton.addEventListener('click', () => {
      hideSuggestionBox();
      console.log('AI Suggestion Rejected.');
    });
  } else {
    console.error('AI Suggestion elements not found.');
  }

  // ======= Tooltip for Buttons =======
  document.querySelectorAll('.header-icons button, #toggle-distraction-free').forEach(button => {
    button.addEventListener('mouseover', () => {
      button.setAttribute('title', button.ariaLabel);
      console.log(`Tooltip set for: ${button.id}`);
    });
  });

  // ======= Save Draft Button Integration =======
  const saveDraftButton = document.createElement('button');
  saveDraftButton.id = 'save-draft';
  saveDraftButton.innerText = 'Save Draft';
  saveDraftButton.classList.add('toggle-button');
  document.querySelector('#editor-container').appendChild(saveDraftButton);

  if (saveDraftButton) {
    saveDraftButton.addEventListener('click', () => {
      const content = quill.root.innerHTML;
      localStorage.setItem('draft', content);
      showToast('Draft saved successfully!');
      console.log('Draft saved.');
    });
  } else {
    console.error('Save Draft Button not found.');
  }

  // Load draft if available
  const savedDraft = localStorage.getItem('draft');
  if (savedDraft) {
    quill.root.innerHTML = savedDraft;
    console.log('Draft loaded from localStorage.');
  }

  // ======= Toast Notification for Actions =======
  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    document.body.appendChild(toast);

    // Show the toast
    setTimeout(() => {
      toast.classList.add('show');
    }, 100);

    // Hide and remove the toast after a few seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentElement) {
          toast.parentElement.removeChild(toast);
        }
      }, 300);
    }, 3000);
    console.log('Toast shown:', message);
  }
});
