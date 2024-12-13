// indexRenderer.js

document.addEventListener('DOMContentLoaded', () => {
    console.log('Index Renderer loaded.');
  
    let isModalOpen = false;
  
    // ======= Sidebar Toggle =======
    const toggleMenuButton = document.getElementById('toggle-menu');
    const sidebar = document.getElementById('sidebar');
  
    // ======= Settings Button =======
    const settingsButton = document.getElementById('settings-button');

    // ======= Modal Container =======
    const modalContainer = document.getElementById('modal-container');
  
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
  
    // ======= Saved Posts Modal =======
    const savedPostsModal = document.getElementById('saved-posts-modal');
    const openSavedPostsButton = document.getElementById('open-saved-posts');
    const closeSavedPostsButton = savedPostsModal ? savedPostsModal.querySelector('.close-button') : null;
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
  
    // ======= Global Utility Functions =======
    function toggleElement(element, className) {
      element.classList.toggle(className);
      return element.classList.contains(className);
    }
  
    function showToast(message) {
      const toastContainer = document.getElementById('toast-container');
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerText = message;
    
      toastContainer.appendChild(toast);
    
      setTimeout(() => {
        toast.classList.add('show');
      }, 100);
    
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
          toastContainer.removeChild(toast);
        }, 500);
      }, 3000);
    }
  
    // Function to open a modal
    function openModal(modalId) {
            // Hide all modals first
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
            modal.style.display = 'hidden';
            modal.classList.remove('active');
            });
    
            // Show the selected modal
            const modal = document.getElementById(modalId);
            if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
            }
    }

    // Function to close a modal
    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
        modal.style.display = 'hidden';
        modal.classList.remove('active');
        }
    }    
  
    // ======= Sidebar Toggle Logic =======
    if (toggleMenuButton && sidebar) {
        toggleMenuButton.addEventListener('click', () => {
          const collapsed = toggleElement(sidebar, 'collapsed');
          toggleElement(document.body, 'sidebar-collapsed');
      
          const icon = toggleMenuButton.querySelector('i');
          if (collapsed) {
            icon.classList.remove('fa-chevron-left');
            icon.classList.add('fa-chevron-right');
          } else {
            icon.classList.remove('fa-chevron-right');
            icon.classList.add('fa-chevron-left');
          }
      
          console.log(`Sidebar ${collapsed ? 'Collapsed' : 'Expanded'}.`);
      
          // Notify the main process about the toggle state
          window.api.toggleSidebar(collapsed);
        });
    }
  
    // ======= Content Creation Button (Navigates to Editor) =======
    const contentCreationButton = document.querySelector('#sidebar .nav-item a[href="#content-creation"]');
    if (contentCreationButton) {
      contentCreationButton.addEventListener('click', () => {
        window.api.loadPage('editor.html');
      });
    }
  
    // ======= Settings Navigation =======
    if (settingsButton) {
      settingsButton.addEventListener('click', (event) => {
        event.preventDefault();
        window.api.loadPage('settings.html');
      });
    }
  
    // ======= Notifications Logic =======
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
  
    // ======= Profile Modal Logic =======
    const fetchUserData = async () => {
      try {
        const user = await window.api.fetchUserData();
        document.getElementById('username').textContent = user.name;
        document.getElementById('profile-picture').src = user.profile_picture || '../../assets/default-profile.png';
    
        console.log('User data displayed:', user.name);
      } catch (error) {
        console.error('Error fetching user data:', error);
        document.getElementById('username').textContent = 'Guest';
        document.getElementById('profile-picture').src = '../../assets/default-profile.png';
      }
    };
  
    profileButton.addEventListener('click', async () => {
        try {
          const response = await fetch('../modals/profile-modal.html');
          const modalHTML = await response.text();
          modalContainer.innerHTML = modalHTML;
      
          const profileModal = document.getElementById('profile-modal');
          const closeButton = document.getElementById('close-profile');
      
          profileModal.style.display = 'flex';
      
          // Close the modal on button click
          closeButton.addEventListener('click', () => {
            profileModal.style.display = 'none';
          });
      
          // Close the modal on Escape key
          document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
              profileModal.style.display = 'none';
            }
          });
        } catch (error) {
          console.error('Error loading modal:', error);
        }
      });
  
    // ======= Saved Posts Modal and Related Logic (Global for now) =======
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
  
    const resetSelection = () => {
      const selectedLi = savedPostsList ? savedPostsList.querySelector('.selected') : null;
      if (selectedLi) {
        selectedLi.classList.remove('selected');
      }
      selectedPost = null;
      if (editPostButton) editPostButton.disabled = true;
      if (schedulePostButton) schedulePostButton.disabled = true;
      if (deletePostButton) deletePostButton.disabled = true;
    };
  
    const displaySavedPosts = (posts) => {
      if (!savedPostsList) return;
      savedPostsList.innerHTML = ''; // Clear existing list
  
      if (posts.length === 0) {
        savedPostsList.innerHTML = '<li>No saved posts found.</li>';
        return;
      }
  
      posts.forEach((post) => {
        const li = document.createElement('li');
        li.classList.add('saved-post-item');
        li.dataset.id = post.id;
  
        const title = document.createElement('span');
        title.classList.add('post-title');
        title.innerText = post.title || `Post #${post.id}`;
        li.appendChild(title);
  
        const status = document.createElement('span');
        status.classList.add('post-status');
        status.innerText = `[${post.status}]`;
        li.appendChild(status);
  
        li.addEventListener('click', () => {
          const previouslySelected = savedPostsList.querySelector('.selected');
          if (previouslySelected) {
            previouslySelected.classList.remove('selected');
          }
  
          li.classList.add('selected');
          selectedPost = post;
  
          editPostButton.disabled = false;
          schedulePostButton.disabled = false;
          deletePostButton.disabled = false;
  
          console.log(`Post selected: ID ${post.id}`);
        });
  
        savedPostsList.appendChild(li);
      });
    };
  
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
  
    const performSearch = (() => {
      const debounce = (func, delay) => {
        let timeout;
        return (...args) => {
          clearTimeout(timeout);
          timeout = setTimeout(() => func(...args), delay);
        };
      };
    
      return debounce(async () => {
        if (!searchPostsInput) return;
        const query = searchPostsInput.value.trim();
        if (query.length === 0) {
          loadSavedPosts(); 
          return;
        }
      
        showLoader();
        try {
          const posts = await window.api.searchPosts(query);
          displaySavedPosts(posts);
          showToast(`Found ${posts.length} post(s) matching "${query}".`);
          resetSelection();
        } catch (error) {
          console.error('Error searching posts:', error);
          showToast('An error occurred while searching posts.');
        } finally {
          hideLoader();
        }
      }, 500);
    })();
  
    if (openSavedPostsButton && savedPostsModal && closeSavedPostsButton) {
      openSavedPostsButton.addEventListener('click', () => {
        openModal(savedPostsModal);
        loadSavedPosts();
      });
  
      closeSavedPostsButton.addEventListener('click', () => {
        closeModal(savedPostsModal);
        resetSelection();
      });
  
      window.addEventListener('click', (event) => {
        if (event.target === savedPostsModal) {
          closeModal(savedPostsModal);
          resetSelection();
        }
      });
    }
  
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
  
    // Edit Post Button
    if (editPostButton) {
      editPostButton.addEventListener('click', async () => {
        if (selectedPost) {
          // The code that edits or loads a post for editing is editor-specific. 
          // Eventually, you'd handle this differently if needed globally.
          showToast('Editing post would happen in the editor page.');
        } else {
          showToast('Please select a post to edit.');
        }
      });
    }
  
    // Schedule Post Button
    if (schedulePostButton) {
      schedulePostButton.addEventListener('click', () => {
        if (selectedPost) {
          showToast('Scheduling post would happen in the editor page.');
        } else {
          showToast('Please select a post to schedule.');
        }
      });
    }
  
    // Delete Post Button
    if (deletePostButton) {
      deletePostButton.addEventListener('click', () => {
        if (selectedPost) {
          openModal(deleteConfirmationModal);
        } else {
          showToast('Please select a post to delete.');
        }
      });
    }
  
    if (confirmDeleteButton) {
      confirmDeleteButton.addEventListener('click', async () => {
        if (selectedPost) {
          try {
            const user = await window.api.fetchUserData();
            if (!user || !user.linkedin_id) {
              showToast('Unable to identify the current user. Please log in again.');
              return;
            }
  
            const result = await window.api.deletePost({
              postId: selectedPost.id,
              userId: user.linkedin_id,
            });
  
            if (result.success) {
              showToast('Post deleted successfully.');
              loadSavedPosts();
              resetSelection();
            } else {
              showToast('Failed to delete the post.');
            }
          } catch (error) {
            console.error('Error deleting post:', error);
            showToast('An error occurred while deleting the post.');
          } finally {
            closeModal(deleteConfirmationModal);
            selectedPost = null;
          }
        }
      });
    }
  
    if (cancelDeleteButton) {
      cancelDeleteButton.addEventListener('click', () => {
        closeModal(deleteConfirmationModal);
        selectedPost = null;
      });
    }
  
    if (closeDeleteConfirmationButton) {
      closeDeleteConfirmationButton.addEventListener('click', () => {
        closeModal(deleteConfirmationModal);
        selectedPost = null;
      });
    }
  
    // Listen to 'post-success' event
    window.api.on('post-success', (args) => {
      console.log('Received "post-success" event:', args);
      showToast(`Post ID ${args} has been published to LinkedIn.`);
      loadSavedPosts();
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
      loadSavedPosts();
    });
  
    // Listen to 'update-user-data'
    window.api.on('update-user-data', (userData) => {
      console.log('Received "update-user-data" event:', userData);
      usernameDisplay.textContent = userData.name;
      profilePicture.src = userData.profilePicture || '../../assets/default-profile.png';
      showToast('User data updated.');
    });
  
    // LinkedIn Auth Events
    window.api.on('linkedin-auth-success', (userData) => {
      console.log('Received "linkedin-auth-success" event:', userData);
      usernameDisplay.textContent = userData.name;
      profilePicture.src = userData.profilePicture || '../../assets/default-profile.png';
      showToast('Successfully logged in with LinkedIn!');
    });
  
    window.api.on('linkedin-auth-failure', (errorData) => {
      console.error('Received "linkedin-auth-failure" event:', errorData);
      showToast('Failed to authenticate with LinkedIn.');
    });
  
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
  
  });
  