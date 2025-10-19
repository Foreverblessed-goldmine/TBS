// TBS Contractor Management Module
// Handles contractor listing, details, and task assignment

import { api, safe, loadMockData } from './lib/api.js';
import { canManageContractors, canAssignContractors, getUserRole } from './lib/rbac.js';
import { openModal } from './components/modal.js';

class ContractorManager {
  constructor() {
    this.contractors = [];
    this.switchToMock = false; // Toggle for development
  }

  async init() {
    await this.loadContractors();
    this.render();
    this.setupEventListeners();
  }

  async loadContractors() {
    if (this.switchToMock) {
      const mock = await loadMockData('contractors');
      this.contractors = mock.contractors || [];
      return;
    }

    try {
      this.contractors = await api.get('/api/contractors');
    } catch (error) {
      console.warn('Contractors API failed, using mock data:', error);
      const mock = await loadMockData('contractors');
      this.contractors = mock.contractors || [];
    }
  }

  render() {
    const container = document.getElementById('contractorsContainer');
    if (!container) return;

    container.innerHTML = this.createContractorsHTML();
  }

  createContractorsHTML() {
    if (this.contractors.length === 0) {
      return `
        <div class="no-contractors">
          <p>No contractors found.</p>
          ${canManageContractors(getUserRole()) ? `
            <button class="btn btn-primary" onclick="window.addContractor()">
              Add First Contractor
            </button>
          ` : ''}
        </div>
      `;
    }

    return `
      <div class="contractors-header">
        <h2>Contractors (${this.contractors.length})</h2>
        ${canManageContractors(getUserRole()) ? `
          <button class="btn btn-primary" onclick="window.addContractor()">
            Add Contractor
          </button>
        ` : ''}
      </div>
      
      <div class="contractors-grid">
        ${this.contractors.map(contractor => this.createContractorCard(contractor)).join('')}
      </div>
    `;
  }

  createContractorCard(contractor) {
    const insuranceStatus = this.getInsuranceStatus(contractor.insuranceExpiry);
    const ratingStars = this.createRatingStars(contractor.rating);
    
    return `
      <div class="contractor-card" data-contractor-id="${contractor.id}">
        <div class="contractor-header">
          <div class="contractor-info">
            <h3>${contractor.company}</h3>
            <span class="trade-badge trade-${contractor.trade.toLowerCase()}">
              ${contractor.trade}
            </span>
          </div>
          <div class="contractor-rating">
            ${ratingStars}
            <span class="rating-value">${contractor.rating || 'N/A'}</span>
          </div>
        </div>
        
        <div class="contractor-details">
          <div class="contact-info">
            <p><strong>Contact:</strong> ${contractor.contactName}</p>
            <p><strong>Phone:</strong> <a href="tel:${contractor.phone}">${contractor.phone}</a></p>
            <p><strong>Email:</strong> <a href="mailto:${contractor.email}">${contractor.email}</a></p>
          </div>
          
          <div class="insurance-info">
            <p><strong>Insurance Expiry:</strong> 
              <span class="insurance-status ${insuranceStatus.class}">
                ${contractor.insuranceExpiry || 'Not set'}
                ${insuranceStatus.warning ? ' ⚠️' : ''}
              </span>
            </p>
          </div>
          
          ${contractor.notes ? `
            <div class="contractor-notes">
              <p><strong>Notes:</strong> ${contractor.notes}</p>
            </div>
          ` : ''}
        </div>
        
        <div class="contractor-actions">
          <button class="btn btn-secondary" onclick="window.viewContractorDetails('${contractor.id}')">
            View Details
          </button>
          ${canAssignContractors(getUserRole()) ? `
            <button class="btn btn-primary" onclick="window.assignToTask('${contractor.id}')">
              Assign to Task
            </button>
          ` : ''}
          ${canManageContractors(getUserRole()) ? `
            <button class="btn btn-danger" onclick="window.deleteContractor('${contractor.id}')">
              Delete
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  getInsuranceStatus(expiryDate) {
    if (!expiryDate) {
      return { class: 'expired', warning: true };
    }
    
    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return { class: 'expired', warning: true };
    } else if (daysUntilExpiry < 30) {
      return { class: 'expiring', warning: true };
    } else {
      return { class: 'valid', warning: false };
    }
  }

  createRatingStars(rating) {
    if (!rating) return '<span class="no-rating">No rating</span>';
    
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '';
    for (let i = 0; i < fullStars; i++) {
      stars += '<span class="star full">★</span>';
    }
    if (hasHalfStar) {
      stars += '<span class="star half">★</span>';
    }
    for (let i = 0; i < emptyStars; i++) {
      stars += '<span class="star empty">☆</span>';
    }
    
    return stars;
  }

