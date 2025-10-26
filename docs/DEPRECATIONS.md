# TBS Project Management App - Deprecations

## Overview

This document tracks deprecated code, features, and patterns in the TBS Project Management App. Items listed here are marked for removal in future versions and should not be used in new development.

## Deprecated Code

### 1. Mock Data Dependencies

**Files**: `portal/data/*.mock.json`
- `portal/data/calendar.mock.json`
- `portal/data/contractors.mock.json` 
- `portal/data/finance.mock.json`
- `portal/data/warehouse.mock.json`

**Reason**: These files contain mock data that was used during development. The application now has full backend API integration.

**Deprecated Since**: 2024-01-15
**Planned Removal**: 2024-02-15
**Replacement**: Real API endpoints and database data

**Migration Path**:
```javascript
// OLD: Using mock data
const data = await loadMockData('contractors');

// NEW: Using API
const response = await api('/api/contractors');
const data = await response.json();
```

### 2. Hardcoded Project ID Mapping

**File**: `portal/components/projectDetails.js`
**Lines**: 15-25

```javascript
// DEPRECATED: Hardcoded project ID mapping
const projectIdMap = {
  1: 'p-82walpole',
  2: 'p-crown'
};
```

**Reason**: This hardcoded mapping was a temporary solution to bridge numeric HTML IDs with string mock data IDs. The application now uses consistent numeric IDs throughout.

**Deprecated Since**: 2024-01-15
**Planned Removal**: 2024-02-15
**Replacement**: Direct numeric ID usage

**Migration Path**:
```javascript
// OLD: Using mapped IDs
const projectId = projectIdMap[htmlProjectId];

// NEW: Using direct IDs
const projectId = htmlProjectId;
```

### 3. Legacy Task Notes Field

**File**: `backend/src/db/bootstrap.js`
**Lines**: 95-96

```javascript
t.text("notes"); // DEPRECATED: use description field
```

**Reason**: The `notes` field in the Tasks table is redundant with the `description` field. All new code should use `description`.

**Deprecated Since**: 2024-01-15
**Planned Removal**: 2024-03-15
**Replacement**: Use `description` field instead

**Migration Path**:
```javascript
// OLD: Using notes field
const task = { title: 'Task', notes: 'Task notes' };

// NEW: Using description field
const task = { title: 'Task', description: 'Task description' };
```

### 4. Unused Environment Variables

**File**: `backend/.env.example`
**Variables**: 
- `DB_URL` (not used, SQLite file path is hardcoded)
- `STORAGE_BUCKET` (not implemented)

**Reason**: These environment variables were planned but never implemented. The application uses SQLite file path and doesn't have file storage implemented.

**Deprecated Since**: 2024-01-15
**Planned Removal**: 2024-02-15
**Replacement**: Remove from .env.example

### 5. Legacy API Response Format

**File**: `portal/lib/api.js`
**Lines**: 25-30

```javascript
// DEPRECATED: Legacy response format
if (response.ok) {
  return response.json();
} else {
  throw new Error(`HTTP ${response.status}: ${response.statusText}`);
}
```

**Reason**: This response format doesn't provide detailed error information. The new format includes structured error responses.

**Deprecated Since**: 2024-01-15
**Planned Removal**: 2024-02-15
**Replacement**: Structured error responses with field validation

**Migration Path**:
```javascript
// OLD: Simple error throwing
if (!response.ok) {
  throw new Error(`HTTP ${response.status}`);
}

// NEW: Structured error handling
if (!response.ok) {
  const error = await response.json();
  throw new Error(error.message || `HTTP ${response.status}`);
}
```

## Deprecated Features

### 1. Finance Module Mock Data

**Files**: `portal/finance.html`, `portal/finance.js`

**Reason**: The finance module currently uses mock data and doesn't have backend integration. It's marked for future implementation.

**Deprecated Since**: 2024-01-15
**Planned Removal**: 2024-06-15
**Replacement**: Full backend integration with real financial data

### 2. Warehouse Module Mock Data

**Files**: `portal/warehouse.html`, `portal/warehouse.js`

