// TBS API Helper Library
// Provides consistent API calls with fallback support

export async function req(path, opts = {}) {
  const res = await fetch(path, { 
    credentials: 'include', 
    headers: {
      'Content-Type': 'application/json', 
      ...(opts.headers || {})
    }, 
    ...opts 
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export const api = {
  get: (p) => req(p),
  post: (p, body) => req(p, { method: 'POST', body: JSON.stringify(body) }),
  patch: (p, body) => req(p, { method: 'PATCH', body: JSON.stringify(body) }),
  del: (p) => req(p, { method: 'DELETE' })
};

export async function safe(promise, fallback) { 
  try { 
    return await promise; 
  } catch { 
    return fallback; 
  } 
}

// File upload helper
export async function uploadFile(path, formData) {
  const res = await fetch(path, {
    method: 'POST',
    credentials: 'include',
    body: formData
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

// Mock data loader
export async function loadMockData(filename) {
  try {
    const response = await fetch(`./data/${filename}.mock.json`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Mock data not found');
    return await response.json();
  } catch (error) {
    console.warn(`Failed to load mock data: ${filename}`, error);
    return null;
  }
}
