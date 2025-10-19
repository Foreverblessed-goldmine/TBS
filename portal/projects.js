// TBS Projects Module
// Handles project management and details

import { openProjectDetails } from './components/projectDetails.js';
import { canManageProjects, getUserRole } from './lib/rbac.js';

// Initialize projects page
document.addEventListener('DOMContentLoaded', () => {
  initializeProjects();
});

function initializeProjects() {
  // Add click handlers to project cards
  document.querySelectorAll('.project-card').forEach(card => {
    const projectId = card.dataset.projectId;
    if (projectId) {
      const viewDetailsBtn = card.querySelector('[onclick*="viewProjectDetails"]');
      if (viewDetailsBtn) {
        viewDetailsBtn.onclick = () => openProjectDetails(projectId);
      }
    }
  });
}

// Global functions for project actions
window.viewProjectDetails = (projectId) => {
  openProjectDetails(projectId);
};

window.viewProjectSchedule = (projectId) => {
  // Navigate to calendar with project filter
  sessionStorage.setItem('calendarFilter', JSON.stringify({ projectId }));
  location.href = "/portal/calendar.html";
};

window.viewProjectPhotos = (projectId) => {
  // Open project details modal on photos tab
  openProjectDetails(projectId).then(() => {
    // Switch to photos tab after modal opens
    setTimeout(() => {
      const photosTab = document.querySelector('[data-tab="photos"]');
      if (photosTab) {
        photosTab.click();
      }
    }, 100);
  });
};
