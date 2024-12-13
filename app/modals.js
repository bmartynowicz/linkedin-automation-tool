// modals.js

function loadModal(modalName, callback) {
    const modalPath = `/app/views/modals/${modalName}.html`;
  
    fetch(modalPath)
      .then(response => {
        if (!response.ok) throw new Error(`Failed to load modal: ${modalPath}`);
        return response.text();
      })
      .then(modalHTML => {
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);
  
        // Initialize event listeners after modal loads
        if (callback) callback(modalContainer);
      })
      .catch(error => console.error(error));
  }
  
  // Open Profile Modal
  document.getElementById('open-profile-modal').addEventListener('click', () => {
    loadModal('profile-modal', (modalContainer) => {
      const modal = modalContainer.querySelector('#profile-modal');
      modal.classList.remove('hidden');
  
      // Add close button listener
      modal.querySelector('#close-profile-modal').addEventListener('click', () => {
        modal.remove();
      });
    });
  });
  