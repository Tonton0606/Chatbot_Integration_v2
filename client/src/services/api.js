// API Service for backend integration with automatic auth token injection
import { supabase } from '../config/supabaseClient';
import { clearWorkspaceStorage } from './auth/authActions';

const envBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const rawBase = String(envBase).trim().replace(/\s+/g, '');
const API_BASE_URL = rawBase.endsWith('/api') ? rawBase : `${rawBase.replace(/\/$/, '')}/api`;

// Read the active workspace so every backend call is tenant-scoped. Server
// routes that fail-close on workspace (analytics, revenue, reports, tasks)
// require this header for non-admin users.
function getStoredWorkspaceId() {
  try {
    return (
      localStorage.getItem('exponify_active_client_workspace_id') ||
      localStorage.getItem('workspaceId') ||
      localStorage.getItem('workspace_id') ||
      null
    );
  } catch {
    return null;
  }
}

// Helper to get current auth token + workspace context
async function getAuthHeaders() {
  const headers = {};
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch {
    // continue without auth header
  }

  const wsId = getStoredWorkspaceId();
  if (wsId) headers['x-workspace-id'] = wsId;

  return headers;
}

// Helper for API requests with automatic auth token injection
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const authHeaders = await getAuthHeaders();

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
    ...options,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(url, config);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401) {
      // Clear stale session so the user can sign in fresh. Clear workspace
      // storage too (not just the MFA marker) so a forced/expired logout never
      // leaves another user's workspace context behind on a shared device.
      try {
        clearWorkspaceStorage();
        await supabase.auth.signOut();
      } catch { /* non-fatal */ }
      if (typeof window !== 'undefined') {
        window.location.href = '/auth';
      }
      throw new Error('Session expired. Please sign in again.');
    }
    if (response.status === 403) {
      throw new Error('You do not have permission to perform this action.');
    }
    if (response.status === 429) {
      throw new Error('Too many requests. Please wait a moment and try again.');
    }
    throw new Error(data?.error || `API Error: ${response.status}`);
  }

  return data;
}

// Demo Bookings API
export const bookingsApi = {
  // Get all bookings
  async getAll() {
    return apiRequest('/zoom/bookings');
  },

  // Create new booking
  async create(bookingData) {
    return apiRequest('/zoom/book', {
      method: 'POST',
      body: bookingData,
    });
  },

  // Approve booking
  async approve(id, adminMessage = '') {
    return apiRequest(`/zoom/approve/${id}`, {
      method: 'POST',
      body: { admin_message: adminMessage },
    });
  },

  // Reject booking
  async reject(id, adminMessage = '') {
    return apiRequest(`/zoom/reject/${id}`, {
      method: 'POST',
      body: { admin_message: adminMessage },
    });
  },

  // Delete booking
  async delete(id) {
    return apiRequest(`/zoom/booking/${id}`, {
      method: 'DELETE',
    });
  },

  // Test Zoom connection
  async testZoom() {
    return apiRequest('/zoom/test-zoom');
  },
};

// Main API Routes
export const mainApi = {
  // Health check
  async health() {
    return apiRequest('/');
  },

  // Debug booking
  async debugBooking(id) {
    return apiRequest(`/debug-booking/${id}`);
  },
};

// AI & Security Services
export const aiApi = {
  // Groq AI
  async groqHealth() {
    return apiRequest('/ai/groq/health');
  },

  async groqChat(message, options = {}) {
    return apiRequest('/ai/groq/chat', {
      method: 'POST',
      body: { message, options },
    });
  },

  async groqCRMInsights(customerData) {
    return apiRequest('/ai/groq/crm-insights', {
      method: 'POST',
      body: { customerData },
    });
  },
};

export const securityApi = {
  // Nuclei Web Security
  async nucleiScan(target, options = {}) {
    return apiRequest('/security/nuclei/scan', {
      method: 'POST',
      body: { target, options },
    });
  },

  async nucleiHealth() {
    return apiRequest('/security/nuclei/health');
  },

  // Trivy Code Security
  async trivyImageScan(image, options = {}) {
    return apiRequest('/security/trivy/image', {
      method: 'POST',
      body: { image, options },
    });
  },

  async trivyCodeScan(path, options = {}) {
    return apiRequest('/security/trivy/code', {
      method: 'POST',
      body: { path, options },
    });
  },

  // Unified Security
  async securityReport(target) {
    return apiRequest('/security/report', {
      method: 'POST',
      body: { target },
    });
  },

  async securityDashboard(days = 30) {
    return apiRequest(`/security/dashboard?days=${days}`);
  },
};

// Password Management API
export const passwordApi = {
  // Change password (requires current password verification)
  async changePassword({ currentPassword, newPassword }) {
    return apiRequest('/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    });
  },

  // Request password reset
  async requestPasswordReset(email) {
    return apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: { email },
    });
  },

  // Reset password with token
  async resetPassword({ token, newPassword }) {
    return apiRequest('/auth/reset-password', {
      method: 'POST',
      body: { token, newPassword },
    });
  },
};

export default {
  bookings: bookingsApi,
  main: mainApi,
  ai: aiApi,
  security: securityApi,
  password: passwordApi,
};