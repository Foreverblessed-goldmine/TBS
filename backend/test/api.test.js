// Simple API tests for TBS Project Management App
// Run with: node test/api.test.js

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:8080/api';
let authToken = '';

// Test helper functions
const api = async (endpoint, options = {}) => {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
      ...options.headers
    }
  });
  
  const data = await response.json().catch(() => ({}));
  return { response, data };
};

const test = (name, fn) => {
  console.log(`\n🧪 Testing: ${name}`);
  try {
    fn();
    console.log(`✅ ${name} - PASSED`);
  } catch (error) {
    console.log(`❌ ${name} - FAILED: ${error.message}`);
  }
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

// Test suite
const runTests = async () => {
  console.log('🚀 Starting TBS API Tests\n');

  // Test 1: Health check
  test('Health check endpoint', async () => {
    const { response, data } = await api('/health');
    assert(response.ok, 'Health check should return 200');
    assert(data.status === 'OK', 'Health check should return OK status');
  });

  // Test 2: Login
  test('User login', async () => {
    const { response, data } = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'danny@tbs.local',
        password: 'password123'
      })
    });
    
    assert(response.ok, 'Login should succeed');
    assert(data.accessToken, 'Should return access token');
    authToken = data.accessToken;
  });

  // Test 3: Get current user
  test('Get current user info', async () => {
    const { response, data } = await api('/me');
    assert(response.ok, 'Should get user info');
    assert(data.email === 'danny@tbs.local', 'Should return correct user email');
  });

  // Test 4: Get staff list
  test('Get staff list', async () => {
    const { response, data } = await api('/staff');
    assert(response.ok, 'Should get staff list');
    assert(Array.isArray(data), 'Should return array of staff');
  });

  // Test 5: Create staff member
  test('Create staff member', async () => {
    const { response, data } = await api('/staff', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        phone: '123-456-7890',
        role: 'worker',
        position: 'Test Position',
        password: 'testpassword123'
      })
    });
    
    assert(response.ok, 'Should create staff member');
    assert(data.name === 'Test User', 'Should return created staff data');
    
    // Store ID for cleanup
    global.testStaffId = data.id;
  });

  // Test 6: Get contractors list
  test('Get contractors list', async () => {
    const { response, data } = await api('/contractors');
    assert(response.ok, 'Should get contractors list');
    assert(Array.isArray(data), 'Should return array of contractors');
  });

  // Test 7: Create contractor
  test('Create contractor', async () => {
    const { response, data } = await api('/contractors', {
      method: 'POST',
      body: JSON.stringify({
        company: 'Test Construction Co',
        trade: 'Electrical',
        contactName: 'John Doe',
        phone: '555-123-4567',
        email: 'john@testconstruction.com',
        rating: 4.5,
        status: 'active'
      })
    });
    
    assert(response.ok, 'Should create contractor');
    assert(data.company === 'Test Construction Co', 'Should return created contractor data');
    
    // Store ID for cleanup
    global.testContractorId = data.id;
  });

  // Test 8: Get projects list
  test('Get projects list', async () => {
    const { response, data } = await api('/projects');
    assert(response.ok, 'Should get projects list');
    assert(Array.isArray(data), 'Should return array of projects');
  });

  // Test 9: Get tasks list
  test('Get tasks list', async () => {
    const { response, data } = await api('/tasks');
    assert(response.ok, 'Should get tasks list');
    assert(Array.isArray(data), 'Should return array of tasks');
  });

  // Test 10: Create task
  test('Create task', async () => {
    const { response, data } = await api('/tasks', {
      method: 'POST',
      body: JSON.stringify({
        project_id: 1,
        title: 'Test Task',
        description: 'This is a test task',
        priority: 'high',
        status: 'todo'
      })
    });
    
    assert(response.ok, 'Should create task');
    assert(data.title === 'Test Task', 'Should return created task data');
    
    // Store ID for cleanup
    global.testTaskId = data.id;
  });

  // Test 11: Update task
  test('Update task', async () => {
    const { response, data } = await api(`/tasks/${global.testTaskId}`, {
      method: 'PUT',
      body: JSON.stringify({
        status: 'in_progress',
        priority: 'urgent'
      })
    });
    
    assert(response.ok, 'Should update task');
    assert(data.status === 'in_progress', 'Should return updated task data');
  });

  // Test 12: Push task to calendar
  test('Push task to calendar', async () => {
    const { response, data } = await api(`/tasks/calendar/tasks/${global.testTaskId}/push`, {
      method: 'POST',
      body: JSON.stringify({
        all_day: true,
        location: 'Test Location'
      })
    });
    
    assert(response.ok, 'Should push task to calendar');
    assert(data.task_id === global.testTaskId, 'Should return calendar event data');
  });

  // Test 13: Get calendar events
  test('Get calendar events', async () => {
    const { response, data } = await api('/tasks/calendar/events');
    assert(response.ok, 'Should get calendar events');
    assert(Array.isArray(data), 'Should return array of events');
  });

  // Cleanup tests
  console.log('\n🧹 Cleaning up test data...');
  
  if (global.testTaskId) {
    try {
      await api(`/tasks/${global.testTaskId}`, { method: 'DELETE' });
      console.log('✅ Test task cleaned up');
    } catch (e) {
      console.log('⚠️  Failed to clean up test task');
    }
  }
  
  if (global.testContractorId) {
    try {
      await api(`/contractors/${global.testContractorId}`, { method: 'DELETE' });
      console.log('✅ Test contractor cleaned up');
    } catch (e) {
      console.log('⚠️  Failed to clean up test contractor');
    }
  }
  
  if (global.testStaffId) {
    try {
      await api(`/staff/${global.testStaffId}`, { method: 'DELETE' });
      console.log('✅ Test staff cleaned up');
    } catch (e) {
      console.log('⚠️  Failed to clean up test staff');
    }
  }

  console.log('\n🎉 All tests completed!');
};

// Run tests
runTests().catch(console.error);
