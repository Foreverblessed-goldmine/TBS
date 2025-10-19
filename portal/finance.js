// TBS Finance Module
// Handles invoices, expenses, and financial reporting

import { api, safe, loadMockData } from './lib/api.js';
import { canManageFinance, canCreateInvoice, canCreateExpense, canExportData, getUserRole } from './lib/rbac.js';
import { openModal } from './components/modal.js';

class FinanceManager {
  constructor() {
    this.invoices = [];
    this.expenses = [];
    this.currentTab = 'invoices';
    this.switchToMock = false; // Toggle for development
  }

  async init() {
    await this.loadFinancialData();
    this.render();
    this.setupEventListeners();
  }

  async loadFinancialData() {
    if (this.switchToMock) {
      const mock = await loadMockData('finance');
      this.invoices = mock.invoices || [];
      this.expenses = mock.expenses || [];
      return;
    }

    try {
      const [invoices, expenses] = await Promise.all([
        safe(api.get('/api/finance/invoices'), []),
        safe(api.get('/api/finance/expenses'), [])
      ]);
      
      this.invoices = invoices;
      this.expenses = expenses;
    } catch (error) {
      console.warn('Finance API failed, using mock data:', error);
      const mock = await loadMockData('finance');
      this.invoices = mock.invoices || [];
      this.expenses = mock.expenses || [];
    }
  }

  render() {
    const container = document.getElementById('financeContainer');
    if (!container) return;

    container.innerHTML = this.createFinanceHTML();
  }

  createFinanceHTML() {
    return `
      <div class="finance-module">
        <div class="finance-header">
          <h2>Financial Management</h2>
          <div class="finance-summary">
            <div class="summary-card">
              <h3>Outstanding Invoices</h3>
              <p class="summary-amount">£${this.getOutstandingInvoicesTotal().toLocaleString()}</p>
            </div>
            <div class="summary-card">
              <h3>Total Expenses</h3>
              <p class="summary-amount">£${this.getTotalExpenses().toLocaleString()}</p>
            </div>
            <div class="summary-card">
              <h3>Net Position</h3>
              <p class="summary-amount ${this.getNetPosition() >= 0 ? 'positive' : 'negative'}">
                £${this.getNetPosition().toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div class="finance-tabs">
          <button class="tab-btn ${this.currentTab === 'invoices' ? 'active' : ''}" data-tab="invoices">
            Invoices (${this.invoices.length})
          </button>
          <button class="tab-btn ${this.currentTab === 'expenses' ? 'active' : ''}" data-tab="expenses">
            Expenses (${this.expenses.length})
          </button>
        </div>

        <div class="finance-content">
          ${this.currentTab === 'invoices' ? this.createInvoicesTab() : this.createExpensesTab()}
        </div>
      </div>
    `;
  }

  createInvoicesTab() {
    return `
      <div class="invoices-tab">
        <div class="tab-header">
          <h3>Invoices</h3>
          <div class="tab-actions">
            ${canCreateInvoice(getUserRole()) ? `
              <button class="btn btn-primary" onclick="window.createInvoice()">
                New Invoice
              </button>
            ` : ''}
            ${canExportData(getUserRole()) ? `
              <button class="btn btn-secondary" onclick="window.exportInvoices()">
                Export CSV
              </button>
            ` : ''}
          </div>
        </div>
        
        <div class="invoices-list">
          ${this.invoices.length > 0 ? 
            this.invoices.map(invoice => this.createInvoiceItem(invoice)).join('') :
            '<p class="no-data">No invoices found.</p>'
          }
        </div>
      </div>
    `;
  }

  createExpensesTab() {
    return `
      <div class="expenses-tab">
        <div class="tab-header">
          <h3>Expenses</h3>
          <div class="tab-actions">
            ${canCreateExpense(getUserRole()) ? `
              <button class="btn btn-primary" onclick="window.createExpense()">
                New Expense
              </button>
            ` : ''}
            ${canExportData(getUserRole()) ? `
              <button class="btn btn-secondary" onclick="window.exportExpenses()">
                Export CSV
              </button>
            ` : ''}
          </div>
        </div>
        
        <div class="expenses-list">
          ${this.expenses.length > 0 ? 
            this.expenses.map(expense => this.createExpenseItem(expense)).join('') :
            '<p class="no-data">No expenses found.</p>'
          }
        </div>
      </div>
    `;
  }

