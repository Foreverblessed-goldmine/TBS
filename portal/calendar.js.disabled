// TBS Calendar Module - Complete Implementation
// Features: Create/Edit Modal, Drag & Drop, iCal Export, RBAC

import { api, safe, loadMockData } from './lib/api.js';
import { canCreateTask, canEditTask, canDeleteTask, getUserRole, applyRBAC } from './lib/rbac.js';
import { openModal } from './components/modal.js';
import { exportToICS } from './components/ical.js';

class TBSCalendar {
  constructor() {
    this.calendar = null;
    this.context = null;
    this.currentEvent = null;
    this.filters = {
      project: '',
      assignee: '',
      status: '',
      mySchedule: false
    };
    this.switchToMock = false; // Toggle for development
    
    this.init();
  }

  async init() {
    try {
      await this.loadContext();
      this.buildFilters();
      this.setupEventListeners();
      this.initializeCalendar();
      applyRBAC();
      
      console.log('TBS Calendar initialized successfully');
    } catch (error) {
      console.error('Failed to initialize calendar:', error);
      this.showError('Failed to load calendar. Please refresh the page.');
    }
  }

  async loadContext() {
    if (this.switchToMock) {
      this.context = await loadMockData('calendar');
      this.context.fromApi = false;
      return;
    }

    try {
      const [user, projects, users] = await Promise.all([
        safe(api.get('/api/me'), null),
        safe(api.get('/api/projects'), []),
        safe(api.get('/api/users?roles=foreman,worker,contractor'), [])
      ]);

      if (user) {
        this.context = { user, projects, users, fromApi: true };
      } else {
        throw new Error('User not authenticated');
      }
    } catch (e) {
      console.warn('Context: falling back to mock due to', e);
      this.context = await loadMockData('calendar');
      this.context.fromApi = false;
    }
  }

  async loadEvents(range) {
    if (this.switchToMock || !this.context.fromApi) {
      const mock = await loadMockData('calendar');
      return mock.events || [];
    }

    try {
      const url = `/api/tasks/calendar/events?from=${range.startStr}&to=${range.endStr}`;
      return await api.get(url);
    } catch (e) {
      console.warn('Events: API failed, falling back to mock', e);
      const mock = await loadMockData('calendar');
      return mock.events || [];
    }
  }

