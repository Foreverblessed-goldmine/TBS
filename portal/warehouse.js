// TBS Warehouse Management Module
// Handles inventory tracking, stock movements, and low-stock alerts

import { api, safe, loadMockData } from './lib/api.js';
import { canManageWarehouse, getUserRole } from './lib/rbac.js';
import { openModal } from './components/modal.js';

class WarehouseManager {
  constructor() {
    this.items = [];
    this.movements = [];
    this.currentFilter = 'all';
    this.switchToMock = false; // Toggle for development
  }

  async init() {
    await this.loadWarehouseData();
    this.render();
    this.setupEventListeners();
  }

  async loadWarehouseData() {
    if (this.switchToMock) {
      const mock = await loadMockData('warehouse');
      this.items = mock.items || [];
      this.movements = mock.movements || [];
      return;
    }

    try {
      const [items, movements] = await Promise.all([
        safe(api.get('/api/warehouse/items'), []),
        safe(api.get('/api/warehouse/movements'), [])
      ]);
      
      this.items = items;
      this.movements = movements;
    } catch (error) {
      console.warn('Warehouse API failed, using mock data:', error);
      const mock = await loadMockData('warehouse');
      this.items = mock.items || [];
      this.movements = mock.movements || [];
    }
  }

  render() {
    const container = document.getElementById('warehouseContainer');
    if (!container) return;

    container.innerHTML = this.createWarehouseHTML();
  }

  createWarehouseHTML() {
    const lowStockItems = this.getLowStockItems();
    
    return `
      <div class="warehouse-module">
        <div class="warehouse-header">
          <h2>Warehouse Management</h2>
          <div class="warehouse-summary">
            <div class="summary-card">
              <h3>Total Items</h3>
              <p class="summary-count">${this.items.length}</p>
            </div>
            <div class="summary-card">
              <h3>Low Stock</h3>
              <p class="summary-count ${lowStockItems.length > 0 ? 'warning' : ''}">${lowStockItems.length}</p>
            </div>
            <div class="summary-card">
              <h3>Total Value</h3>
              <p class="summary-count">£${this.getTotalValue().toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div class="warehouse-controls">
          <div class="search-filter">
            <input type="text" id="itemSearch" placeholder="Search items..." class="search-input">
            <select id="categoryFilter" class="filter-select">
              <option value="">All Categories</option>
              <option value="timber">Timber</option>
              <option value="materials">Materials</option>
              <option value="electrical">Electrical</option>
              <option value="tools">Tools</option>
            </select>
            <button class="btn btn-secondary" onclick="window.toggleLowStock()">
              ${this.currentFilter === 'lowstock' ? 'Show All' : 'Low Stock Only'}
            </button>
          </div>
          <div class="warehouse-actions">
            ${canManageWarehouse(getUserRole()) ? `
              <button class="btn btn-primary" onclick="window.addItem()">
                Add Item
              </button>
              <button class="btn btn-secondary" onclick="window.issueToProject()">
                Issue to Project
              </button>
            ` : ''}
          </div>
        </div>

        <div class="warehouse-content">
          <div class="items-grid">
            ${this.items.length > 0 ? 
              this.getFilteredItems().map(item => this.createItemCard(item)).join('') :
              '<p class="no-data">No items found.</p>'
            }
          </div>
        </div>
      </div>
    `;
  }

  createItemCard(item) {
    const isLowStock = item.minQty && item.qty <= item.minQty;
    const stockStatus = isLowStock ? 'low' : item.qty === 0 ? 'out' : 'ok';
    
    return `
      <div class="item-card ${stockStatus}" data-item-id="${item.id}">
        <div class="item-header">
          <div class="item-info">
            <h4>${item.name}</h4>
            <span class="category-badge">${item.category}</span>
          </div>
          <div class="item-status">
            <span class="stock-indicator ${stockStatus}">
              ${stockStatus === 'low' ? '⚠️' : stockStatus === 'out' ? '❌' : '✅'}
            </span>
          </div>
        </div>
        
        <div class="item-details">
          <div class="stock-info">
            <p><strong>Stock:</strong> ${item.qty} ${item.unit}</p>
            ${item.minQty ? `<p><strong>Min:</strong> ${item.minQty} ${item.unit}</p>` : ''}
            <p><strong>Location:</strong> ${item.location}</p>
          </div>
          
          ${item.description ? `
            <div class="item-description">
              <p>${item.description}</p>
            </div>
          ` : ''}
        </div>
        
        <div class="item-actions">
          <button class="btn btn-secondary btn-sm" onclick="window.viewItemHistory('${item.id}')">
            History
          </button>
          ${canManageWarehouse(getUserRole()) ? `
            <button class="btn btn-primary btn-sm" onclick="window.adjustStock('${item.id}')">
              Adjust
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  getFilteredItems() {
    let filtered = [...this.items];
    
    // Apply search filter
    const searchTerm = document.getElementById('itemSearch')?.value.toLowerCase() || '';
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchTerm) ||
        item.description?.toLowerCase().includes(searchTerm)
      );
    }
    
    // Apply category filter
    const category = document.getElementById('categoryFilter')?.value || '';
    if (category) {
      filtered = filtered.filter(item => item.category === category);
    }
    
    // Apply low stock filter
    if (this.currentFilter === 'lowstock') {
      filtered = filtered.filter(item => item.minQty && item.qty <= item.minQty);
    }
    
    return filtered;
  }

  getLowStockItems() {
    return this.items.filter(item => item.minQty && item.qty <= item.minQty);
  }

  getTotalValue() {
    // Mock calculation - in real app would use item costs
    return this.items.reduce((total, item) => total + (item.qty * 10), 0);
  }

  setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('itemSearch');
    const categoryFilter = document.getElementById('categoryFilter');
    
    if (searchInput) {
      searchInput.addEventListener('input', () => this.render());
    }
    
    if (categoryFilter) {
      categoryFilter.addEventListener('change', () => this.render());
    }
  }
}