  createInvoiceItem(invoice) {
    const statusClass = invoice.status.toLowerCase();
    const statusLabel = invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1);
    
    return `
      <div class="invoice-item" data-invoice-id="${invoice.id}">
        <div class="invoice-header">
          <div class="invoice-info">
            <h4>${invoice.number}</h4>
            <p class="invoice-client">${invoice.clientName}</p>
          </div>
          <div class="invoice-amount">
            <span class="amount">£${invoice.amount.toLocaleString()}</span>
            <span class="status-badge status-${statusClass}">${statusLabel}</span>
          </div>
        </div>
        
        <div class="invoice-details">
          <p><strong>Project:</strong> ${invoice.description}</p>
          <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
          <p><strong>Created:</strong> ${new Date(invoice.createdDate).toLocaleDateString()}</p>
        </div>
        
        <div class="invoice-actions">
          <button class="btn btn-secondary btn-sm" onclick="window.viewInvoice('${invoice.id}')">
            View
          </button>
          ${canManageFinance(getUserRole()) ? `
            <button class="btn btn-primary btn-sm" onclick="window.editInvoice('${invoice.id}')">
              Edit
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  createExpenseItem(expense) {
    return `
      <div class="expense-item" data-expense-id="${expense.id}">
        <div class="expense-header">
          <div class="expense-info">
            <h4>${expense.vendor}</h4>
            <p class="expense-category">${expense.category}</p>
          </div>
          <div class="expense-amount">
            <span class="amount">£${expense.amount.toLocaleString()}</span>
            <span class="expense-date">${new Date(expense.date).toLocaleDateString()}</span>
          </div>
        </div>
        
        <div class="expense-details">
          <p><strong>Description:</strong> ${expense.description}</p>
          ${expense.projectId ? `<p><strong>Project:</strong> ${expense.projectId}</p>` : ''}
          ${expense.receipt ? `<p><strong>Receipt:</strong> <a href="${expense.receipt}" target="_blank">View</a></p>` : ''}
        </div>
        
        <div class="expense-actions">
          ${canManageFinance(getUserRole()) ? `
            <button class="btn btn-primary btn-sm" onclick="window.editExpense('${expense.id}')">
              Edit
            </button>
            <button class="btn btn-danger btn-sm" onclick="window.deleteExpense('${expense.id}')">
              Delete
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  getOutstandingInvoicesTotal() {
    return this.invoices
      .filter(invoice => invoice.status !== 'paid')
      .reduce((total, invoice) => total + invoice.amount, 0);
  }

  getTotalExpenses() {
    return this.expenses.reduce((total, expense) => total + expense.amount, 0);
  }

  getNetPosition() {
    const totalInvoices = this.invoices.reduce((total, invoice) => total + invoice.amount, 0);
    return totalInvoices - this.getTotalExpenses();
  }

  setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.currentTab = e.target.dataset.tab;
        this.render();
      });
    });
  }
}

// Global functions for finance actions
window.createInvoice = async () => {
  const bodyNode = createInvoiceFormNode();
  
  await openModal({
    title: 'Create New Invoice',
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
        onClick: () => saveInvoice()
      }
    ]
  });
};

window.createExpense = async () => {
  const bodyNode = createExpenseFormNode();
  
  await openModal({
    title: 'Create New Expense',
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
        onClick: () => saveExpense()
      }
    ]
  });
};

