// TBS Calendar Module
// UI-first implementation with mock data, API-ready architecture

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
    
    this.init();
  }

  async init() {
    try {
      // Load context (user, projects, users, events)
      await this.loadContext();
      
      // Initialize UI components
      this.buildFilters();
      this.setupEventListeners();
      this.initializeCalendar();
      
      // Apply RBAC
      this.applyRBAC();
      
      console.log('TBS Calendar initialized successfully');
    } catch (error) {
      console.error('Failed to initialize calendar:', error);
      this.showError('Failed to load calendar. Please refresh the page.');
    }
  }

  async loadContext() {
    try {
      // Try API first, fallback to mock data
      const apiAvailable = await this.checkAPI();
      
      if (apiAvailable) {
        this.context = await this.loadFromAPI();
      } else {
        this.context = await this.loadFromMock();
      }
      
      console.log('Context loaded:', this.context);
    } catch (error) {
      console.error('Failed to load context:', error);
      // Fallback to mock data
      this.context = await this.loadFromMock();
    }
  }

  async checkAPI() {
    try {
      const response = await fetch('/api/me', { 
        method: 'GET',
        credentials: 'include'
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async loadFromAPI() {
    const [userRes, projectsRes, usersRes, eventsRes] = await Promise.all([
      fetch('/api/me', { credentials: 'include' }),
      fetch('/api/projects', { credentials: 'include' }),
      fetch('/api/users?roles=foreman,worker,contractor', { credentials: 'include' }),
      fetch('/api/calendar/events?from=2025-10-01&to=2025-12-31', { credentials: 'include' })
    ]);

    if (!userRes.ok) throw new Error('Failed to load user data');

    const user = await userRes.json();
    const projects = projectsRes.ok ? await projectsRes.json() : [];
    const users = usersRes.ok ? await usersRes.json() : [];
    const events = eventsRes.ok ? await eventsRes.json() : [];

    return { user, projects, users, events, bankHolidays: [] };
  }

  async loadFromMock() {
    try {
      const response = await fetch('./data/calendar.mock.json');
      if (!response.ok) throw new Error('Failed to load mock data');
      return await response.json();
    } catch (error) {
      console.error('Failed to load mock data:', error);
      // Return minimal fallback data
      return {
        user: { id: 'u-danny', role: 'admin', name: 'Danny Tighe' },
        projects: [],
        users: [],
        events: [],
        bankHolidays: []
      };
    }
  }

  buildFilters() {
    // Build project filter
    const projectFilter = document.getElementById('projectFilter');
    projectFilter.innerHTML = '<option value="">All Projects</option>';
    this.context.projects.forEach(project => {
      const option = document.createElement('option');
      option.value = project.id;
      option.textContent = project.name;
      projectFilter.appendChild(option);
    });

    // Build assignee filter
    const assigneeFilter = document.getElementById('assigneeFilter');
    assigneeFilter.innerHTML = '<option value="">All Staff</option>';
    this.context.users.forEach(user => {
      const option = document.createElement('option');
      option.value = user.id;
      option.textContent = user.name;
      assigneeFilter.appendChild(option);
    });

    // Build assignee checkboxes for modal
    this.buildAssigneeCheckboxes();
  }

  buildAssigneeCheckboxes() {
    const container = document.getElementById('assigneeCheckboxes');
    container.innerHTML = '';
    
    this.context.users.forEach(user => {
      const checkboxItem = document.createElement('div');
      checkboxItem.className = 'checkbox-item';
      checkboxItem.innerHTML = `
        <input type="checkbox" id="assignee-${user.id}" name="assignees" value="${user.id}">
        <label for="assignee-${user.id}">${user.name} (${user.role})</label>
      `;
      container.appendChild(checkboxItem);
    });
  }

  setupEventListeners() {
    // View controls
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = e.target.dataset.view;
        this.calendar.changeView(view);
        this.updateViewButtons(view);
      });
    });

    // Filters
    document.getElementById('projectFilter').addEventListener('change', (e) => {
      this.filters.project = e.target.value;
      this.applyFilters();
    });

    document.getElementById('assigneeFilter').addEventListener('change', (e) => {
      this.filters.assignee = e.target.value;
      this.applyFilters();
    });

    document.getElementById('statusFilter').addEventListener('change', (e) => {
      this.filters.status = e.target.value;
      this.applyFilters();
    });

    document.getElementById('myScheduleToggle').addEventListener('change', (e) => {
      this.filters.mySchedule = e.target.checked;
      this.applyFilters();
    });

    // New event button
    document.getElementById('newEventBtn').addEventListener('click', () => {
      this.openEventModal();
    });

    // Export button
    document.getElementById('exportBtn').addEventListener('click', () => {
      this.exportICS();
    });

    // Modal events
    this.setupModalEvents();
  }

  setupModalEvents() {
    const modal = document.getElementById('eventModal');
    const form = document.getElementById('eventForm');
    const closeBtn = document.getElementById('modalClose');
    const cancelBtn = document.getElementById('modalCancel');
    const deleteBtn = document.getElementById('deleteBtn');

    closeBtn.addEventListener('click', () => this.closeEventModal());
    cancelBtn.addEventListener('click', () => this.closeEventModal());
    deleteBtn.addEventListener('click', () => this.deleteEvent());

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeEventModal();
    });

    // Form submission
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveEvent();
    });

    // Date/time change handlers for conflict detection
    ['eventStartDate', 'eventStartTime', 'eventEndDate', 'eventEndTime'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => {
        this.checkConflicts();
      });
    });

    // Assignee change handler for conflict detection
    document.querySelectorAll('input[name="assignees"]').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this.checkConflicts();
      });
    });
  }

  initializeCalendar() {
    const calendarEl = document.getElementById('tbs-calendar');
    
    this.calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'timeGridWeek',
      locale: 'en-gb',
      timeZone: 'Europe/London',
      firstDay: 1, // Monday
      slotMinTime: '07:00:00',
      slotMaxTime: '19:00:00',
      nowIndicator: true,
      height: 'auto',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: ''
      },
      buttonText: {
        today: 'Today',
        month: 'Month',
        week: 'Week',
        day: 'Day'
      },
      events: this.mapToFullCalendarEvents(),
      eventClick: (info) => this.openEventModal(info.event),
      dateClick: (info) => this.handleDateClick(info),
      eventDrop: (info) => this.handleEventDrop(info),
      eventResize: (info) => this.handleEventResize(info),
      editable: this.canEdit(),
      eventResizableFromStart: this.canEdit(),
      eventStartEditable: this.canEdit(),
      eventDurationEditable: this.canEdit(),
      eventOverlap: false,
      eventConstraint: {
        start: '07:00',
        end: '19:00'
      }
    });

    this.calendar.render();
  }

  mapToFullCalendarEvents() {
    let events = [...this.context.events];

    // Apply filters
    if (this.filters.project) {
      events = events.filter(event => event.projectId === this.filters.project);
    }

    if (this.filters.assignee) {
      events = events.filter(event => event.assignees.includes(this.filters.assignee));
    }

    if (this.filters.status) {
      events = events.filter(event => event.status === this.filters.status);
    }

    if (this.filters.mySchedule) {
      events = events.filter(event => event.assignees.includes(this.context.user.id));
    }

    return events.map(event => ({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      className: `status-${event.status}`,
      extendedProps: {
        projectId: event.projectId,
        assignees: event.assignees,
        status: event.status,
        notes: event.notes
      }
    }));
  }

  applyFilters() {
    if (this.calendar) {
      this.calendar.removeAllEvents();
      this.calendar.addEventSource(this.mapToFullCalendarEvents());
    }
  }

  updateViewButtons(activeView) {
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.view === activeView) {
        btn.classList.add('active');
      }
    });
  }

  applyRBAC() {
    const user = this.context.user;
    
    // Show/hide admin-only elements
    document.querySelectorAll('.only-admin').forEach(el => {
      el.style.display = user.role === 'admin' ? 'block' : 'none';
    });

    // Update calendar editability
    if (this.calendar) {
      this.calendar.setOption('editable', this.canEdit());
      this.calendar.setOption('eventResizableFromStart', this.canEdit());
      this.calendar.setOption('eventStartEditable', this.canEdit());
      this.calendar.setOption('eventDurationEditable', this.canEdit());
    }
  }

  canEdit() {
    const user = this.context.user;
    return ['admin', 'foreman'].includes(user.role);
  }

  canCreate() {
    return this.context.user.role === 'admin';
  }

  canDelete() {
    return this.context.user.role === 'admin';
  }

  handleDateClick(info) {
    if (this.canCreate()) {
      this.openEventModal(null, info.dateStr);
    }
  }

  handleEventDrop(info) {
    if (!this.canEdit()) {
      info.revert();
      return;
    }

    const event = info.event;
    const updates = {
      start: event.start.toISOString(),
      end: event.end.toISOString()
    };

    this.updateEvent(event.id, updates);
  }

  handleEventResize(info) {
    if (!this.canEdit()) {
      info.revert();
      return;
    }

    const event = info.event;
    const updates = {
      start: event.start.toISOString(),
      end: event.end.toISOString()
    };

    this.updateEvent(event.id, updates);
  }

  openEventModal(event = null, defaultDate = null) {
    this.currentEvent = event;
    const modal = document.getElementById('eventModal');
    const form = document.getElementById('eventForm');
    const title = document.getElementById('modalTitle');
    const deleteBtn = document.getElementById('deleteBtn');

    // Reset form
    form.reset();
    this.buildProjectOptions();

    if (event) {
      // Edit mode
      title.textContent = 'Edit Task';
      deleteBtn.style.display = this.canDelete() ? 'block' : 'none';
      
      const props = event.extendedProps;
      document.getElementById('eventTitle').value = event.title;
      document.getElementById('eventProject').value = props.projectId;
      document.getElementById('eventStatus').value = props.status;
      document.getElementById('eventNotes').value = props.notes || '';

      // Set dates and times
      const start = new Date(event.start);
      const end = new Date(event.end);
      
      document.getElementById('eventStartDate').value = start.toISOString().split('T')[0];
      document.getElementById('eventStartTime').value = start.toTimeString().slice(0, 5);
      document.getElementById('eventEndDate').value = end.toISOString().split('T')[0];
      document.getElementById('eventEndTime').value = end.toTimeString().slice(0, 5);

      // Set assignees
      props.assignees.forEach(assigneeId => {
        const checkbox = document.getElementById(`assignee-${assigneeId}`);
        if (checkbox) checkbox.checked = true;
      });

      // Disable fields based on role
      if (this.context.user.role === 'foreman') {
        document.getElementById('eventTitle').disabled = true;
        document.getElementById('eventProject').disabled = true;
      }
    } else {
      // Create mode
      title.textContent = 'Create New Task';
      deleteBtn.style.display = 'none';
      
      if (defaultDate) {
        document.getElementById('eventStartDate').value = defaultDate;
        document.getElementById('eventEndDate').value = defaultDate;
        document.getElementById('eventStartTime').value = '09:00';
        document.getElementById('eventEndTime').value = '17:00';
      }
    }

    modal.style.display = 'flex';
    this.checkConflicts();
  }

  buildProjectOptions() {
    const select = document.getElementById('eventProject');
    select.innerHTML = '<option value="">Select Project</option>';
    
    this.context.projects.forEach(project => {
      const option = document.createElement('option');
      option.value = project.id;
      option.textContent = project.name;
      select.appendChild(option);
    });
  }

  closeEventModal() {
    const modal = document.getElementById('eventModal');
    modal.style.display = 'none';
    this.currentEvent = null;
    
    // Reset form and re-enable fields
    document.getElementById('eventForm').reset();
    document.querySelectorAll('#eventForm input, #eventForm select').forEach(field => {
      field.disabled = false;
    });
  }

  async saveEvent() {
    const form = document.getElementById('eventForm');
    const formData = new FormData(form);
    
    const eventData = {
      title: formData.get('title'),
      projectId: formData.get('projectId'),
      start: `${formData.get('startDate')}T${formData.get('startTime')}:00`,
      end: `${formData.get('endDate')}T${formData.get('endTime')}:00`,
      status: formData.get('status'),
      assignees: Array.from(formData.getAll('assignees')),
      notes: formData.get('notes') || ''
    };

    try {
      if (this.currentEvent) {
        // Update existing event
        await this.updateEvent(this.currentEvent.id, eventData);
      } else {
        // Create new event
        await this.createEvent(eventData);
      }
      
      this.closeEventModal();
      this.refreshCalendar();
    } catch (error) {
      console.error('Failed to save event:', error);
      this.showError('Failed to save event. Please try again.');
    }
  }

  async createEvent(eventData) {
    const apiAvailable = await this.checkAPI();
    
    if (apiAvailable) {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(eventData)
      });
      
      if (!response.ok) throw new Error('Failed to create event');
      return await response.json();
    } else {
      // Mock creation
      const newEvent = {
        id: `t-${Date.now()}`,
        ...eventData
      };
      this.context.events.push(newEvent);
      return newEvent;
    }
  }

  async updateEvent(eventId, updates) {
    const apiAvailable = await this.checkAPI();
    
    if (apiAvailable) {
      const response = await fetch(`/api/tasks/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) throw new Error('Failed to update event');
      return await response.json();
    } else {
      // Mock update
      const eventIndex = this.context.events.findIndex(e => e.id === eventId);
      if (eventIndex !== -1) {
        this.context.events[eventIndex] = { ...this.context.events[eventIndex], ...updates };
      }
    }
  }

  async deleteEvent() {
    if (!this.canDelete()) return;
    
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    try {
      const apiAvailable = await this.checkAPI();
      
      if (apiAvailable) {
        const response = await fetch(`/api/tasks/${this.currentEvent.id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to delete event');
      } else {
        // Mock deletion
        this.context.events = this.context.events.filter(e => e.id !== this.currentEvent.id);
      }
      
      this.closeEventModal();
      this.refreshCalendar();
    } catch (error) {
      console.error('Failed to delete event:', error);
      this.showError('Failed to delete event. Please try again.');
    }
  }

  refreshCalendar() {
    if (this.calendar) {
      this.calendar.removeAllEvents();
      this.calendar.addEventSource(this.mapToFullCalendarEvents());
    }
  }

  checkConflicts() {
    const form = document.getElementById('eventForm');
    const formData = new FormData(form);
    
    const startDate = new Date(`${formData.get('startDate')}T${formData.get('startTime')}:00`);
    const endDate = new Date(`${formData.get('endDate')}T${formData.get('endTime')}:00`);
    const assignees = Array.from(formData.getAll('assignees'));
    
    const conflicts = this.findConflicts(startDate, endDate, assignees, this.currentEvent?.id);
    
    const warning = document.getElementById('conflictWarning');
    if (conflicts.length > 0) {
      warning.style.display = 'block';
      warning.textContent = `⚠️ ${conflicts.length} conflict(s) detected for assigned staff`;
    } else {
      warning.style.display = 'none';
    }
  }

  findConflicts(start, end, assignees, excludeEventId = null) {
    const conflicts = [];
    
    this.context.events.forEach(event => {
      if (event.id === excludeEventId) return;
      
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      
      // Check if time ranges overlap
      if (start < eventEnd && end > eventStart) {
        // Check if any assignees overlap
        const overlappingAssignees = event.assignees.filter(assignee => 
          assignees.includes(assignee)
        );
        
        if (overlappingAssignees.length > 0) {
          conflicts.push({
            event,
            assignees: overlappingAssignees
          });
        }
      }
    });
    
    return conflicts;
  }

  exportICS() {
    const events = this.mapToFullCalendarEvents();
    const view = this.calendar.view;
    const start = view.activeStart;
    const end = view.activeEnd;
    
    // Filter events to current view
    const visibleEvents = events.filter(event => {
      const eventStart = new Date(event.start);
      return eventStart >= start && eventStart <= end;
    });
    
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//TBS//TBS Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];
    
    visibleEvents.forEach(event => {
      const startDate = new Date(event.start).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const endDate = new Date(event.end).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      
      icsContent.push(
        'BEGIN:VEVENT',
        `UID:${event.id}@tbs.local`,
        `DTSTART:${startDate}`,
        `DTEND:${endDate}`,
        `SUMMARY:${event.title}`,
        `DESCRIPTION:Project: ${this.getProjectName(event.extendedProps.projectId)}\\nStatus: ${event.extendedProps.status}\\nNotes: ${event.extendedProps.notes || 'None'}`,
        `STATUS:${event.extendedProps.status.toUpperCase()}`,
        'END:VEVENT'
      );
    });
    
    icsContent.push('END:VCALENDAR');
    
    // Download file
    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tbs-calendar-${new Date().toISOString().split('T')[0]}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  getProjectName(projectId) {
    const project = this.context.projects.find(p => p.id === projectId);
    return project ? project.name : 'Unknown Project';
  }

  showError(message) {
    // Simple error display - could be enhanced with a proper notification system
    alert(message);
  }
}

// Initialize calendar when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new TBSCalendar();
});

// Export for potential external use
window.TBSCalendar = TBSCalendar;