// Global functions for warehouse actions
window.toggleLowStock = () => {
  const manager = new WarehouseManager();
  manager.currentFilter = manager.currentFilter === 'lowstock' ? 'all' : 'lowstock';
  manager.init();
};

window.addItem = async () => {
  const bodyNode = createItemFormNode();
  
  await openModal({
    title: 'Add New Item',
    bodyNode,
    size: 'medium',
    actions: [
      {
        label: 'Cancel',
        kind: 'secondary',
        onClick: () => {}
      },
      {
        label: 'Save',
        kind: 'primary',
        onClick: () => saveItem()
      }
    ]
  });
};

window.adjustStock = async (itemId) => {
  const manager = new WarehouseManager();
  await manager.loadWarehouseData();
  const item = manager.items.find(i => i.id === itemId);
  
  if (!item) {
    alert('Item not found');
    return;
  }

  const bodyNode = createStockAdjustmentNode(item);
  
  await openModal({
    title: `Adjust Stock - ${item.name}`,
    bodyNode,
    size: 'medium',
    actions: [
      {
        label: 'Cancel',
        kind: 'secondary',
        onClick: () => {}
      },
      {
        label: 'Adjust',
        kind: 'primary',
        onClick: () => adjustItemStock(itemId)
      }
    ]
  });
};

