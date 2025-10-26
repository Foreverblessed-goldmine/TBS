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
    try {
      // Load project details
      console.log(`Loading project data for ID: ${this.projectId}`);
      
      // Try to load from API first
      const projectResponse = await fetch(`https://tbs-production-9ec7.up.railway.app/api/projects/${this.projectId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('tbs_at') || ''}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (projectResponse.ok) {
        this.project = await projectResponse.json();
        console.log('Project loaded from API:', this.project);
      } else {
        console.log('API failed, using mock data');
        this.project = await this.loadMockProject();
      }
    } catch (error) {
      console.error('Error loading project data:', error);
      this.project = await this.loadMockProject();
    }

    // Load tasks
    try {
      const tasksResponse = await fetch(`https://tbs-production-9ec7.up.railway.app/api/projects/${this.projectId}/tasks`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('tbs_at') || ''}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (tasksResponse.ok) {
        this.tasks = await tasksResponse.json();
        console.log('Tasks loaded from API:', this.tasks);
      } else {
        console.log('Tasks API failed, using mock data');
        this.tasks = await this.loadMockTasks();
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      this.tasks = await this.loadMockTasks();
    }

    // Load photos
    try {
      const photosResponse = await fetch(`https://tbs-production-9ec7.up.railway.app/api/projects/${this.projectId}/photos`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('tbs_at') || ''}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (photosResponse.ok) {
        this.photos = await photosResponse.json();
        console.log('Photos loaded from API:', this.photos);
      } else {
        console.log('Photos API failed, using mock data');
        this.photos = await this.loadMockPhotos();
      }
    } catch (error) {
      console.error('Error loading photos:', error);
      this.photos = await this.loadMockPhotos();
    }

    // Load assignments
    this.assignments = await this.loadAssignments();
  }

  async loadMockProject() {
    // Direct project data based on the project ID
    const projectData = {
      '1': {
        id: 1,
        name: '82 Walpole Road',
        address: '82 Walpole Road, Great Yarmouth',
        client_name: 'Private Residential',
        status: 'active',
        start_date: '2025-10-01',
        end_date_est: '2025-12-31',
        notes: 'Foundation phase construction project with structural work'
      },
      '2': {
        id: 2,
        name: 'Crown Road',
        address: 'Crown Road, Great Yarmouth',
        client_name: 'Commercial Development',
        status: 'active',
        start_date: '2025-09-15',
        end_date_est: '2026-02-28',
        notes: 'Commercial development nearing completion'
      }
    };
    
    const project = projectData[this.projectId];
    
    if (project) {
      console.log('Using mock project data:', project);
      return project;
    }
    
    console.log('No mock data found for project ID:', this.projectId);
    return {
      id: this.projectId,
      name: 'Unknown Project',
      address: 'Unknown Address',
      status: 'planned',
      notes: 'No details available'
    };
  }
  
  getProjectAddress(projectId) {
    const addresses = {
      'p-82walpole': '82 Walpole Road, Great Yarmouth',
      'p-crown': 'Crown Road, Great Yarmouth',
      'p-hmo-conversion': 'London HMO Conversion',
      'p-kitchen-reno': 'Kitchen Renovation Project'
    };
    return addresses[projectId] || 'Unknown Address';
  }
  
  getProjectClient(projectId) {
    const clients = {
      'p-82walpole': 'Private Residential',
      'p-crown': 'Commercial Development',
      'p-hmo-conversion': 'HMO Investment',
      'p-kitchen-reno': 'Private Residential'
    };
    return clients[projectId] || 'Not specified';
  }
  
  getProjectNotes(projectId) {
    const notes = {
      'p-82walpole': 'Foundation phase construction project with structural work',
      'p-crown': 'Commercial development nearing completion',
      'p-hmo-conversion': 'HMO conversion project with multiple bedrooms',
      'p-kitchen-reno': 'Kitchen renovation with modern appliances'
    };
    return notes[projectId] || 'No notes available';
  }

  async loadMockTasks() {
    // Mock tasks for each project
    const tasksData = {
      '1': [
        {
          id: 'task-1-1',
          title: 'Foundation Excavation',
          description: 'Excavate foundation area and prepare for concrete',
          status: 'in_progress',
          priority: 'high',
          start: '2025-10-01T09:00:00Z',
          end: '2025-10-05T17:00:00Z',
          due_date: '2025-10-05T17:00:00Z',
          assignees: [
            { id: 'u-pat', name: 'Pat', role: 'foreman' },
            { id: 'u-charlie', name: 'Charlie', role: 'labourer' }
          ],
          notes: 'Ensure proper depth and level for foundation'
        },
        {
          id: 'task-1-2',
          title: 'Concrete Pour',
          description: 'Pour concrete foundation',
          status: 'todo',
          priority: 'urgent',
          start: '2025-10-06T08:00:00Z',
          end: '2025-10-06T16:00:00Z',
          due_date: '2025-10-06T16:00:00Z',
          assignees: [
            { id: 'u-pat', name: 'Pat', role: 'foreman' }
          ],
          notes: 'Weather dependent - check forecast'
        }
      ],
      '2': [
        {
          id: 'task-2-1',
          title: 'Final Inspection',
          description: 'Complete final building inspection',
          status: 'todo',
          priority: 'high',
          start: '2025-10-20T10:00:00Z',
          end: '2025-10-20T15:00:00Z',
          due_date: '2025-10-20T15:00:00Z',
          assignees: [
            { id: 'u-adam', name: 'Adam', role: 'foreman' }
          ],
          notes: 'Ensure all work meets building standards'
        }
      ]
    };
    
    const tasks = tasksData[this.projectId] || [];
    console.log('Using mock tasks data:', tasks);
    return tasks;
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
      if (task.assignees && Array.isArray(task.assignees)) {
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
          <p><strong>Description:</strong> ${task.description || 'No description'}</p>
          <p><strong>Priority:</strong> ${task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : 'Medium'}</p>
          <p><strong>Due Date:</strong> ${task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Not set'}</p>
          <p><strong>Assignees:</strong> ${task.assignees && task.assignees.length > 0 ? task.assignees.map(a => a.name).join(', ') : 'None'}</p>
          ${task.notes ? `<p><strong>Notes:</strong> ${task.notes}</p>` : ''}
        </div>
        <div class="task-actions">
          <button class="btn btn-secondary btn-sm" onclick="window.openTaskModal('${task.id}')">
            View Details
          </button>
          ${task.due_date ? `
            <button class="btn btn-primary btn-sm" onclick="window.pushTaskToCalendar('${task.id}')">
              Add to Calendar
            </button>
          ` : ''}
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
  // Create and show photo upload modal
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'photoUploadModal';
  modal.style.display = 'block';
  
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Upload Photo for Project ${projectId}</h3>
        <span class="close" onclick="closePhotoModal()">&times;</span>
      </div>
      <div class="modal-body">
        <form id="photoUploadForm" enctype="multipart/form-data">
          <div class="form-group">
            <label for="photoFile">Select Photo:</label>
            <input type="file" id="photoFile" name="photo" accept="image/*" required>
          </div>
          <div class="form-group">
            <label for="photoCaption">Caption:</label>
            <input type="text" id="photoCaption" name="caption" placeholder="Enter photo caption">
          </div>
          <div class="form-group">
            <label for="photoTag">Tag:</label>
            <select id="photoTag" name="tag">
              <option value="before">Before Work</option>
              <option value="during">During Work</option>
              <option value="after">After Work</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="closePhotoModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">Upload Photo</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Handle form submission
  const form = document.getElementById('photoUploadForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handlePhotoUpload(projectId);
  });
};

window.closePhotoModal = () => {
  const modal = document.getElementById('photoUploadModal');
  if (modal) {
    modal.remove();
  }
};

async function handlePhotoUpload(projectId) {
  const form = document.getElementById('photoUploadForm');
  const formData = new FormData(form);
  
  try {
    // Create photo data for API
    const photoData = {
      projectId: parseInt(projectId),
      caption: formData.get('caption') || 'Untitled',
      tag: formData.get('tag') || 'during',
      uploadedBy: 'u-danny' // This should come from the current user
    };
    
    console.log('Uploading photo for project:', photoData);
    
    // Call the API to create the photo record
    const response = await fetch('https://tbs-production-9ec7.up.railway.app/api/photos', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('tbs_at') || ''}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(photoData)
    });
    
    if (response.ok) {
      const newPhoto = await response.json();
      
      // Add the photo to the project's photos array with a preview URL
      const photoWithPreview = {
        ...newPhoto,
        url: URL.createObjectURL(formData.get('photo'))
      };
      
      if (window.currentProjectDetails) {
        window.currentProjectDetails.photos.push(photoWithPreview);
        window.currentProjectDetails.render();
      }
      
      // Close modal
      closePhotoModal();
      
      alert('Photo uploaded successfully!');
    } else {
      const error = await response.json().catch(() => ({}));
      console.error('Photo upload failed:', {
        status: response.status,
        statusText: response.statusText,
        error: error
      });
      throw new Error(error.error || `API returned ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Failed to upload photo:', error);
    alert('Failed to upload photo. Please try again.');
  }
}

window.deletePhoto = async (photoId) => {
  if (confirm('Are you sure you want to delete this photo?')) {
    try {
      const response = await fetch(`https://tbs-production-9ec7.up.railway.app/api/photos/${photoId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('tbs_at') || ''}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        if (window.currentProjectDetails) {
          window.currentProjectDetails.photos = window.currentProjectDetails.photos.filter(photo => photo.id != photoId);
          window.currentProjectDetails.render();
        }
        alert('Photo deleted successfully!');
      } else {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `API returned ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to delete photo:', error);
      alert('Failed to delete photo. Please try again.');
    }
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

window.pushTaskToCalendar = async (taskId) => {
  try {
    const response = await fetch(`/api/tasks/calendar/tasks/${taskId}/push`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('tbs_at') || ''}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        all_day: true // Default to all-day event
      })
    });
    
    if (response.ok) {
      alert('Task added to calendar successfully!');
    } else {
      const error = await response.json().catch(() => ({}));
      alert(`Failed to add task to calendar: ${error.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error pushing task to calendar:', error);
    alert('Error adding task to calendar. Please try again.');
  }
};

export function openProjectDetails(projectId) {
  const details = new ProjectDetails(projectId);
  return details.open();
}
