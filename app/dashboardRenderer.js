// dashboardRenderer.js

document.addEventListener('DOMContentLoaded', () => {
    console.log('Dashboard Renderer loaded.');
  
    const postsCreatedElement = document.getElementById('posts-created');
    const followersCountElement = document.getElementById('followers-count');
    const recentPostsElement = document.getElementById('recent-posts');
  
    // Fetch Dashboard Metrics
    async function fetchDashboardMetrics() {
      try {
        const response = await fetch('/api/dashboard/metrics'); // Replace with your API endpoint
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard metrics');
        }
        const metrics = await response.json();
  
        // Update metrics in the DOM
        postsCreatedElement.textContent = metrics.postsCreated;
        followersCountElement.textContent = metrics.followers;
      } catch (error) {
        console.error('Error fetching dashboard metrics:', error);
      }
    }
  
    // Fetch Recent Posts
    async function fetchRecentPosts() {
      try {
        const response = await fetch('/api/dashboard/recent-posts'); // Replace with your API endpoint
        if (!response.ok) {
          throw new Error('Failed to fetch recent posts');
        }
        const posts = await response.json();
  
        // Populate recent posts in the DOM
        posts.forEach(post => {
          const listItem = document.createElement('li');
          listItem.textContent = post.title;
          recentPostsElement.appendChild(listItem);
        });
      } catch (error) {
        console.error('Error fetching recent posts:', error);
      }
    }
  
    // Initialize Dashboard
    function initDashboard() {
      fetchDashboardMetrics();
      fetchRecentPosts();
    }
  
    initDashboard();
  });
  