  setupEventListeners() {
    // Any additional event listeners can be added here
  }
}

// Global functions for contractor actions
window.viewContractorDetails = async (contractorId) => {
  const manager = new ContractorManager();
  await manager.loadContractors();
  const contractor = manager.contractors.find(c => c.id === contractorId);
  
  if (!contractor) {
    alert('Contractor not found');
    return;
  }

  const bodyNode = createContractorDetailsNode(contractor);
  
  await openModal({
    title: `${contractor.company} Details`,
    bodyNode,
    size: 'large',
    actions: [
      {
        label: 'Close',
        kind: 'secondary',
        onClick: () => {}
      },
      canAssignContractors(getUserRole()) ? {
        label: 'Assign to Task',
        kind: 'primary',
        onClick: () => window.assignToTask(contractorId)
      } : null
    ].filter(Boolean)
  });
};

window.assignToTask = async (contractorId) => {
  const manager = new ContractorManager();
  await manager.loadContractors();
  const contractor = manager.contractors.find(c => c.id === contractorId);
  
  if (!contractor) {
    alert('Contractor not found');
    return;
  }

  // Load projects and tasks for assignment
  const projects = await safe(api.get('/api/projects'), []);
  const tasks = await safe(api.get('/api/tasks'), []);
  
  const bodyNode = createTaskAssignmentNode(contractor, projects, tasks);
  
  await openModal({
    title: `Assign ${contractor.company} to Task`,
    bodyNode,
    size: 'medium',
    actions: [
      {
        label: 'Cancel',
        kind: 'secondary',
        onClick: () => {}
      },
      {
        label: 'Assign',
        kind: 'primary',
        onClick: () => assignContractorToTask(contractorId)
      }
    ]
  });
};

window.addContractor = async () => {
  const bodyNode = createContractorFormNode();
  
  await openModal({
    title: 'Add New Contractor',
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
        onClick: () => saveContractor()
      }
    ]
  });
};

window.deleteContractor = async (contractorId) => {
  if (!confirm('Are you sure you want to delete this contractor?')) return;
  
  try {
    await api.del(`/api/contractors/${contractorId}`);
    // Reload the page to refresh the list
    location.reload();
  } catch (error) {
    console.error('Failed to delete contractor:', error);
    alert('Failed to delete contractor. Please try again.');
  }
};

function createContractorDetailsNode(contractor) {
  const div = document.createElement('div');
  div.className = 'contractor-details-modal';
  
  const insuranceStatus = new ContractorManager().getInsuranceStatus(contractor.insuranceExpiry);
  const ratingStars = new ContractorManager().createRatingStars(contractor.rating);
  
  div.innerHTML = `
    <div class="contractor-details-grid">
      <div class="detail-section">
        <h4>Company Information</h4>
        <p><strong>Company:</strong> ${contractor.company}</p>
        <p><strong>Trade:</strong> <span class="trade-badge trade-${contractor.trade.toLowerCase()}">${contractor.trade}</span></p>
        <p><strong>Status:</strong> <span class="status-badge status-${contractor.status}">${contractor.status}</span></p>
      </div>
      
      <div class="detail-section">
        <h4>Contact Information</h4>
        <p><strong>Contact Person:</strong> ${contractor.contactName}</p>
        <p><strong>Phone:</strong> <a href="tel:${contractor.phone}">${contractor.phone}</a></p>
        <p><strong>Email:</strong> <a href="mailto:${contractor.email}">${contractor.email}</a></p>
      </div>
      
      <div class="detail-section">
        <h4>Rating & Insurance</h4>
        <p><strong>Rating:</strong> ${ratingStars} (${contractor.rating || 'N/A'})</p>
        <p><strong>Insurance Expiry:</strong> 
          <span class="insurance-status ${insuranceStatus.class}">
            ${contractor.insuranceExpiry || 'Not set'}
            ${insuranceStatus.warning ? ' ⚠️' : ''}
          </span>
        </p>
      </div>
      
      ${contractor.notes ? `
        <div class="detail-section full-width">
          <h4>Notes</h4>
          <p>${contractor.notes}</p>
        </div>
      ` : ''}
    </div>
  `;
  
  return div;
}

