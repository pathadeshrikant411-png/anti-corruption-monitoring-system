import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api, { setAuthToken } from '../services/api';

const AuthContext = createContext(null);

const STORAGE_TOKEN_KEY = 'anti_corruption_token';
const STORAGE_USER_KEY = 'anti_corruption_user';

export const AuthProvider = ({ children }) => {
  const getStoredToken = () => {
    try {
      return localStorage.getItem(STORAGE_TOKEN_KEY) || null;
    } catch {
      return null;
    }
  };

  const getStoredUser = () => {
    try {
      const u = localStorage.getItem(STORAGE_USER_KEY);
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  };

  const [token, setToken] = useState(getStoredToken);
  const [user, setUser] = useState(getStoredUser);
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getStoredToken() && !!getStoredUser());
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const lastActiveRef = useRef(Date.now());

  const clearError = () => setAuthError(null);

  // Helper to sync local storage and axios headers
  const updateAuthState = useCallback((newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    setIsAuthenticated(!!newToken && !!newUser);

    if (newToken) {
      try {
        localStorage.setItem(STORAGE_TOKEN_KEY, newToken);
      } catch {}
      setAuthToken(newToken);
    } else {
      try {
        localStorage.removeItem(STORAGE_TOKEN_KEY);
      } catch {}
      setAuthToken(null);
    }

    if (newUser) {
      try {
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(newUser));
      } catch {}
    } else {
      try {
        localStorage.removeItem(STORAGE_USER_KEY);
      } catch {}
    }
  }, []);

  // Refresh Token method
  const refreshToken = useCallback(async () => {
    const currentToken = localStorage.getItem(STORAGE_TOKEN_KEY) || token;
    if (!currentToken) return false;

    try {
      const response = await api.post('/auth/refresh');
      const { access_token, user: userData } = response.data;
      if (access_token) {
        const activeUser = userData || user;
        updateAuthState(access_token, activeUser);
        return true;
      }
      return false;
    } catch (err) {
      // If refresh explicitly fails with 401 or account disabled
      if (err.response?.status === 401 || err.response?.status === 403) {
        updateAuthState(null, null);
      }
      return false;
    }
  }, [token, user, updateAuthState]);

  // Verify token status with backend on initial load or navigation
  const checkAuth = useCallback(async () => {
    const currentToken = localStorage.getItem(STORAGE_TOKEN_KEY) || token;
    if (!currentToken) {
      setIsLoading(false);
      return;
    }

    try {
      setAuthToken(currentToken);
      const response = await api.get('/auth/me');
      const userData = response.data;
      if (userData) {
        if (!userData.user_type) {
          userData.user_type = userData.role === 'contractor' ? 'contractor' : 'admin';
        }
      }
      updateAuthState(currentToken, userData);
    } catch (err) {
      // Try silent refresh before marking user logged out
      const refreshed = await refreshToken();
      if (!refreshed) {
        updateAuthState(null, null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, updateAuthState, refreshToken]);

  // Login handler
  const login = async (email, password, isContractor = false) => {
    setIsLoading(true);
    setAuthError(null);

    try {
      const endpoint = isContractor ? '/auth/contractor-login' : '/auth/login';
      const response = await api.post(endpoint, { email, password });
      const { access_token, user: userData, user_type, must_change_password } = response.data;

      const userObj = userData || { email: email.toLowerCase().trim(), user_type, must_change_password };
      userObj.email = userData?.email || email;
      userObj.user_type = user_type || userData?.user_type || (isContractor ? 'contractor' : 'admin');
      userObj.role = userData?.role || userObj.user_type;
      userObj.must_change_password = must_change_password || false;

      updateAuthState(access_token, userObj);

      setIsLoading(false);
      return { success: true, user_type: userObj.user_type, must_change_password, message: response.data.message };
    } catch (err) {
      setIsLoading(false);
      const errorMessage =
        err.response?.data?.detail ||
        'Unable to connect to authentication server. Please check your connection.';
      setAuthError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Explicit user logout handler
  const logout = async () => {
    try {
      const currentToken = localStorage.getItem(STORAGE_TOKEN_KEY) || token;
      if (currentToken) {
        await api.post('/auth/logout').catch(() => {});
      }
    } finally {
      updateAuthState(null, null);
      setAuthError(null);
    }
  };

  // Initial Auth Check
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Listen for custom session events from API interceptor
  useEffect(() => {
    const handleRefreshed = (e) => {
      if (e.detail?.token) {
        setToken(e.detail.token);
        if (e.detail.user) setUser(e.detail.user);
        setIsAuthenticated(true);
      }
    };

    const handleInvalidated = () => {
      updateAuthState(null, null);
    };

    window.addEventListener('sessionRefreshed', handleRefreshed);
    window.addEventListener('sessionInvalidated', handleInvalidated);

    return () => {
      window.removeEventListener('sessionRefreshed', handleRefreshed);
      window.removeEventListener('sessionInvalidated', handleInvalidated);
    };
  }, [updateAuthState]);

  const isContractor = user && (user.user_type === 'contractor' || user.role === 'contractor');
  const isAdmin = user && !isContractor && (user.user_type === 'admin' || user.role === 'super_admin' || user.role === 'admin' || !user.user_type);

  return (
    <AuthContext.Provider
      value={{
        user,
        admin: isAdmin ? user : null,
        contractor: isContractor ? user : null,
        token,
        isAuthenticated,
        isLoading,
        authError,
        clearError,
        login,
        logout,
        checkAuth,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
