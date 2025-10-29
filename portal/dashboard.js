// TBS Dashboard Statistics Module
// Live metrics, KPIs, and overview data

import { api, safe, loadMockData } from './lib/api.js';
import { getUserRole } from './lib/rbac.js';

class DashboardManager {
  constructor() {
    this.metrics = {};
    this.weather = null;
    this.outstandingTasks = [];
    this.switchToMock = false; // Toggle for development
  }

  async init() {
    await this.loadDashboardData();
    await this.loadOutstandingTasks();
    this.render();
    this.setupEventListeners();
    
    // Initialize activity carousel after render
    setTimeout(() => {
      this.initActivityCarousel();
    }, 100);
    
    // Refresh data every 5 minutes
    setInterval(() => this.loadDashboardData(), 5 * 60 * 1000);
  }

  async loadDashboardData() {
    try {
      // Load metrics
      try {
        this.metrics = await api.get('/api/metrics/overview');
        console.log('Metrics loaded successfully:', this.metrics);
      } catch (error) {
        console.warn('Metrics API failed, using mock data:', error);
        this.metrics = await this.computeMockMetrics();
      }

      // Load weather
      this.weather = await this.loadWeatherData();
      
      this.render();
    } catch (error) {
      console.warn('Dashboard data failed, using mock data:', error);
      this.metrics = await this.computeMockMetrics();
      this.weather = await this.loadMockWeather();
      this.render();
    }
  }

  async loadOutstandingTasks() {
    try {
      // Load outstanding tasks (not done) using centralized API helper
      this.outstandingTasks = await api.get('/api/tasks?status=todo,in_progress,blocked');
    } catch (error) {
      console.warn('Tasks API failed, using mock data:', error);
      this.outstandingTasks = await this.loadMockTasks();
    }
  }

  async loadMockTasks() {
    const mock = await loadMockData('calendar');
    return mock.events.map(event => ({
      id: event.id,
      title: event.title,
      status: event.status,
      priority: 'medium',
      due_date: event.end,
      project_ref: event.projectId,
      staff_name: event.assignees ? event.assignees.join(', ') : null,
      created_at: event.start
    }));
  }

  async computeMockMetrics() {
    // Return static mock metrics when API is unavailable
    return {
      activeProjects: 2,
      tasksDueToday: 3,
      tasksDueThisWeek: 8,
      blockedTasks: 1,
      lowStockItems: 2,
      outstandingInvoices: 4,
      outstandingAmount: 12500,
      totalExpenses: 8500,
      netPosition: 4000
    };
  }

  async loadWeatherData() {
    try {
      // Try to get weather for a default location (London)
      const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=51.5074&longitude=-0.1278&current_weather=true&hourly=temperature_2m,precipitation_probability&timezone=Europe%2FLondon');
      if (response.ok) {
        const data = await response.json();
        return {
          temperature: Math.round(data.current_weather.temperature),
          condition: this.getWeatherCondition(data.current_weather.weathercode),
          precipitation: data.hourly.precipitation_probability[0] || 0,
          location: 'London'
        };
      }
    } catch (error) {
      console.warn('Weather API failed:', error);
    }
    
    return await this.loadMockWeather();
  }

  async loadMockWeather() {
    return {
      temperature: 15,
      condition: 'partly_cloudy',
      precipitation: 20,
      location: 'London'
    };
  }

  getWeatherCondition(code) {
    const conditions = {
      0: 'clear',
      1: 'mostly_clear',
      2: 'partly_cloudy',
      3: 'overcast',
      45: 'fog',
      48: 'fog',
      51: 'drizzle',
      53: 'drizzle',
      55: 'drizzle',
      61: 'rain',
      63: 'rain',
      65: 'rain',
      71: 'snow',
      73: 'snow',
      75: 'snow',
      80: 'rain_showers',
      81: 'rain_showers',
      82: 'rain_showers',
      85: 'snow_showers',
      86: 'snow_showers',
      95: 'thunderstorm',
      96: 'thunderstorm',
      99: 'thunderstorm'
    };
    return conditions[code] || 'unknown';
  }