function createTaskAssignmentNode(contractor, projects, tasks) {
  const div = document.createElement('div');
  div.className = 'task-assignment-form';
  
  const projectOptions = projects.map(p => 
    `<option value="${p.id}">${p.name || p.ref || p.address}</option>`
  ).join('');
  
  div.innerHTML = `
    <div class="assignment-info">
      <p><strong>Assigning:</strong> ${contractor.company} (${contractor.trade})</p>
    </div>
    
    <form id="taskAssignmentForm">
      <div class="form-group">
        <label for="assignmentProject">Project *</label>
        <select id="assignmentProject" name="projectId" required>
          <option value="">Select Project</option>
          ${projectOptions}
        </select>
      </div>
      
      <div class="form-group">
        <label for="assignmentTask">Task *</label>
        <select id="assignmentTask" name="taskId" required>
          <option value="">Select Task</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="assignmentRole">Role on Task</label>
        <select id="assignmentRole" name="role">
          <option value="subcontractor">Subcontractor</option>
          <option value="specialist">Specialist</option>
          <option value="consultant">Consultant</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="assignmentNotes">Notes</label>
        <textarea id="assignmentNotes" name="notes" rows="3" placeholder="Additional notes for this assignment..."></textarea>
      </div>
    </form>
  `;
  
  // Setup project change handler to filter tasks
  const projectSelect = div.querySelector('#assignmentProject');
  const taskSelect = div.querySelector('#assignmentTask');
  
  projectSelect.addEventListener('change', () => {
    const projectId = projectSelect.value;
    const projectTasks = tasks.filter(t => t.project_id == projectId);
    
    taskSelect.innerHTML = '<option value="">Select Task</option>';
    projectTasks.forEach(task => {
      const option = document.createElement('option');
      option.value = task.id;
      option.textContent = task.name;
      taskSelect.appendChild(option);
    });
  });
  
  return div;
}

function createContractorFormNode() {
  const div = document.createElement('div');
  div.className = 'contractor-form';
  
  div.innerHTML = `
    <form id="contractorForm">
      <div class="form-group">
        <label for="contractorCompany">Company Name *</label>
        <input type="text" id="contractorCompany" name="company" required>
      </div>
      
      <div class="form-group">
        <label for="contractorTrade">Trade *</label>
        <select id="contractorTrade" name="trade" required>
          <option value="">Select Trade</option>
          <option value="ELECTRICAL">Electrical</option>
          <option value="PLUMBING">Plumbing</option>
          <option value="ROOFING">Roofing</option>
          <option value="CONCRETE">Concrete</option>
          <option value="PAINTING">Painting</option>
          <option value="CARPENTRY">Carpentry</option>
          <option value="PLASTERING">Plastering</option>
          <option value="TILING">Tiling</option>
          <option value="OTHER">Other</option>
        </select>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="contractorContact">Contact Name *</label>
          <input type="text" id="contractorContact" name="contactName" required>
        </div>
        <div class="form-group">
          <label for="contractorPhone">Phone *</label>
          <input type="tel" id="contractorPhone" name="phone" required>
        </div>
      </div>
      
      <div class="form-group">
        <label for="contractorEmail">Email *</label>
        <input type="email" id="contractorEmail" name="email" required>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="contractorRating">Rating (1-5)</label>
          <input type="number" id="contractorRating" name="rating" min="1" max="5" step="0.1">
        </div>
        <div class="form-group">
          <label for="contractorInsurance">Insurance Expiry</label>
          <input type="date" id="contractorInsurance" name="insuranceExpiry">
        </div>
      </div>
      
      <div class="form-group">
        <label for="contractorNotes">Notes</label>
        <textarea id="contractorNotes" name="notes" rows="3" placeholder="Additional notes about this contractor..."></textarea>
      </div>
    </form>
  `;
  
  return div;
}

async function saveContractor() {
  const form = document.getElementById('contractorForm');
  if (!form) return;
  
  const formData = new FormData(form);
  const contractorData = {
    company: formData.get('company'),
    trade: formData.get('trade'),
    contactName: formData.get('contactName'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    rating: formData.get('rating') ? parseFloat(formData.get('rating')) : null,
    insuranceExpiry: formData.get('insuranceExpiry') || null,
    notes: formData.get('notes') || '',
    status: 'active'
  };
  
  try {
    await api.post('/api/contractors', contractorData);
    // Reload the page to refresh the list
    location.reload();
  } catch (error) {
    console.error('Failed to save contractor:', error);
    alert('Failed to save contractor. Please try again.');
  }
}

async function assignContractorToTask(contractorId) {
  const form = document.getElementById('taskAssignmentForm');
  if (!form) return;
  
  const formData = new FormData(form);
  const assignmentData = {
    contractorId: contractorId,
    taskId: formData.get('taskId'),
    role: formData.get('role'),
    notes: formData.get('notes') || ''
  };
  
  try {
    await api.post('/api/assignments', assignmentData);
    alert('Contractor assigned to task successfully!');
  } catch (error) {
    console.error('Failed to assign contractor:', error);
    alert('Failed to assign contractor. Please try again.');
  }
}

// Initialize contractor management when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ContractorManager().init();
});
