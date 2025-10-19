// TBS Dashboard Statistics Module
// Live metrics, KPIs, and overview data

import { api, safe, loadMockData } from './lib/api.js';
import { getUserRole } from './lib/rbac.js';

class DashboardManager {
  constructor() {
    this.metrics = {};
    this.weather = null;
    this.switchToMock = false; // Toggle for development
  }

  async init() {
    await this.loadDashboardData();
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
      this.metrics = await safe(
        api.get('/api/metrics/overview'),
        await this.computeMockMetrics()
      );

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
    // Any additional event listeners can be added here
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new DashboardManager().init();
});