  render() {
    const container = document.getElementById('dashboardContainer');
    if (!container) return;

    // Check if already rendered
    if (container.querySelector('.metrics-panel')) {
      return; // Already rendered
    }

    container.innerHTML = this.createDashboardHTML();
    
    // Render outstanding tasks
    this.renderOutstandingTasks();
  }

  createDashboardHTML() {
    return `
      <!-- Compact Metrics Row -->
      <section class="panel metrics-panel">
        <h3>Key Metrics</h3>
        <div class="metrics-row">
          ${this.createCompactMetrics()}
        </div>
      </section>


      <!-- Quick Actions Panel -->
      <section class="panel actions-panel">
        <h3>Quick Actions</h3>
        <div class="quick-actions">
          ${this.createQuickActions()}
        </div>
      </section>
    `;
  }

  createCompactMetrics() {
    const metrics = [
      {
        title: 'Active Projects',
        value: this.metrics.activeProjects || 0,
        icon: '🏗️',
        color: 'blue'
      },
      {
        title: 'Tasks Due Today',
        value: this.metrics.tasksDueToday || 0,
        icon: '📅',
        color: this.metrics.tasksDueToday > 5 ? 'red' : 'green'
      },
      {
        title: 'Blocked Tasks',
        value: this.metrics.blockedTasks || 0,
        icon: '⚠️',
        color: this.metrics.blockedTasks > 0 ? 'red' : 'green'
      },
      {
        title: 'Low Stock',
        value: this.metrics.lowStockItems || 0,
        icon: '📦',
        color: this.metrics.lowStockItems > 0 ? 'red' : 'green'
      },
      {
        title: 'Outstanding Invoices',
        value: this.metrics.outstandingInvoices || 0,
        icon: '💰',
        color: 'blue'
      }
    ];

    return metrics.map(metric => `
      <div class="compact-metric ${metric.color}">
        <div class="metric-icon">${metric.icon}</div>
        <div class="metric-info">
          <div class="metric-value">${metric.value}</div>
          <div class="metric-title">${metric.title}</div>
        </div>
      </div>
    `).join('');
  }

  getWeatherIcon(condition) {
    const icons = {
      clear: '☀️',
      mostly_clear: '🌤️',
      partly_cloudy: '⛅',
      overcast: '☁️',
      fog: '🌫️',
      drizzle: '🌦️',
      rain: '🌧️',
      snow: '❄️',
      rain_showers: '🌦️',
      snow_showers: '🌨️',
      thunderstorm: '⛈️',
      unknown: '❓'
    };
    return icons[condition] || icons.unknown;
  }


  createActivityFeed() {
    // Mock activity feed with 7 items
    const activities = [
      { type: 'task', message: 'Task "Kitchen Renovation" completed', time: '2 hours ago', user: 'Pat' },
      { type: 'invoice', message: 'Invoice INV-2025-001 sent to client', time: '4 hours ago', user: 'Danny' },
      { type: 'stock', message: 'Low stock alert: 2x4 Timber', time: '6 hours ago', user: 'System' },
      { type: 'project', message: 'New project "82 Walpole Road" started', time: '1 day ago', user: 'Danny' },
      { type: 'photo', message: '5 photos uploaded to Crown Road project', time: '2 days ago', user: 'Adam' },
      { type: 'staff', message: 'Charlie clocked in for the day', time: '2 days ago', user: 'System' },
      { type: 'material', message: 'Cement delivery received', time: '2 days ago', user: 'Adam' }
    ];

    // Initialize carousel with first 2 items
    this.activities = activities;
    this.currentActivityIndex = 0;
    this.itemsPerView = 2;

    return this.renderActivityItems();
  }

  renderActivityItems() {
    if (!this.activities || !Array.isArray(this.activities)) {
      return '<div class="activity-item">No activities available</div>';
    }
    
    const startIndex = this.currentActivityIndex || 0;
    const endIndex = Math.min(startIndex + (this.itemsPerView || 2), this.activities.length);
    
    return this.activities.slice(startIndex, endIndex).map((activity, index) => `
      <div class="activity-item active" style="animation-delay: ${index * 0.1}s">
        <div class="activity-icon">${this.getActivityIcon(activity.type)}</div>
        <div class="activity-content">
          <div class="activity-message">${activity.message}</div>
          <div class="activity-meta">${activity.time} • ${activity.user}</div>
        </div>
      </div>
    `).join('');
  }