window.viewInvoice = async (invoiceId) => {
  const manager = new FinanceManager();
  await manager.loadFinancialData();
  const invoice = manager.invoices.find(i => i.id === invoiceId);
  
  if (!invoice) {
    alert('Invoice not found');
    return;
  }

  const bodyNode = createInvoiceDetailsNode(invoice);
  
  await openModal({
    title: `Invoice ${invoice.number}`,
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

window.editInvoice = async (invoiceId) => {
  const manager = new FinanceManager();
  await manager.loadFinancialData();
  const invoice = manager.invoices.find(i => i.id === invoiceId);
  
  if (!invoice) {
    alert('Invoice not found');
    return;
  }

  const bodyNode = createInvoiceFormNode(invoice);
  
  await openModal({
    title: 'Edit Invoice',
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
        onClick: () => saveInvoice(invoiceId)
      }
    ]
  });
};

window.editExpense = async (expenseId) => {
  const manager = new FinanceManager();
  await manager.loadFinancialData();
  const expense = manager.expenses.find(e => e.id === expenseId);
  
  if (!expense) {
    alert('Expense not found');
    return;
  }

  const bodyNode = createExpenseFormNode(expense);
  
  await openModal({
    title: 'Edit Expense',
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
        onClick: () => saveExpense(expenseId)
      }
    ]
  });
};

window.deleteExpense = async (expenseId) => {
  if (!confirm('Are you sure you want to delete this expense?')) return;
  
  try {
    await api.del(`/api/finance/expenses/${expenseId}`);
    location.reload();
  } catch (error) {
    console.error('Failed to delete expense:', error);
    alert('Failed to delete expense. Please try again.');
  }
};

window.exportInvoices = () => {
  const manager = new FinanceManager();
  manager.loadFinancialData().then(() => {
    exportToCSV(manager.invoices, 'invoices');
  });
};

window.exportExpenses = () => {
  const manager = new FinanceManager();
  manager.loadFinancialData().then(() => {
    exportToCSV(manager.expenses, 'expenses');
  });
};

function createInvoiceFormNode(invoice = null) {
  const div = document.createElement('div');
  div.className = 'invoice-form';
  
  div.innerHTML = `
    <form id="invoiceForm">
      <div class="form-group">
        <label for="invoiceNumber">Invoice Number *</label>
        <input type="text" id="invoiceNumber" name="number" required 
               value="${invoice ? invoice.number : ''}">
      </div>
      
      <div class="form-group">
        <label for="invoiceClient">Client Name *</label>
        <input type="text" id="invoiceClient" name="clientName" required 
               value="${invoice ? invoice.clientName : ''}">
      </div>
      
      <div class="form-group">
        <label for="invoiceAmount">Amount (£) *</label>
        <input type="number" id="invoiceAmount" name="amount" step="0.01" required 
               value="${invoice ? invoice.amount : ''}">
      </div>
      
      <div class="form-group">
        <label for="invoiceStatus">Status *</label>
        <select id="invoiceStatus" name="status" required>
          <option value="draft" ${invoice && invoice.status === 'draft' ? 'selected' : ''}>Draft</option>
          <option value="sent" ${invoice && invoice.status === 'sent' ? 'selected' : ''}>Sent</option>
          <option value="paid" ${invoice && invoice.status === 'paid' ? 'selected' : ''}>Paid</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="invoiceDueDate">Due Date *</label>
        <input type="date" id="invoiceDueDate" name="dueDate" required 
               value="${invoice ? invoice.dueDate : ''}">
      </div>
      
      <div class="form-group">
        <label for="invoiceDescription">Description</label>
        <textarea id="invoiceDescription" name="description" rows="3" 
                  placeholder="Description of work or services...">${invoice ? invoice.description : ''}</textarea>
      </div>
    </form>
  `;
  
  return div;
}

