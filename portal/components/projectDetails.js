// TBS Project Details Component
// Modal with tabs: Overview, Tasks, Photos, Assignments

import { api, safe, loadMockData } from '../lib/api.js';
import { canEditTask, canUploadPhoto, canAssign, getUserRole } from '../lib/rbac.js';
import { openModal } from './modal.js';

export class ProjectDetails {
  constructor(projectId) {
    this.projectId = projectId;
    this.project = null;
    this.tasks = [];
    this.photos = [];
    this.assignments = [];
  }

  async open() {
    try {
      await this.loadProjectData();
      await this.showModal();
    } catch (error) {
      console.error('Failed to open project details:', error);
    }
  }

  async loadProjectData() {
    // Load project details
    this.project = await safe(
      api.get(`/api/projects/${this.projectId}`),
      await this.loadMockProject()
    );

    // Load tasks
    this.tasks = await safe(
      api.get(`/api/projects/${this.projectId}/tasks`),
      await this.loadMockTasks()
    );

    // Load photos
    this.photos = await safe(
      api.get(`/api/projects/${this.projectId}/photos`),
      await this.loadMockPhotos()
    );

    // Load assignments
    this.assignments = await this.loadAssignments();
  }

  async loadMockProject() {
    const mock = await loadMockData('calendar');
    return mock.projects.find(p => p.id === this.projectId) || {
      id: this.projectId,
      name: 'Unknown Project',
      address: 'Unknown Address',
      status: 'planned',
      notes: 'No details available'
    };
  }

  async loadMockTasks() {
    const mock = await loadMockData('calendar');
    return mock.events.filter(e => e.projectId === this.projectId) || [];
  }

  async loadMockPhotos() {
    // Mock photos for demonstration
    return [
      {
        id: 'photo-001',
        caption: 'Before work started',
        tag: 'before',
        filePath: '/assets/building1.png',
        uploadedBy: 'u-danny',
        createdAt: '2025-10-01T10:00:00Z'
      },
      {
        id: 'photo-002',
        caption: 'Work in progress',
        tag: 'during',
        filePath: '/assets/building2.png',
        uploadedBy: 'u-pat',
        createdAt: '2025-10-15T14:30:00Z'
      }
    ];
  }

  async loadAssignments() {
    const assignments = [];
    this.tasks.forEach(task => {
      if (task.assignees) {
        task.assignees.forEach(assignee => {
          assignments.push({
            taskId: task.id,
            taskTitle: task.title,
            userId: assignee.id,
            userName: assignee.name,
            userRole: assignee.role
          });
        });
      }
    });
    return assignments;
  }

  async showModal() {
    const bodyNode = this.createModalBody();
    
    await openModal({
      title: `${this.project.name || 'Project'} Details`,
      bodyNode,
      size: 'large',
      actions: [
        {
          label: 'Close',
          kind: 'secondary',
          onClick: () => {}
        }
      ]
    });
  }

  createModalBody() {
    const container = document.createElement('div');
    container.className = 'project-details';

    // Create tab navigation
    const tabNav = document.createElement('div');
    tabNav.className = 'tab-nav';
    tabNav.innerHTML = `
      <button class="tab-btn active" data-tab="overview">Overview</button>
      <button class="tab-btn" data-tab="tasks">Tasks</button>
      <button class="tab-btn" data-tab="photos">Photos</button>
      <button class="tab-btn" data-tab="assignments">Assignments</button>
    `;

    // Create tab content
    const tabContent = document.createElement('div');
    tabContent.className = 'tab-content';

    // Overview tab
    const overviewTab = this.createOverviewTab();
    overviewTab.id = 'tab-overview';
    overviewTab.className = 'tab-pane active';

    // Tasks tab
    const tasksTab = this.createTasksTab();
    tasksTab.id = 'tab-tasks';
    tasksTab.className = 'tab-pane';

    // Photos tab
    const photosTab = this.createPhotosTab();
    photosTab.id = 'tab-photos';
    photosTab.className = 'tab-pane';

    // Assignments tab
    const assignmentsTab = this.createAssignmentsTab();
    assignmentsTab.id = 'tab-assignments';
    assignmentsTab.className = 'tab-pane';

    tabContent.appendChild(overviewTab);
    tabContent.appendChild(tasksTab);
    tabContent.appendChild(photosTab);
    tabContent.appendChild(assignmentsTab);

    // Setup tab switching
    this.setupTabSwitching(tabNav, tabContent);

    container.appendChild(tabNav);
    container.appendChild(tabContent);

    return container;
  }

  createOverviewTab() {
    const tab = document.createElement('div');
    tab.innerHTML = `
      <div class="project-overview">
        <div class="overview-grid">
          <div class="overview-item">
            <label>Project Name</label>
            <p>${this.project.name || 'Unknown'}</p>
          </div>
          <div class="overview-item">
            <label>Address</label>
            <p>${this.project.address || 'Unknown'}</p>
          </div>
          <div class="overview-item">
            <label>Status</label>
            <span class="status-badge status-${this.project.status || 'planned'}">
              ${(this.project.status || 'planned').charAt(0).toUpperCase() + (this.project.status || 'planned').slice(1)}
            </span>
          </div>
          <div class="overview-item">
            <label>Client</label>
            <p>${this.project.client_name || 'Not specified'}</p>
          </div>
          <div class="overview-item">
            <label>Start Date</label>
            <p>${this.project.start_date || 'Not set'}</p>
          </div>
          <div class="overview-item">
            <label>End Date</label>
            <p>${this.project.end_date_est || 'Not set'}</p>
          </div>
        </div>
        <div class="overview-notes">
          <label>Notes</label>
          <p>${this.project.notes || 'No notes available'}</p>
        </div>
      </div>
    `;
    return tab;
  }

