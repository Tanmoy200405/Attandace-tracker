const BASE_URL = import.meta.env.VITE_API_URL;

const getHeaders = () => {
  const token = localStorage.getItem('biotrack_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (response) => {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'An error occurred during request');
  }
  return data;
};

export const api = {
  // Auth
  auth: {
    login: async (email, password) => {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      return handleResponse(res);
    },
    register: async (payload) => {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return handleResponse(res);
    },
    getMe: async () => {
      const res = await fetch(`${BASE_URL}/auth/me`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    updateSettings: async (settings) => {
      const res = await fetch(`${BASE_URL}/auth/settings`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(settings),
      });
      return handleResponse(res);
    },
  },

  // Staff
  staff: {
    getAll: async (params = {}) => {
      const query = new URLSearchParams(params).toString();
      const res = await fetch(`${BASE_URL}/staff?${query}`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getKioskEnrolled: async () => {
      const res = await fetch(`${BASE_URL}/staff/kiosk/enrolled`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getById: async (id) => {
      const res = await fetch(`${BASE_URL}/staff/${id}`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    create: async (data) => {
      const res = await fetch(`${BASE_URL}/staff`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    update: async (id, data) => {
      const res = await fetch(`${BASE_URL}/staff/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const res = await fetch(`${BASE_URL}/staff/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    enrollFace: async (id, facePhoto, faceDescriptor) => {
      const res = await fetch(`${BASE_URL}/staff/${id}/enroll-face`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ facePhoto, faceDescriptor }),
      });
      return handleResponse(res);
    },
    enrollFingerprint: async (id, credentialId, publicKey) => {
      const res = await fetch(`${BASE_URL}/staff/${id}/enroll-fingerprint`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ credentialId, publicKey }),
      });
      return handleResponse(res);
    },
    clearBiometrics: async (id) => {
      const res = await fetch(`${BASE_URL}/staff/${id}/clear-biometrics`, {
        method: 'POST',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  // Attendance
  attendance: {
    getByDate: async (date, department) => {
      const query = department && department !== 'All' ? `?department=${encodeURIComponent(department)}` : '';
      const res = await fetch(`${BASE_URL}/attendance/date/${date}${query}`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    get30DaySummary: async () => {
      const res = await fetch(`${BASE_URL}/attendance/summary/30days`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    biometricVerify: async (payload) => {
      const res = await fetch(`${BASE_URL}/attendance/biometric-verify`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      return handleResponse(res);
    },
    manualMark: async (payload) => {
      const res = await fetch(`${BASE_URL}/attendance/manual`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      return handleResponse(res);
    },
    bulkMark: async (payload) => {
      const res = await fetch(`${BASE_URL}/attendance/bulk-mark`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      return handleResponse(res);
    },
  },

  // Reports
  reports: {
    getMonthly: async (year, month, department) => {
      const params = new URLSearchParams({ year, month });
      if (department && department !== 'All') params.append('department', department);
      const res = await fetch(`${BASE_URL}/reports/monthly?${params.toString()}`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getExportUrl: (startDate, endDate, department) => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (department && department !== 'All') params.append('department', department);
      return `${BASE_URL}/reports/export-csv?${params.toString()}`;
    },
  },
};
