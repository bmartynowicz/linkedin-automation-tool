// utils/navigation.js

function switchPage(targetPageId, allPageIds) {
    try {
      const allPages = allPageIds.map((pageId) => document.getElementById(pageId));
      const targetPage = document.getElementById(targetPageId);
  
      if (!targetPage) {
        return { success: false, error: `Target page "${targetPageId}" not found.` };
      }
  
      allPages.forEach((page) => {
        if (page) {
          page.classList.toggle('hidden', page.id !== targetPageId);
        }
      });
  
      return { success: true };
    } catch (error) {
      console.error('Error in switchPage:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  module.exports = { switchPage };  