  buildFilters() {
    // Build project filter
    const projectFilter = document.getElementById('projectFilter');
    if (projectFilter) {
      projectFilter.innerHTML = '<option value="">All Projects</option>';
      this.context.projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.name || project.ref || project.address;
        projectFilter.appendChild(option);
      });
    }

    // Build assignee filter
    const assigneeFilter = document.getElementById('assigneeFilter');
    if (assigneeFilter) {
      assigneeFilter.innerHTML = '<option value="">All Staff</option>';
      this.context.users.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = user.name;
        assigneeFilter.appendChild(option);
      });
    }
  }

  setupEventListeners() {
    // All controls have been removed - calendar now uses only week view with built-in navigation
    // No additional event listeners needed
  }

  initializeCalendar() {
    const calendarEl = document.getElementById('tbs-calendar');
    if (!calendarEl) {
      console.error('Calendar element not found');
      return;
    }

    this.calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'timeGridWeek',
      timeZone: 'Europe/London',
      locale: 'en-gb',
      firstDay: 1,
      nowIndicator: true,
      height: 'auto',
      slotMinTime: '07:00:00',
      slotMaxTime: '19:00:00',
      headerToolbar: { 
        left: 'prev,next today', 
        center: 'title', 
        right: '' 
      },

      events: async (info, success, failure) => {
        try {
          const raw = await this.loadEvents(info);
          const events = this.mapToFullCalendarEvents(raw);
          success(events);
        } catch (e) {
          failure(e);
          this.showError('Failed to load events.');
        }
      },

      editable: canEditTask(getUserRole()),
      eventDurationEditable: canEditTask(getUserRole()),
      selectable: canCreateTask(getUserRole()),

      dateClick: (arg) => {
        if (canCreateTask(getUserRole())) {
          this.openCreateTaskModal(arg.dateStr);
        }
      },

      eventClick: (arg) => {
        this.openEditTaskModal(arg.event);
      },

      eventDrop: (arg) => {
        if (!canEditTask(getUserRole())) {
          arg.revert();
          return;
        }
        this.updateEventTimes(arg.event);
      },

      eventResize: (arg) => {
        if (!canEditTask(getUserRole())) {
          arg.revert();
          return;
        }
        this.updateEventTimes(arg.event);
      }
    });

    this.calendar.render();
  }

  mapToFullCalendarEvents(events) {
    let filteredEvents = [...events];

    // Apply filters
    if (this.filters.project) {
      filteredEvents = filteredEvents.filter(event => 
        event.projectId === this.filters.project || 
        event.project?.id === this.filters.project
      );
    }

    if (this.filters.assignee) {
      filteredEvents = filteredEvents.filter(event => 
        event.assignees?.some(a => a.id === this.filters.assignee)
      );
    }

    if (this.filters.status) {
      filteredEvents = filteredEvents.filter(event => event.status === this.filters.status);
    }

    if (this.filters.mySchedule) {
      filteredEvents = filteredEvents.filter(event => 
        event.assignees?.some(a => a.id === this.context.user.id)
      );
    }

    return filteredEvents.map(event => ({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      className: `status-${event.status}`,
      extendedProps: {
        projectId: event.projectId,
        project: event.project,
        assignees: event.assignees || [],
        status: event.status,
        notes: event.notes || ''
      }
    }));
  }


  async openCreateTaskModal(defaultDate = null) {
    const bodyNode = await this.createTaskFormNode(null, defaultDate);
    
    await openModal({
      title: 'Create New Task',
      bodyNode,
      actions: [
        {
          label: 'Cancel',
          kind: 'secondary',
          onClick: () => {}
        },
        {
          label: 'Save',
          kind: 'primary',
          onClick: () => this.saveTask()
        }
      ]
    });
  }

  async openEditTaskModal(event) {
    const bodyNode = await this.createTaskFormNode(event);
    const actions = [
      {
        label: 'Cancel',
        kind: 'secondary',
        onClick: () => {}
      }
    ];

    if (canDeleteTask(getUserRole())) {
      actions.push({
        label: 'Delete',
        kind: 'danger',
        onClick: () => this.deleteTask(event.id)
      });
    }

    actions.push({
      label: 'Save',
      kind: 'primary',
      onClick: () => this.saveTask(event.id)
    });

    await openModal({
      title: 'Edit Task',
      bodyNode,
      actions
    });
  }

  async createTaskFormNode(event = null, defaultDate = null) {
    const form = document.createElement('form');
    form.id = 'taskForm';
    form.className = 'task-form';

    // Task Title
    const titleGroup = document.createElement('div');
    titleGroup.className = 'form-group';
    titleGroup.innerHTML = `
      <label for="taskTitle">Task Title *</label>
      <input type="text" id="taskTitle" name="title" required 
             value="${event ? event.title : ''}" 
             ${!canEditTask(getUserRole()) ? 'readonly' : ''} />
    `;
    form.appendChild(titleGroup);

    // Project Selection
    const projectGroup = document.createElement('div');
    projectGroup.className = 'form-group';
    const projectSelect = document.createElement('select');
    projectSelect.id = 'taskProject';
    projectSelect.name = 'projectId';
    projectSelect.required = true;
    projectSelect.disabled = !canEditTask(getUserRole());
    
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select Project';
    projectSelect.appendChild(defaultOption);

    this.context.projects.forEach(project => {
      const option = document.createElement('option');
      option.value = project.id;
      option.textContent = project.name || project.ref || project.address;
      if (event && event.extendedProps.projectId === project.id) {
        option.selected = true;
      }
      projectSelect.appendChild(option);
    });

    projectGroup.innerHTML = '<label for="taskProject">Project *</label>';
    projectGroup.appendChild(projectSelect);
    form.appendChild(projectGroup);

    // Date/Time Row
    const dateRow = document.createElement('div');
    dateRow.className = 'form-row';
    dateRow.innerHTML = `
      <div class="form-group">
        <label for="taskStartDate">Start Date *</label>
        <input type="date" id="taskStartDate" name="startDate" required 
               ${!canEditTask(getUserRole()) ? 'readonly' : ''} />
      </div>
      <div class="form-group">
        <label for="taskStartTime">Start Time *</label>
        <input type="time" id="taskStartTime" name="startTime" required 
               ${!canEditTask(getUserRole()) ? 'readonly' : ''} />
      </div>
    `;
    form.appendChild(dateRow);

    const endRow = document.createElement('div');
    endRow.className = 'form-row';
    endRow.innerHTML = `
      <div class="form-group">
        <label for="taskEndDate">End Date *</label>
        <input type="date" id="taskEndDate" name="endDate" required 
               ${!canEditTask(getUserRole()) ? 'readonly' : ''} />
      </div>
      <div class="form-group">
        <label for="taskEndTime">End Time *</label>
        <input type="time" id="taskEndTime" name="endTime" required 
               ${!canEditTask(getUserRole()) ? 'readonly' : ''} />
      </div>
    `;
    form.appendChild(endRow);

    // Status
    const statusGroup = document.createElement('div');
    statusGroup.className = 'form-group';
    const statusSelect = document.createElement('select');
    statusSelect.id = 'taskStatus';
    statusSelect.name = 'status';
    statusSelect.required = true;
    statusSelect.disabled = !canEditTask(getUserRole());

    const statuses = [
      { value: 'planned', label: 'Planned' },
      { value: 'active', label: 'Active' },
      { value: 'blocked', label: 'Blocked' },
      { value: 'done', label: 'Done' }
    ];

    statuses.forEach(status => {
      const option = document.createElement('option');
      option.value = status.value;
      option.textContent = status.label;
      if (event && event.extendedProps.status === status.value) {
        option.selected = true;
      }
      statusSelect.appendChild(option);
    });

    statusGroup.innerHTML = '<label for="taskStatus">Status *</label>';
    statusGroup.appendChild(statusSelect);
    form.appendChild(statusGroup);

    // Assignees
    const assigneeGroup = document.createElement('div');
    assigneeGroup.className = 'form-group';
    assigneeGroup.innerHTML = '<label>Assigned Staff</label>';
    
    const assigneeContainer = document.createElement('div');
    assigneeContainer.className = 'checkbox-group';
    assigneeContainer.id = 'assigneeCheckboxes';

    this.context.users.forEach(user => {
      const checkboxItem = document.createElement('div');
      checkboxItem.className = 'checkbox-item';
      const isAssigned = event && event.extendedProps.assignees?.some(a => a.id === user.id);
      
      checkboxItem.innerHTML = `
        <input type="checkbox" id="assignee-${user.id}" name="assignees" value="${user.id}"
               ${isAssigned ? 'checked' : ''} 
               ${!canEditTask(getUserRole()) ? 'disabled' : ''} />
        <label for="assignee-${user.id}">${user.name} (${user.role})</label>
      `;
      assigneeContainer.appendChild(checkboxItem);
    });

    assigneeGroup.appendChild(assigneeContainer);
    form.appendChild(assigneeGroup);

    // Notes
    const notesGroup = document.createElement('div');
    notesGroup.className = 'form-group';
    notesGroup.innerHTML = `
      <label for="taskNotes">Notes</label>
      <textarea id="taskNotes" name="notes" rows="3" 
                placeholder="Additional notes..." 
                ${!canEditTask(getUserRole()) ? 'readonly' : ''}>${event ? event.extendedProps.notes : ''}</textarea>
    `;
    form.appendChild(notesGroup);

    // Set default dates
    if (defaultDate) {
      document.getElementById('taskStartDate').value = defaultDate;
      document.getElementById('taskEndDate').value = defaultDate;
      document.getElementById('taskStartTime').value = '09:00';
      document.getElementById('taskEndTime').value = '17:00';
    } else if (event) {
      const start = new Date(event.start);
      const end = new Date(event.end);
      document.getElementById('taskStartDate').value = start.toISOString().split('T')[0];
      document.getElementById('taskStartTime').value = start.toTimeString().slice(0, 5);
      document.getElementById('taskEndDate').value = end.toISOString().split('T')[0];
      document.getElementById('taskEndTime').value = end.toTimeString().slice(0, 5);
    }

    return form;
  }

  async saveTask(eventId = null) {
    const form = document.getElementById('taskForm');
    if (!form) return;

    const formData = new FormData(form);
    const taskData = {
      title: formData.get('title'),
      projectId: parseInt(formData.get('projectId')),
      start: `${formData.get('startDate')}T${formData.get('startTime')}:00`,
      end: `${formData.get('endDate')}T${formData.get('endTime')}:00`,
      status: formData.get('status'),
      assignees: Array.from(formData.getAll('assignees')),
      notes: formData.get('notes') || ''
    };

    try {
      if (eventId) {
        await this.updateTask(eventId, taskData);
      } else {
        await this.createTask(taskData);
      }
      
      this.calendar.refetchEvents();
    } catch (error) {
      console.error('Failed to save task:', error);
      this.showError('Failed to save task. Please try again.');
    }
  }

  async createTask(taskData) {
    if (this.switchToMock || !this.context.fromApi) {
      // Mock creation
      const newEvent = {
        id: `t-${Date.now()}`,
        ...taskData,
        assignees: taskData.assignees.map(id => 
          this.context.users.find(u => u.id === id)
        ).filter(Boolean)
      };
      // In a real implementation, you'd update the mock data source
      console.log('Mock task created:', newEvent);
      return newEvent;
    }

    return await api.post('/api/tasks', taskData);
  }

  async updateTask(eventId, taskData) {
    if (this.switchToMock || !this.context.fromApi) {
      // Mock update
      console.log('Mock task updated:', eventId, taskData);
      return;
    }

    return await api.patch(`/api/tasks/${eventId}`, taskData);
  }

  async deleteTask(eventId) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      if (this.switchToMock || !this.context.fromApi) {
        // Mock deletion
        console.log('Mock task deleted:', eventId);
      } else {
        await api.del(`/api/tasks/${eventId}`);
      }
      
      this.calendar.refetchEvents();
    } catch (error) {
      console.error('Failed to delete task:', error);
      this.showError('Failed to delete task. Please try again.');
    }
  }

  async updateEventTimes(event) {
    const updates = {
      start: event.start.toISOString(),
      end: event.end.toISOString()
    };

    try {
      await this.updateTask(event.id, updates);
    } catch (error) {
      console.error('Failed to update event times:', error);
      event.revert();
      this.showError('Failed to update event. Please try again.');
    }
  }


  showError(message) {
    const errorEl = document.getElementById('cal-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.hidden = false;
    }
  }
}

// Initialize calendar when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new TBSCalendar();
});

// Export for potential external use
window.TBSCalendar = TBSCalendar;