  initActivityCarousel() {
    const prevBtn = document.getElementById('activityPrev');
    const nextBtn = document.getElementById('activityNext');
    const counter = document.getElementById('activityCounter');
    const itemsContainer = document.getElementById('activityItems');

    if (!prevBtn || !nextBtn || !counter || !itemsContainer) return;

    // Ensure activities are initialized
    if (!this.activities || !Array.isArray(this.activities)) {
      this.createActivityFeed();
    }

    const updateCarousel = () => {
      itemsContainer.innerHTML = this.renderActivityItems();
      if (this.activities && Array.isArray(this.activities)) {
        const startIndex = (this.currentActivityIndex || 0) + 1;
        const endIndex = Math.min((this.currentActivityIndex || 0) + (this.itemsPerView || 2), this.activities.length);
        counter.textContent = `${startIndex}-${endIndex} of ${this.activities.length}`;
        
        // Disable buttons at boundaries
        prevBtn.disabled = (this.currentActivityIndex || 0) === 0;
        nextBtn.disabled = (this.currentActivityIndex || 0) + (this.itemsPerView || 2) >= this.activities.length;
      } else {
        counter.textContent = '0-0 of 0';
        prevBtn.disabled = true;
        nextBtn.disabled = true;
      }
    };

    prevBtn.addEventListener('click', () => {
      if (this.activities && Array.isArray(this.activities) && (this.currentActivityIndex || 0) > 0) {
        this.currentActivityIndex = Math.max(0, (this.currentActivityIndex || 0) - (this.itemsPerView || 2));
        updateCarousel();
      }
    });

    nextBtn.addEventListener('click', () => {
      if (this.activities && Array.isArray(this.activities)) {
        if ((this.currentActivityIndex || 0) + (this.itemsPerView || 2) < this.activities.length) {
          this.currentActivityIndex = Math.min(
            this.activities.length - (this.itemsPerView || 2),
            (this.currentActivityIndex || 0) + (this.itemsPerView || 2)
          );
          updateCarousel();
        } else {
          this.currentActivityIndex = 0;
          updateCarousel();
        }
      }
    });

    // Auto-advance every 10 seconds
    setInterval(() => {
      if (this.activities && Array.isArray(this.activities)) {
        if ((this.currentActivityIndex || 0) + (this.itemsPerView || 2) < this.activities.length) {
          this.currentActivityIndex = Math.min(
            this.activities.length - (this.itemsPerView || 2),
            (this.currentActivityIndex || 0) + (this.itemsPerView || 2)
          );
          updateCarousel();
        } else {
          // Loop back to start
          this.currentActivityIndex = 0;
          updateCarousel();
        }
      }
    }, 10000);

    // Initial update
    updateCarousel();
  }

  getActivityIcon(type) {
    const icons = {
      task: '✅',
      invoice: '💰',
      stock: '📦',
      project: '🏗️',
      photo: '📸',
      contractor: '👷'
    };
    return icons[type] || '📝';
  }

  createQuickActions() {
    const actions = [
      { title: 'Create Task', icon: '➕', action: 'window.location.href="/portal/calendar.html"' },
      { title: 'Add Project', icon: '🏗️', action: 'window.location.href="/portal/projects.html"' },
      { title: 'Issue Stock', icon: '📦', action: 'window.location.href="/portal/warehouse.html"' },
      { title: 'Create Invoice', icon: '💰', action: 'window.location.href="/portal/finance.html"' },
      { title: 'Add Contractor', icon: '👷', action: 'window.location.href="/portal/contractors.html"' },
      { title: 'View Calendar', icon: '📅', action: 'window.location.href="/portal/calendar.html"' }
    ];

    return actions.map(action => `
      <button class="quick-action-btn" onclick="${action.action}">
        <span class="action-icon">${action.icon}</span>
        <span class="action-title">${action.title}</span>
      </button>
    `).join('');
  }

  setupEventListeners() {
    // Outstanding tasks filters
    const taskFilter = document.getElementById('taskFilter');
    const priorityFilter = document.getElementById('priorityFilter');
    
    if (taskFilter) {
      taskFilter.addEventListener('change', () => this.filterTasks());
    }
    
    if (priorityFilter) {
      priorityFilter.addEventListener('change', () => this.filterTasks());
    }
  }

