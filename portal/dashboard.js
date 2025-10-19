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
    // Compute metrics from mock data
    const [projects, tasks, invoices, expenses, items] = await Promise.all([
      safe(api.get('/api/projects'), []),
      safe(api.get('/api/tasks'), []),
      safe(api.get('/api/finance/invoices'), []),
      safe(api.get('/api/finance/expenses'), []),
      safe(api.get('/api/warehouse/items'), [])
    ]);

    const today = new Date();
    const thisWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return {
      activeProjects: projects.filter(p => p.status === 'active').length,
      tasksDueToday: tasks.filter(t => {
        const dueDate = new Date(t.end_date || t.end);
        return dueDate.toDateString() === today.toDateString();
      }).length,
      tasksDueThisWeek: tasks.filter(t => {
        const dueDate = new Date(t.end_date || t.end);
        return dueDate <= thisWeek && dueDate >= today;
      }).length,
      blockedTasks: tasks.filter(t => t.status === 'blocked').length,
      lowStockItems: items.filter(i => i.minQty && i.qty <= i.minQty).length,
      outstandingInvoices: invoices.filter(i => i.status !== 'paid').length,
      outstandingAmount: invoices
        .filter(i => i.status !== 'paid')
        .reduce((total, inv) => total + inv.amount, 0),
      totalExpenses: expenses.reduce((total, exp) => total + exp.amount, 0),
      netPosition: invoices.reduce((total, inv) => total + inv.amount, 0) - 
                   expenses.reduce((total, exp) => total + exp.amount, 0)
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

    container.innerHTML = this.createDashboardHTML();
  }

  createDashboardHTML() {
    return `
      <div class="dashboard-module">
        <div class="dashboard-header">
          <h2>TBS Dashboard</h2>
          <div class="dashboard-weather">
            ${this.createWeatherWidget()}
          </div>
        </div>

        <div class="metrics-grid">
          ${this.createMetricsCards()}
        </div>

        <div class="dashboard-content">
          <div class="dashboard-section">
            <h3>Recent Activity</h3>
            <div class="activity-feed">
              ${this.createActivityFeed()}
            </div>
          </div>
          
          <div class="dashboard-section">
            <h3>Quick Actions</h3>
            <div class="quick-actions">
              ${this.createQuickActions()}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  createWeatherWidget() {
    if (!this.weather) return '';
    
    const weatherIcon = this.getWeatherIcon(this.weather.condition);
    
    return `
      <div class="weather-widget">
        <div class="weather-icon">${weatherIcon}</div>
        <div class="weather-info">
          <div class="weather-temp">${this.weather.temperature}°C</div>
          <div class="weather-location">${this.weather.location}</div>
          <div class="weather-precipitation">${this.weather.precipitation}% rain</div>
        </div>
      </div>
    `;
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

  createMetricsCards() {
    const cards = [
      {
        title: 'Active Projects',
        value: this.metrics.activeProjects || 0,
        icon: '🏗️',
        color: 'blue',
        trend: '+2 this week'
      },
      {
        title: 'Tasks Due Today',
        value: this.metrics.tasksDueToday || 0,
        icon: '📅',
        color: this.metrics.tasksDueToday > 5 ? 'red' : 'green',
        trend: this.metrics.tasksDueToday > 0 ? 'Due today' : 'All caught up'
      },
      {
        title: 'Tasks This Week',
        value: this.metrics.tasksDueThisWeek || 0,
        icon: '📋',
        color: 'orange',
        trend: 'Next 7 days'
      },
      {
        title: 'Blocked Tasks',
        value: this.metrics.blockedTasks || 0,
        icon: '⚠️',
        color: this.metrics.blockedTasks > 0 ? 'red' : 'green',
        trend: this.metrics.blockedTasks > 0 ? 'Needs attention' : 'All clear'
      },
      {
        title: 'Low Stock Items',
        value: this.metrics.lowStockItems || 0,
        icon: '📦',
        color: this.metrics.lowStockItems > 0 ? 'red' : 'green',
        trend: this.metrics.lowStockItems > 0 ? 'Reorder needed' : 'Stock OK'
      },
      {
        title: 'Outstanding Invoices',
        value: this.metrics.outstandingInvoices || 0,
        icon: '💰',
        color: 'blue',
        trend: `£${(this.metrics.outstandingAmount || 0).toLocaleString()}`
      }
    ];

    return cards.map(card => `
      <div class="metric-card ${card.color}">
        <div class="metric-header">
          <div class="metric-icon">${card.icon}</div>
          <div class="metric-title">${card.title}</div>
        </div>
        <div class="metric-value">${card.value}</div>
        <div class="metric-trend">${card.trend}</div>
      </div>
    `).join('');
  }

  createActivityFeed() {
    // Mock activity feed
    const activities = [
      { type: 'task', message: 'Task "Kitchen Renovation" completed', time: '2 hours ago', user: 'Pat' },
      { type: 'invoice', message: 'Invoice INV-2025-001 sent to client', time: '4 hours ago', user: 'Danny' },
      { type: 'stock', message: 'Low stock alert: 2x4 Timber', time: '6 hours ago', user: 'System' },
      { type: 'project', message: 'New project "82 Walpole Road" started', time: '1 day ago', user: 'Danny' },
      { type: 'photo', message: '5 photos uploaded to Crown Road project', time: '2 days ago', user: 'Adam' }
    ];

    return activities.map(activity => `
      <div class="activity-item">
        <div class="activity-icon">${this.getActivityIcon(activity.type)}</div>
        <div class="activity-content">
          <div class="activity-message">${activity.message}</div>
          <div class="activity-meta">${activity.time} • ${activity.user}</div>
        </div>
      </div>
    `).join('');
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
