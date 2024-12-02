// profile.js

// Initialize modal and elements
document.addEventListener('DOMContentLoaded', () => {
    const profileModal = document.getElementById('profile-modal');
    const linkedinAuthButton = document.getElementById('linkedin-auth-button');
    const logoutButton = document.getElementById('logout-button');
  
    // Handle LinkedIn OAuth login
    linkedinAuthButton.addEventListener('click', () => {
      const CLIENT_ID = '6nbz3vwfl6';
      const REDIRECT_URI = 'https://www.linkedin.com/developers/tools/oauth/redirect';
      const SCOPES = 'r_profile w_member_social';
  
      const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}`;
      window.location.href = authUrl;
    });
  
    // Handle logout action
    logoutButton.addEventListener('click', () => {
      fetch('/api/logout', { method: 'POST' })
        .then(() => {
          console.log('User logged out');
          window.location.reload(); // Reload the page after logout
        })
        .catch((error) => console.error('Error logging out:', error));
    });
  });