  createTasksTab() {
    const tab = document.createElement('div');
    
    const tasksList = this.tasks.map(task => `
      <div class="task-item" data-task-id="${task.id}">
        <div class="task-header">
          <h4>${task.title}</h4>
          <span class="status-badge status-${task.status}">
            ${task.status.charAt(0).toUpperCase() + task.status.slice(1)}
          </span>
        </div>
        <div class="task-details">
          <p><strong>Dates:</strong> ${task.start} - ${task.end}</p>
          <p><strong>Assignees:</strong> ${task.assignees ? task.assignees.map(a => a.name).join(', ') : 'None'}</p>
          ${task.notes ? `<p><strong>Notes:</strong> ${task.notes}</p>` : ''}
        </div>
        <div class="task-actions">
          <button class="btn btn-secondary btn-sm" onclick="window.openTaskModal('${task.id}')">
            View Details
          </button>
        </div>
      </div>
    `).join('');

    tab.innerHTML = `
      <div class="tasks-tab">
        <div class="tab-header">
          <h3>Project Tasks (${this.tasks.length})</h3>
          ${canEditTask(getUserRole()) ? `
            <button class="btn btn-primary" onclick="window.createTaskForProject('${this.projectId}')">
              Add Task
            </button>
          ` : ''}
        </div>
        <div class="tasks-list">
          ${this.tasks.length > 0 ? tasksList : '<p class="no-data">No tasks found for this project.</p>'}
        </div>
      </div>
    `;

    return tab;
  }

  createPhotosTab() {
    const tab = document.createElement('div');
    
    const photosGrid = this.photos.map(photo => `
      <div class="photo-item" data-photo-id="${photo.id}">
        <div class="photo-thumbnail">
          <img src="${photo.filePath}" alt="${photo.caption}" loading="lazy">
          <div class="photo-overlay">
            <span class="photo-tag tag-${photo.tag}">${photo.tag}</span>
            ${canUploadPhoto(getUserRole()) ? `
              <button class="btn btn-danger btn-sm" onclick="window.deletePhoto('${photo.id}')">
                Delete
              </button>
            ` : ''}
          </div>
        </div>
        <div class="photo-info">
          <p class="photo-caption">${photo.caption}</p>
          <p class="photo-meta">Uploaded by ${photo.uploadedBy} on ${new Date(photo.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
    `).join('');

    tab.innerHTML = `
      <div class="photos-tab">
        <div class="tab-header">
          <h3>Project Photos (${this.photos.length})</h3>
          ${canUploadPhoto(getUserRole()) ? `
            <button class="btn btn-primary" onclick="window.uploadPhoto('${this.projectId}')">
              Upload Photos
            </button>
          ` : ''}
        </div>
        <div class="photos-grid">
          ${this.photos.length > 0 ? photosGrid : '<p class="no-data">No photos uploaded for this project.</p>'}
        </div>
      </div>
    `;

    return tab;
  }

  createAssignmentsTab() {
    const tab = document.createElement('div');
    
    const assignmentsTable = this.assignments.map(assignment => `
      <tr>
        <td>${assignment.taskTitle}</td>
        <td>
          <div class="user-info">
            <span class="user-avatar">${assignment.userName.charAt(0)}</span>
            <span>${assignment.userName}</span>
          </div>
        </td>
        <td><span class="role-badge">${assignment.userRole}</span></td>
        <td>
          ${canAssign(getUserRole()) ? `
            <button class="btn btn-danger btn-sm" onclick="window.removeAssignment('${assignment.taskId}', '${assignment.userId}')">
              Remove
            </button>
          ` : ''}
        </td>
      </tr>
    `).join('');

    tab.innerHTML = `
      <div class="assignments-tab">
        <div class="tab-header">
          <h3>Task Assignments (${this.assignments.length})</h3>
          ${canAssign(getUserRole()) ? `
            <button class="btn btn-primary" onclick="window.addAssignment('${this.projectId}')">
              Add Assignment
            </button>
          ` : ''}
        </div>
        <div class="assignments-table">
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>Assigned To</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${this.assignments.length > 0 ? assignmentsTable : '<tr><td colspan="4" class="no-data">No assignments found.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;

    return tab;
  }

  setupTabSwitching(tabNav, tabContent) {
    const tabButtons = tabNav.querySelectorAll('.tab-btn');
    const tabPanes = tabContent.querySelectorAll('.tab-pane');

    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetTab = button.dataset.tab;

        // Update button states
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // Update pane states
        tabPanes.forEach(pane => pane.classList.remove('active'));
        document.getElementById(`tab-${targetTab}`).classList.add('active');
      });
    });
  }
}

// Global functions for modal actions
window.openTaskModal = (taskId) => {
  // This would open the task edit modal
  console.log('Open task modal for:', taskId);
};

window.createTaskForProject = (projectId) => {
  // This would open the create task modal with project pre-selected
  console.log('Create task for project:', projectId);
};

window.uploadPhoto = (projectId) => {
  // This would open the photo upload modal
  console.log('Upload photo for project:', projectId);
};

window.deletePhoto = (photoId) => {
  if (confirm('Are you sure you want to delete this photo?')) {
    console.log('Delete photo:', photoId);
  }
};

window.addAssignment = (projectId) => {
  // This would open the add assignment modal
  console.log('Add assignment for project:', projectId);
};

window.removeAssignment = (taskId, userId) => {
  if (confirm('Are you sure you want to remove this assignment?')) {
    console.log('Remove assignment:', taskId, userId);
  }
};

export function openProjectDetails(projectId) {
  const details = new ProjectDetails(projectId);
  return details.open();
}