**Reason**: The warehouse module currently uses mock data and doesn't have backend integration. It's marked for future implementation.

**Deprecated Since**: 2024-01-15
**Planned Removal**: 2024-06-15
**Replacement**: Full backend integration with real inventory data

### 3. Photo Upload Mock Implementation

**File**: `portal/components/projectDetails.js`
**Lines**: 200-220

```javascript
// DEPRECATED: Mock photo upload
const mockPhotoUpload = (file) => {
  // Mock implementation
  return Promise.resolve({
    id: Date.now(),
    url: URL.createObjectURL(file),
    caption: file.name
  });
};
```

**Reason**: This is a mock implementation for photo uploads. Real file upload functionality needs to be implemented.

**Deprecated Since**: 2024-01-15
**Planned Removal**: 2024-04-15
**Replacement**: Real file upload with backend storage

## Deprecated Patterns

### 1. Global Window Functions

**Files**: Multiple frontend files

```javascript
// DEPRECATED: Global window functions
window.staffToRemove = null;
window.pushTaskToCalendar = async (taskId) => { ... };
```

**Reason**: Global window functions pollute the global namespace and make code harder to maintain.

**Deprecated Since**: 2024-01-15
**Planned Removal**: 2024-03-15
**Replacement**: Module-based event handling and component methods

**Migration Path**:
```javascript
// OLD: Global functions
window.staffToRemove = id;
window.pushTaskToCalendar(taskId);

// NEW: Component methods
staffManager.setStaffToRemove(id);
taskManager.pushToCalendar(taskId);
```

### 2. Inline Event Handlers

**Files**: Multiple HTML files

```html
<!-- DEPRECATED: Inline event handlers -->
<button onclick="deleteStaff()">Delete</button>
```

**Reason**: Inline event handlers mix HTML and JavaScript, making code harder to maintain and test.

**Deprecated Since**: 2024-01-15
**Planned Removal**: 2024-03-15
**Replacement**: Event delegation and component-based event handling

**Migration Path**:
```html
<!-- OLD: Inline handlers -->
<button onclick="deleteStaff()">Delete</button>

<!-- NEW: Event delegation -->
<button data-action="delete-staff">Delete</button>
```

### 3. Direct DOM Manipulation

**Files**: Multiple frontend files

```javascript
// DEPRECATED: Direct DOM manipulation
document.getElementById('staffList').innerHTML = html;
```

**Reason**: Direct DOM manipulation is error-prone and doesn't scale well.

**Deprecated Since**: 2024-01-15
**Planned Removal**: 2024-04-15
**Replacement**: Component-based rendering with virtual DOM or template systems

**Migration Path**:
```javascript
// OLD: Direct DOM manipulation
document.getElementById('staffList').innerHTML = html;

// NEW: Component rendering
staffListComponent.render(html);
```

## Migration Guidelines

### For Developers

1. **Check Deprecations**: Always check this document before implementing new features
2. **Use Replacements**: Use the recommended replacements for deprecated code
3. **Update Dependencies**: Update code that depends on deprecated features
4. **Test Thoroughly**: Test all changes thoroughly before deployment

### For Code Reviews

1. **Flag Deprecated Code**: Flag any use of deprecated code in PRs
2. **Suggest Replacements**: Suggest the recommended replacements
3. **Check Migration Path**: Ensure the migration path is followed correctly
4. **Update Documentation**: Update this document when new deprecations are added

## Removal Schedule

### Phase 1 (2024-02-15)
- Remove mock data files
- Remove hardcoded project ID mapping
- Remove unused environment variables

### Phase 2 (2024-03-15)
- Remove legacy task notes field
- Remove global window functions
- Remove inline event handlers

### Phase 3 (2024-04-15)
- Remove mock photo upload implementation
- Remove direct DOM manipulation patterns

### Phase 4 (2024-06-15)
- Implement real finance module
- Implement real warehouse module
- Complete photo upload implementation

## Contact

For questions about deprecations or migration paths, contact the development team or create an issue in the project repository.
