// TBS Role-Based Access Control (RBAC) Helper Library
// Centralized permission checking for consistent security

export const canCreateTask = (role) => role === 'admin';
export const canEditTask = (role) => role === 'admin' || role === 'foreman';
export const canDeleteTask = (role) => role === 'admin';
export const canUploadPhoto = (role) => ['admin', 'foreman', 'worker', 'contractor'].includes(role);
export const canAssign = (role) => role === 'admin';
export const canManageStaff = (role) => role === 'admin';
export const canManageProjects = (role) => role === 'admin' || role === 'foreman';
export const canManageFinance = (role) => role === 'admin';
export const canManageWarehouse = (role) => role === 'admin' || role === 'foreman';
export const canViewAllData = (role) => ['admin', 'foreman'].includes(role);
export const canCreateInvoice = (role) => role === 'admin';
export const canCreateExpense = (role) => role === 'admin' || role === 'foreman';
export const canDeletePhoto = (role) => role === 'admin';
export const canEditPhoto = (role) => role === 'admin' || role === 'foreman';
export const canManageContractors = (role) => role === 'admin';
export const canAssignContractors = (role) => role === 'admin';
export const canExportData = (role) => ['admin', 'foreman'].includes(role);
export const canSendClientEmails = (role) => role === 'admin';
export const canGenerateReports = (role) => role === 'admin';

// Helper to get user role from context
export function getUserRole() {
  // Try to get from localStorage first
  const token = localStorage.getItem('tbs_at');
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role;
    } catch (e) {
      console.warn('Failed to parse token for role');
    }
  }
  
  // Fallback to mock data role
  return 'admin'; // Default for development
}

// Helper to check if user has permission
export function hasPermission(permissionFunction) {
  const role = getUserRole();
  return permissionFunction(role);
}

// Helper to show/hide elements based on permissions
export function applyRBAC() {
  const role = getUserRole();
  
  // Hide admin-only elements
  document.querySelectorAll('.only-admin').forEach(el => {
    el.style.display = canCreateTask(role) ? 'block' : 'none';
  });
  
  // Hide foreman+ elements
  document.querySelectorAll('.only-foreman').forEach(el => {
    el.style.display = canEditTask(role) ? 'block' : 'none';
  });
  
  // Hide worker+ elements
  document.querySelectorAll('.only-worker').forEach(el => {
    el.style.display = canUploadPhoto(role) ? 'block' : 'none';
  });
  
  // Hide contractor+ elements
  document.querySelectorAll('.only-contractor').forEach(el => {
    el.style.display = canUploadPhoto(role) ? 'block' : 'none';
  });
}