  renderOutstandingTasks() {
    const tasksList = document.getElementById('tasksList');
    if (!tasksList) return;

    const filteredTasks = this.getFilteredTasks();
    
    if (filteredTasks.length === 0) {
      tasksList.innerHTML = '<div class="no-data">No outstanding tasks found</div>';
      return;
    }

    tasksList.innerHTML = filteredTasks.map(task => this.createTaskItemHTML(task)).join('');
  }

  getFilteredTasks() {
    let filtered = [...this.outstandingTasks];
    
    const statusFilter = document.getElementById('taskFilter')?.value;
    const priorityFilter = document.getElementById('priorityFilter')?.value;
    
    if (statusFilter) {
      filtered = filtered.filter(task => task.status === statusFilter);
    }
    
    if (priorityFilter) {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }
    
    // Sort by priority and due date
    filtered.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority] || 2;
      const bPriority = priorityOrder[b.priority] || 2;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      if (a.due_date && b.due_date) {
        return new Date(a.due_date) - new Date(b.due_date);
      }
      
      return 0;
    });
    
    return filtered.slice(0, 10); // Show top 10 tasks
  }

  createTaskItemHTML(task) {
    const dueDate = task.due_date ? new Date(task.due_date) : null;
    const now = new Date();
    const isOverdue = dueDate && dueDate < now;
    const isDueSoon = dueDate && dueDate <= new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    const dueDateClass = isOverdue ? 'overdue' : isDueSoon ? 'due-soon' : '';
    const dueDateText = dueDate ? dueDate.toLocaleDateString() : 'No due date';
    
    return `
      <div class="task-item-compact" data-task-id="${task.id}">
        <div class="task-priority priority-${task.priority}"></div>
        <div class="task-content">
          <div class="task-title">${task.title}</div>
          <div class="task-meta">
            <span class="task-project">${task.project_ref || 'Unknown Project'}</span>
            <span class="task-status-badge status-${task.status}">${task.status.replace('_', ' ')}</span>
            ${task.staff_name ? `
              <div class="task-assignee">
                <div class="task-assignee-avatar">${task.staff_name.charAt(0)}</div>
                <span>${task.staff_name}</span>
              </div>
            ` : ''}
            <div class="task-due-date ${dueDateClass}">
              <span>📅</span>
              <span>${dueDateText}</span>
            </div>
          </div>
        </div>
        <div class="task-actions">
          <button class="task-action-btn" onclick="window.markTaskComplete('${task.id}')" title="Mark Complete">
            ✓
          </button>
          <button class="task-action-btn" onclick="window.viewTaskDetails('${task.id}')" title="View Details">
            👁
          </button>
        </div>
      </div>
    `;
  }

  filterTasks() {
    this.renderOutstandingTasks();
  }
}

// Initialize dashboard when DOM is loaded or when page becomes visible
let dashboardManager = null;

function initDashboard() {
  if (dashboardManager) {
    // Clean up existing instance
    dashboardManager = null;
  }
  dashboardManager = new DashboardManager();
  dashboardManager.init();
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', initDashboard);

// Re-initialize when page becomes visible (navigation back to dashboard)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && location.pathname.endsWith('/dashboard.html')) {
    initDashboard();
  }
});

// Also re-initialize on focus (when user clicks back to tab)
window.addEventListener('focus', () => {
  if (location.pathname.endsWith('/dashboard.html')) {
    initDashboard();
  }
});

// Global functions for task actions
window.markTaskComplete = async (taskId) => {
  try {
    await api.patch(`/api/tasks/${taskId}`, { status: 'done' });
    
    // Refresh the outstanding tasks
    if (dashboardManager) {
      await dashboardManager.loadOutstandingTasks();
      dashboardManager.renderOutstandingTasks();
    }
  } catch (error) {
    console.error('Error marking task complete:', error);
    alert('Error marking task as complete');
  }
};

window.viewTaskDetails = (taskId) => {
  // Navigate to projects page with task filter
  sessionStorage.setItem('taskFilter', JSON.stringify({ taskId }));
  location.href = "/portal/projects.html";
};
