import axios from 'axios';

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

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Configure auth token interceptor dynamically
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Request Interceptor: Ensure token from localStorage is attached if missing
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('anti_corruption_token');
    if (token && !config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 Unauthorized with transparent automatic token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized errors transparently
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      const url = originalRequest.url || '';
      
      // Skip token refresh logic on login, refresh, or logout routes
      if (
        url.includes('/auth/login') ||
        url.includes('/auth/contractor-login') ||
        url.includes('/auth/refresh') ||
        url.includes('/auth/logout')
      ) {
        return Promise.reject(error);
      }

      const existingToken = localStorage.getItem('anti_corruption_token');
      if (!existingToken) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          {},
          {
            headers: {
              'Authorization': `Bearer ${existingToken}`,
              'Content-Type': 'application/json',
              'Bypass-Tunnel-Reminder': 'true',
              'localtunnel-skip-warning': 'true',
              'ngrok-skip-browser-warning': 'true'
            }
          }
        );

        const newToken = refreshResponse.data.access_token;
        const updatedUser = refreshResponse.data.user;

        if (newToken) {
          localStorage.setItem('anti_corruption_token', newToken);
          if (updatedUser) {
            localStorage.setItem('anti_corruption_user', JSON.stringify(updatedUser));
          }

          setAuthToken(newToken);
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;

          window.dispatchEvent(
            new CustomEvent('sessionRefreshed', {
              detail: { token: newToken, user: updatedUser }
            })
          );

          processQueue(null, newToken);
          return api(originalRequest);
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        
        // Session is genuinely invalid or revoked
        localStorage.removeItem('anti_corruption_token');
        localStorage.removeItem('anti_corruption_user');
        setAuthToken(null);

        window.dispatchEvent(new CustomEvent('sessionInvalidated'));
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
