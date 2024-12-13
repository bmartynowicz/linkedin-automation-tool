// analyticsRenderer.js

document.addEventListener('DOMContentLoaded', () => {
    console.log('Analytics Renderer loaded.');
  
    const chartContainer = document.getElementById('engagementChart');
    const overviewSection = document.getElementById('analytics-overview');
  
    // Function to fetch analytics data from the backend
    async function fetchAnalyticsData() {
      const loadingMessage = document.createElement('p');
      loadingMessage.textContent = 'Loading analytics data...';
      overviewSection.appendChild(loadingMessage);
  
      try {
        const response = await fetch('/api/analytics'); // Replace with your actual API endpoint
        if (!response.ok) {
          throw new Error('Failed to fetch analytics data');
        }
        const data = await response.json();
  
        // Remove loading message on successful data fetch
        overviewSection.removeChild(loadingMessage);
  
        return data;
      } catch (error) {
        console.error('Error fetching analytics data:', error);
        loadingMessage.textContent = 'Failed to load analytics data.';
        throw error;
      }
    }
  
    // Function to initialize the Chart.js chart
    function renderChart(data) {
      new Chart(chartContainer, {
        type: 'line',
        data: {
          labels: data.labels, // Array of time periods or categories
          datasets: [
            {
              label: 'Post Engagements',
              data: data.engagements, // Array of engagement numbers
              borderColor: 'rgba(75, 192, 192, 1)',
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              borderWidth: 2,
              tension: 0.4, // Smoother curves
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              display: true,
              position: 'top',
            },
          },
          scales: {
            x: {
              title: {
                display: true,
                text: 'Time',
              },
            },
            y: {
              title: {
                display: true,
                text: 'Engagements',
              },
            },
          },
        },
      });
    }
  
    // Initialize the analytics functionality
    async function initAnalytics() {
      try {
        const analyticsData = await fetchAnalyticsData();
        renderChart(analyticsData);
      } catch (error) {
        console.error('Analytics initialization failed:', error);
      }
    }
  
    // Initialize analytics on page load
    initAnalytics();
  });
  