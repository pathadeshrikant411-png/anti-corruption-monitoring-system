import axios from 'axios';

// Storage Key Constants for Independent Portals
export const ADMIN_TOKEN_KEY = 'admin_access_token';
export const ADMIN_USER_KEY = 'admin_profile';
export const CONTRACTOR_TOKEN_KEY = 'contractor_access_token';
export const CONTRACTOR_USER_KEY = 'contractor_profile';

// Create central API client
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true',
    'localtunnel-skip-warning': 'true',
    'ngrok-skip-browser-warning': 'true'
  },
  timeout: 30000,
});

let isRefreshingAdmin = false;
let isRefreshingContractor = false;
let failedAdminQueue = [];
let failedContractorQueue = [];

const processQueue = (queue, error, token = null) => {
  queue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
};

// Accurately determine whether a request belongs to the Contractor Portal
export const isContractorPortalRequest = (url = '') => {
  const cleanUrl = (url || '').toLowerCase();

  // IMPORTANT: Any endpoint starting with /contractors or /api/contractors (plural)
  // is strictly the Administration Contractor Management Router!
  // (e.g., POST /contractors, GET /contractors, /contractors/:id, /contractors/complaints, etc.)
  if (
    cleanUrl.startsWith('/contractors') ||
    cleanUrl.startsWith('/api/contractors')
  ) {
    return false;
  }

  // Contractor Portal endpoints are singular:
  // e.g., /contractor/profile, /contractor/contracts, /contractor/change-password, or /auth/contractor-login
  if (
    cleanUrl.startsWith('/contractor/') ||
    cleanUrl.startsWith('/api/contractor/') ||
    cleanUrl === '/contractor' ||
    cleanUrl === '/api/contractor' ||
    cleanUrl.includes('/auth/contractor-')
  ) {
    return true;
  }

  // Fallback to active browser page location if URL does not specify
  if (typeof window !== 'undefined') {
    const currentPath = (window.location.pathname || '').toLowerCase();
    if (currentPath.startsWith('/contractor')) {
      return true;
    }
    if (currentPath.startsWith('/admin') || currentPath.startsWith('/dashboard') || currentPath === '/login') {
      return false;
    }
  }

  return false;
};

// Determine which token to attach based on request URL and window location
const resolveTokenForRequest = (url = '') => {
  const isContractorTarget = isContractorPortalRequest(url);

  if (isContractorTarget) {
    const contractorToken = localStorage.getItem(CONTRACTOR_TOKEN_KEY);
    if (contractorToken) return { token: contractorToken, portal: 'contractor' };
  } else {
    const adminToken = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (adminToken) return { token: adminToken, portal: 'admin' };
  }

  // Fallback if portal-specific token not found
  if (isContractorTarget) {
    const fallbackContractor = localStorage.getItem(CONTRACTOR_TOKEN_KEY);
    if (fallbackContractor) return { token: fallbackContractor, portal: 'contractor' };
  } else {
    const fallbackAdmin = localStorage.getItem(ADMIN_TOKEN_KEY) || localStorage.getItem('anti_corruption_token');
    if (fallbackAdmin) return { token: fallbackAdmin, portal: 'admin' };
  }

  // Legacy key check if migration in progress
  const legacyToken = localStorage.getItem('anti_corruption_token');
  if (legacyToken) return { token: legacyToken, portal: isContractorTarget ? 'contractor' : 'admin' };

  return { token: null, portal: null };
};

// Configure dynamic default auth header
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Request Interceptor: Attach portal-specific token strictly
api.interceptors.request.use(
  (config) => {
    if (!config.headers['Authorization']) {
      const { token } = resolveTokenForRequest(config.url || '');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Independent 401 transparent token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      const url = originalRequest.url || '';

      // Skip refresh for auth endpoints themselves
      if (
        url.includes('/auth/login') ||
        url.includes('/auth/contractor-login') ||
        url.includes('/auth/refresh') ||
        url.includes('/auth/logout')
      ) {
        return Promise.reject(error);
      }

      const isContractorRequest = isContractorPortalRequest(url);

      const storageTokenKey = isContractorRequest ? CONTRACTOR_TOKEN_KEY : ADMIN_TOKEN_KEY;
      const storageUserKey = isContractorRequest ? CONTRACTOR_USER_KEY : ADMIN_USER_KEY;
      const existingToken = localStorage.getItem(storageTokenKey) || localStorage.getItem('anti_corruption_token');

      if (!existingToken) {
        return Promise.reject(error);
      }

      if (isContractorRequest) {
        if (isRefreshingContractor) {
          return new Promise((resolve, reject) => {
            failedContractorQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
              return api(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshingContractor = true;

        try {
          const refreshRes = await axios.post(
            `${api.defaults.baseURL}/auth/refresh`,
            {},
            {
              headers: {
                Authorization: `Bearer ${existingToken}`,
                'Content-Type': 'application/json',
                'Bypass-Tunnel-Reminder': 'true',
                'localtunnel-skip-warning': 'true',
                'ngrok-skip-browser-warning': 'true'
              }
            }
          );

          const newToken = refreshRes.data.access_token;
          const updatedUser = refreshRes.data.user;

          if (newToken) {
            localStorage.setItem(CONTRACTOR_TOKEN_KEY, newToken);
            if (updatedUser) localStorage.setItem(CONTRACTOR_USER_KEY, JSON.stringify(updatedUser));
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;

            window.dispatchEvent(
              new CustomEvent('contractorSessionRefreshed', {
                detail: { token: newToken, user: updatedUser }
              })
            );

            processQueue(failedContractorQueue, null, newToken);
            failedContractorQueue = [];
            return api(originalRequest);
          }
        } catch (refreshErr) {
          processQueue(failedContractorQueue, refreshErr, null);
          failedContractorQueue = [];
          localStorage.removeItem(CONTRACTOR_TOKEN_KEY);
          localStorage.removeItem(CONTRACTOR_USER_KEY);
          window.dispatchEvent(new CustomEvent('contractorSessionInvalidated'));
          return Promise.reject(refreshErr);
        } finally {
          isRefreshingContractor = false;
        }
      } else {
        // Admin refresh flow
        if (isRefreshingAdmin) {
          return new Promise((resolve, reject) => {
            failedAdminQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
              return api(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshingAdmin = true;

        try {
          const refreshRes = await axios.post(
            `${api.defaults.baseURL}/auth/refresh`,
            {},
            {
              headers: {
                Authorization: `Bearer ${existingToken}`,
                'Content-Type': 'application/json',
                'Bypass-Tunnel-Reminder': 'true',
                'localtunnel-skip-warning': 'true',
                'ngrok-skip-browser-warning': 'true'
              }
            }
          );

          const newToken = refreshRes.data.access_token;
          const updatedUser = refreshRes.data.user;

          if (newToken) {
            localStorage.setItem(ADMIN_TOKEN_KEY, newToken);
            if (updatedUser) localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(updatedUser));
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;

            window.dispatchEvent(
              new CustomEvent('adminSessionRefreshed', {
                detail: { token: newToken, user: updatedUser }
              })
            );

            processQueue(failedAdminQueue, null, newToken);
            failedAdminQueue = [];
            return api(originalRequest);
          }
        } catch (refreshErr) {
          processQueue(failedAdminQueue, refreshErr, null);
          failedAdminQueue = [];
          localStorage.removeItem(ADMIN_TOKEN_KEY);
          localStorage.removeItem(ADMIN_USER_KEY);
          window.dispatchEvent(new CustomEvent('adminSessionInvalidated'));
          return Promise.reject(refreshErr);
        } finally {
          isRefreshingAdmin = false;
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