function createExpenseFormNode(expense = null) {
  const div = document.createElement('div');
  div.className = 'expense-form';
  
  div.innerHTML = `
    <form id="expenseForm">
      <div class="form-group">
        <label for="expenseDate">Date *</label>
        <input type="date" id="expenseDate" name="date" required 
               value="${expense ? expense.date : ''}">
      </div>
      
      <div class="form-group">
        <label for="expenseVendor">Vendor *</label>
        <input type="text" id="expenseVendor" name="vendor" required 
               value="${expense ? expense.vendor : ''}">
      </div>
      
      <div class="form-group">
        <label for="expenseAmount">Amount (£) *</label>
        <input type="number" id="expenseAmount" name="amount" step="0.01" required 
               value="${expense ? expense.amount : ''}">
      </div>
      
      <div class="form-group">
        <label for="expenseCategory">Category *</label>
        <select id="expenseCategory" name="category" required>
          <option value="">Select Category</option>
          <option value="materials" ${expense && expense.category === 'materials' ? 'selected' : ''}>Materials</option>
          <option value="subcontract" ${expense && expense.category === 'subcontract' ? 'selected' : ''}>Subcontract</option>
          <option value="vehicle" ${expense && expense.category === 'vehicle' ? 'selected' : ''}>Vehicle</option>
          <option value="equipment" ${expense && expense.category === 'equipment' ? 'selected' : ''}>Equipment</option>
          <option value="office" ${expense && expense.category === 'office' ? 'selected' : ''}>Office</option>
          <option value="other" ${expense && expense.category === 'other' ? 'selected' : ''}>Other</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="expenseDescription">Description</label>
        <textarea id="expenseDescription" name="description" rows="3" 
                  placeholder="Description of expense...">${expense ? expense.description : ''}</textarea>
      </div>
    </form>
  `;
  
  return div;
}

function createInvoiceDetailsNode(invoice) {
  const div = document.createElement('div');
  div.className = 'invoice-details';
  
  div.innerHTML = `
    <div class="invoice-details-grid">
      <div class="detail-section">
        <h4>Invoice Information</h4>
        <p><strong>Number:</strong> ${invoice.number}</p>
        <p><strong>Status:</strong> <span class="status-badge status-${invoice.status}">${invoice.status}</span></p>
        <p><strong>Amount:</strong> £${invoice.amount.toLocaleString()}</p>
      </div>
      
      <div class="detail-section">
        <h4>Client Information</h4>
        <p><strong>Client:</strong> ${invoice.clientName}</p>
        <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
        <p><strong>Created:</strong> ${new Date(invoice.createdDate).toLocaleDateString()}</p>
      </div>
      
      <div class="detail-section full-width">
        <h4>Description</h4>
        <p>${invoice.description}</p>
      </div>
    </div>
  `;
  
  return div;
}

async function saveInvoice(invoiceId = null) {
  const form = document.getElementById('invoiceForm');
  if (!form) return;
  
  const formData = new FormData(form);
  const invoiceData = {
    number: formData.get('number'),
    clientName: formData.get('clientName'),
    amount: parseFloat(formData.get('amount')),
    status: formData.get('status'),
    dueDate: formData.get('dueDate'),
    description: formData.get('description') || ''
  };
  
  try {
    if (invoiceId) {
      await api.patch(`/api/finance/invoices/${invoiceId}`, invoiceData);
    } else {
      await api.post('/api/finance/invoices', invoiceData);
    }
    location.reload();
  } catch (error) {
    console.error('Failed to save invoice:', error);
    alert('Failed to save invoice. Please try again.');
  }
}

async function saveExpense(expenseId = null) {
  const form = document.getElementById('expenseForm');
  if (!form) return;
  
  const formData = new FormData(form);
  const expenseData = {
    date: formData.get('date'),
    vendor: formData.get('vendor'),
    amount: parseFloat(formData.get('amount')),
    category: formData.get('category'),
    description: formData.get('description') || ''
  };
  
  try {
    if (expenseId) {
      await api.patch(`/api/finance/expenses/${expenseId}`, expenseData);
    } else {
      await api.post('/api/finance/expenses', expenseData);
    }
    location.reload();
  } catch (error) {
    console.error('Failed to save expense:', error);
    alert('Failed to save expense. Please try again.');
  }
}

function exportToCSV(data, filename) {
  if (data.length === 0) {
    alert('No data to export');
    return;
  }
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Initialize finance module when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new FinanceManager().init();
});