window.viewItemHistory = async (itemId) => {
  const manager = new WarehouseManager();
  await manager.loadWarehouseData();
  const item = manager.items.find(i => i.id === itemId);
  const itemMovements = manager.movements.filter(m => m.itemId === itemId);
  
  if (!item) {
    alert('Item not found');
    return;
  }

  const bodyNode = createItemHistoryNode(item, itemMovements);
  
  await openModal({
    title: `Stock History - ${item.name}`,
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
};

window.issueToProject = async () => {
  // Load projects for selection
  const projects = await safe(api.get('/api/projects'), []);
  
  const bodyNode = createIssueToProjectNode(projects);
  
  await openModal({
    title: 'Issue Items to Project',
    bodyNode,
    size: 'large',
    actions: [
      {
        label: 'Cancel',
        kind: 'secondary',
        onClick: () => {}
      },
      {
        label: 'Issue Items',
        kind: 'primary',
        onClick: () => issueItemsToProject()
      }
    ]
  });
};

function createItemFormNode(item = null) {
  const div = document.createElement('div');
  div.className = 'item-form';
  
  div.innerHTML = `
    <form id="itemForm">
      <div class="form-group">
        <label for="itemName">Item Name *</label>
        <input type="text" id="itemName" name="name" required 
               value="${item ? item.name : ''}">
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="itemCategory">Category *</label>
          <select id="itemCategory" name="category" required>
            <option value="">Select Category</option>
            <option value="timber" ${item && item.category === 'timber' ? 'selected' : ''}>Timber</option>
            <option value="materials" ${item && item.category === 'materials' ? 'selected' : ''}>Materials</option>
            <option value="electrical" ${item && item.category === 'electrical' ? 'selected' : ''}>Electrical</option>
            <option value="tools" ${item && item.category === 'tools' ? 'selected' : ''}>Tools</option>
          </select>
        </div>
        <div class="form-group">
          <label for="itemUnit">Unit *</label>
          <input type="text" id="itemUnit" name="unit" required 
                 value="${item ? item.unit : ''}" placeholder="e.g., length, bag, meter">
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="itemQty">Current Quantity *</label>
          <input type="number" id="itemQty" name="qty" min="0" required 
                 value="${item ? item.qty : ''}">
        </div>
        <div class="form-group">
          <label for="itemMinQty">Minimum Quantity</label>
          <input type="number" id="itemMinQty" name="minQty" min="0" 
                 value="${item ? item.minQty : ''}">
        </div>
      </div>
      
      <div class="form-group">
        <label for="itemLocation">Location *</label>
        <input type="text" id="itemLocation" name="location" required 
               value="${item ? item.location : ''}" placeholder="e.g., Main Shed, Tool Shed">
      </div>
      
      <div class="form-group">
        <label for="itemDescription">Description</label>
        <textarea id="itemDescription" name="description" rows="3" 
                  placeholder="Additional details about this item...">${item ? item.description : ''}</textarea>
      </div>
    </form>
  `;
  
  return div;
}

function createStockAdjustmentNode(item) {
  const div = document.createElement('div');
  div.className = 'stock-adjustment-form';
  
  div.innerHTML = `
    <div class="current-stock">
      <p><strong>Current Stock:</strong> ${item.qty} ${item.unit}</p>
    </div>
    
    <form id="stockAdjustmentForm">
      <div class="form-group">
        <label for="adjustmentType">Adjustment Type *</label>
        <select id="adjustmentType" name="type" required>
          <option value="">Select Type</option>
          <option value="in">Stock In</option>
          <option value="out">Stock Out</option>
          <option value="transfer">Transfer</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="adjustmentQty">Quantity *</label>
        <input type="number" id="adjustmentQty" name="qty" min="0" step="0.01" required>
      </div>
      
      <div class="form-group">
        <label for="adjustmentRef">Reference</label>
        <input type="text" id="adjustmentRef" name="ref" placeholder="Project ID, PO number, etc.">
      </div>
      
      <div class="form-group">
        <label for="adjustmentNote">Note</label>
        <textarea id="adjustmentNote" name="note" rows="3" 
                  placeholder="Reason for adjustment..."></textarea>
      </div>
    </form>
  `;
  
  return div;
}

function createItemHistoryNode(item, movements) {
  const div = document.createElement('div');
  div.className = 'item-history';
  
  const movementsHTML = movements.length > 0 ? 
    movements.map(movement => `
      <tr>
        <td>${new Date(movement.date).toLocaleDateString()}</td>
        <td><span class="movement-type ${movement.type}">${movement.type.toUpperCase()}</span></td>
        <td>${movement.qty}</td>
        <td>${movement.ref || '—'}</td>
        <td>${movement.note || '—'}</td>
      </tr>
    `).join('') :
    '<tr><td colspan="5" class="no-data">No movements recorded</td></tr>';
  
  div.innerHTML = `
    <div class="item-summary">
      <h4>${item.name}</h4>
      <p><strong>Current Stock:</strong> ${item.qty} ${item.unit}</p>
      <p><strong>Location:</strong> ${item.location}</p>
    </div>
    
    <div class="movements-table">
      <h4>Stock Movements</h4>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Quantity</th>
            <th>Reference</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          ${movementsHTML}
        </tbody>
      </table>
    </div>
  `;
  
  return div;
}

function createIssueToProjectNode(projects) {
  const div = document.createElement('div');
  div.className = 'issue-to-project-form';
  
  const projectOptions = projects.map(p => 
    `<option value="${p.id}">${p.name || p.ref || p.address}</option>`
  ).join('');
  
  div.innerHTML = `
    <form id="issueToProjectForm">
      <div class="form-group">
        <label for="issueProject">Project *</label>
        <select id="issueProject" name="projectId" required>
          <option value="">Select Project</option>
          ${projectOptions}
        </select>
      </div>
      
      <div class="form-group">
        <label for="issueNote">Issue Note</label>
        <textarea id="issueNote" name="note" rows="3" 
                  placeholder="Reason for issuing items..."></textarea>
      </div>
      
      <div id="itemsToIssue">
        <h4>Items to Issue</h4>
        <div class="issue-items-list">
          <p class="help-text">Select items and quantities to issue to the project.</p>
        </div>
      </div>
    </form>
  `;
  
  return div;
}

async function saveItem() {
  const form = document.getElementById('itemForm');
  if (!form) return;
  
  const formData = new FormData(form);
  const itemData = {
    name: formData.get('name'),
    category: formData.get('category'),
    unit: formData.get('unit'),
    qty: parseInt(formData.get('qty')),
    minQty: formData.get('minQty') ? parseInt(formData.get('minQty')) : null,
    location: formData.get('location'),
    description: formData.get('description') || ''
  };
  
  try {
    await api.post('/api/warehouse/items', itemData);
    location.reload();
  } catch (error) {
    console.error('Failed to save item:', error);
    alert('Failed to save item. Please try again.');
  }
}

async function adjustItemStock(itemId) {
  const form = document.getElementById('stockAdjustmentForm');
  if (!form) return;
  
  const formData = new FormData(form);
  const adjustmentData = {
    itemId: itemId,
    type: formData.get('type'),
    qty: parseFloat(formData.get('qty')),
    ref: formData.get('ref') || null,
    note: formData.get('note') || ''
  };
  
  try {
    await api.post('/api/warehouse/movements', adjustmentData);
    location.reload();
  } catch (error) {
    console.error('Failed to adjust stock:', error);
    alert('Failed to adjust stock. Please try again.');
  }
}

async function issueItemsToProject() {
  const form = document.getElementById('issueToProjectForm');
  if (!form) return;
  
  const formData = new FormData(form);
  const issueData = {
    projectId: formData.get('projectId'),
    note: formData.get('note') || ''
  };
  
  try {
    await api.post('/api/warehouse/issues', issueData);
    location.reload();
  } catch (error) {
    console.error('Failed to issue items:', error);
    alert('Failed to issue items. Please try again.');
  }
}

// Initialize warehouse management when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new WarehouseManager().init();
});
