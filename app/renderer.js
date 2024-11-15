document.addEventListener('DOMContentLoaded', () => {
  console.log('Renderer process loaded.');

  let isModalOpen = false;

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
  
  const toggleElement = (element, className) => {
    element.classList.toggle(className);
    return element.classList.contains(className);
  };

  const applyTheme = (theme) => {
    document.body.classList.toggle('dark-theme', theme === 'dark');
    console.log(`${theme.charAt(0).toUpperCase() + theme.slice(1)} theme applied.`);
  };

  const showToast = (message) => {
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
  };

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
      notificationCount.classList.toggle('hidden', !notifications.length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      notificationsList.innerHTML = '<li>Failed to load notifications.</li>';
      notificationCount.classList.add('hidden');
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

  // ======= AI Suggestions =======
  const quill = new Quill('#editor', {
    theme: 'snow',
    modules: {
      toolbar: [['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['link', 'image'], ['clean']],
    },
  });

  const suggestionBox = document.getElementById('suggestion-box');
  const suggestionText = document.getElementById('suggestion-text');
  const acceptButton = document.getElementById('accept-suggestion');
  const rejectButton = document.getElementById('reject-suggestion');

  const fetchSuggestion = async () => {
    if (isModalOpen) return;

    const userInput = quill.getText().trim();
    if (userInput.split(/\s+/).length < 100) return;

    try {
      const suggestion = await window.api.getAISuggestions(userInput);
      suggestionText.innerText = suggestion || '';
      suggestionBox.classList.toggle('hidden', !suggestion);
    } catch (error) {
      console.error('Error fetching AI suggestion:', error);
      suggestionBox.classList.add('hidden');
    }
  };

  quill.on('text-change', debounce(fetchSuggestion, 5000));

  if (acceptButton && rejectButton) {
    acceptButton.addEventListener('click', () => {
      quill.insertText(quill.getLength(), ` ${suggestionText.innerText}`);
      suggestionBox.classList.add('hidden');
    });

    rejectButton.addEventListener('click', () => suggestionBox.classList.add('hidden'));
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
});
