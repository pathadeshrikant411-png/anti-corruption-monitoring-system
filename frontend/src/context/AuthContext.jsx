import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import api, {
  ADMIN_TOKEN_KEY,
  ADMIN_USER_KEY,
  CONTRACTOR_TOKEN_KEY,
  CONTRACTOR_USER_KEY
} from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Safe LocalStorage helpers
  const getStoredItem = (key) => {
    try {
      return localStorage.getItem(key) || null;
    } catch {
      return null;
    }
  };

  const getStoredJson = (key) => {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : null;
    } catch {
      return null;
    }
  };

  // Migration from legacy single storage key
  const initSessions = () => {
    try {
      const legacyToken = localStorage.getItem('anti_corruption_token');
      const legacyUserStr = localStorage.getItem('anti_corruption_user');
      if (legacyToken && legacyUserStr) {
        const parsed = JSON.parse(legacyUserStr);
        if (parsed.user_type === 'contractor' && !localStorage.getItem(CONTRACTOR_TOKEN_KEY)) {
          localStorage.setItem(CONTRACTOR_TOKEN_KEY, legacyToken);
          localStorage.setItem(CONTRACTOR_USER_KEY, legacyUserStr);
        } else if (parsed.user_type === 'admin' && !localStorage.getItem(ADMIN_TOKEN_KEY)) {
          localStorage.setItem(ADMIN_TOKEN_KEY, legacyToken);
          localStorage.setItem(ADMIN_USER_KEY, legacyUserStr);
        }
        localStorage.removeItem('anti_corruption_token');
        localStorage.removeItem('anti_corruption_user');
      }
    } catch {}
  };

  initSessions();

  // 1. Independent Admin Session State
  const [adminToken, setAdminToken] = useState(() => getStoredItem(ADMIN_TOKEN_KEY));
  const [adminUser, setAdminUser] = useState(() => getStoredJson(ADMIN_USER_KEY));
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => !!getStoredItem(ADMIN_TOKEN_KEY) && !!getStoredJson(ADMIN_USER_KEY));
  const [isAdminLoading, setIsAdminLoading] = useState(true);
  const [adminError, setAdminError] = useState(null);

  // 2. Independent Contractor Session State
  const [contractorToken, setContractorToken] = useState(() => getStoredItem(CONTRACTOR_TOKEN_KEY));
  const [contractorUser, setContractorUser] = useState(() => getStoredJson(CONTRACTOR_USER_KEY));
  const [isContractorAuthenticated, setIsContractorAuthenticated] = useState(() => !!getStoredItem(CONTRACTOR_TOKEN_KEY) && !!getStoredJson(CONTRACTOR_USER_KEY));
  const [isContractorLoading, setIsContractorLoading] = useState(true);
  const [contractorError, setContractorError] = useState(null);

  // Sync Admin Storage
  const updateAdminState = useCallback((newToken, newUser) => {
    setAdminToken(newToken);
    setAdminUser(newUser);
    setIsAdminAuthenticated(!!newToken && !!newUser);

    if (newToken) {
      try { localStorage.setItem(ADMIN_TOKEN_KEY, newToken); } catch {}
    } else {
      try { localStorage.removeItem(ADMIN_TOKEN_KEY); } catch {}
    }

    if (newUser) {
      try { localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(newUser)); } catch {}
    } else {
      try { localStorage.removeItem(ADMIN_USER_KEY); } catch {}
    }
  }, []);

  // Sync Contractor Storage
  const updateContractorState = useCallback((newToken, newUser) => {
    setContractorToken(newToken);
    setContractorUser(newUser);
    setIsContractorAuthenticated(!!newToken && !!newUser);

    if (newToken) {
      try { localStorage.setItem(CONTRACTOR_TOKEN_KEY, newToken); } catch {}
    } else {
      try { localStorage.removeItem(CONTRACTOR_TOKEN_KEY); } catch {}
    }

    if (newUser) {
      try { localStorage.setItem(CONTRACTOR_USER_KEY, JSON.stringify(newUser)); } catch {}
    } else {
      try { localStorage.removeItem(CONTRACTOR_USER_KEY); } catch {}
    }
  }, []);

  // Verify Admin credentials with backend
  const checkAdminAuth = useCallback(async () => {
    const curToken = getStoredItem(ADMIN_TOKEN_KEY) || adminToken;
    if (!curToken) {
      setIsAdminLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${api.defaults.baseURL}/auth/me`, {
        headers: { Authorization: `Bearer ${curToken}` }
      });
      const userData = response.data;
      if (userData && (userData.user_type === 'admin' || userData.role === 'admin' || userData.role === 'super_admin')) {
        updateAdminState(curToken, { ...userData, user_type: 'admin' });
      } else {
        // Not an admin account
        updateAdminState(null, null);
      }
    } catch (err) {
      // If 401, clear admin session
      if (err.response?.status === 401 || err.response?.status === 403) {
        updateAdminState(null, null);
      }
    } finally {
      setIsAdminLoading(false);
    }
  }, [adminToken, updateAdminState]);

  // Verify Contractor credentials with backend
  const checkContractorAuth = useCallback(async () => {
    const curToken = getStoredItem(CONTRACTOR_TOKEN_KEY) || contractorToken;
    if (!curToken) {
      setIsContractorLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${api.defaults.baseURL}/auth/me`, {
        headers: { Authorization: `Bearer ${curToken}` }
      });
      const userData = response.data;
      if (userData && (userData.user_type === 'contractor' || userData.role === 'contractor')) {
        updateContractorState(curToken, { ...userData, user_type: 'contractor' });
      } else {
        // Not a contractor account
        updateContractorState(null, null);
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        updateContractorState(null, null);
      }
    } finally {
      setIsContractorLoading(false);
    }
  }, [contractorToken, updateContractorState]);

  // Initial Auth Check on Mount
  useEffect(() => {
    checkAdminAuth();
    checkContractorAuth();
  }, [checkAdminAuth, checkContractorAuth]);

  // Listen to session refresh and invalidation events from api interceptor
  useEffect(() => {
    const handleAdminRefreshed = (e) => {
      if (e.detail?.token) {
        updateAdminState(e.detail.token, e.detail.user || adminUser);
      }
    };
    const handleAdminInvalidated = () => {
      updateAdminState(null, null);
    };

    const handleContractorRefreshed = (e) => {
      if (e.detail?.token) {
        updateContractorState(e.detail.token, e.detail.user || contractorUser);
      }
    };
    const handleContractorInvalidated = () => {
      updateContractorState(null, null);
    };

    window.addEventListener('adminSessionRefreshed', handleAdminRefreshed);
    window.addEventListener('adminSessionInvalidated', handleAdminInvalidated);
    window.addEventListener('contractorSessionRefreshed', handleContractorRefreshed);
    window.addEventListener('contractorSessionInvalidated', handleContractorInvalidated);

    return () => {
      window.removeEventListener('adminSessionRefreshed', handleAdminRefreshed);
      window.removeEventListener('adminSessionInvalidated', handleAdminInvalidated);
      window.removeEventListener('contractorSessionRefreshed', handleContractorRefreshed);
      window.removeEventListener('contractorSessionInvalidated', handleContractorInvalidated);
    };
  }, [updateAdminState, updateContractorState, adminUser, contractorUser]);

  // 1. Dedicated Admin Login
  const loginAdmin = async (email, password) => {
    setIsAdminLoading(true);
    setAdminError(null);

    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token, user: userData, user_type, must_change_password } = response.data;

      if (user_type !== 'admin') {
        throw new Error('Access Denied: Non-admin account cannot log in through Admin Portal.');
      }

      const userObj = userData || { email: email.toLowerCase().trim(), user_type: 'admin', must_change_password };
      userObj.user_type = 'admin';
      userObj.role = userData?.role || 'admin';
      userObj.must_change_password = !!must_change_password;

      updateAdminState(access_token, userObj);
      setIsAdminLoading(false);

      return {
        success: true,
        user_type: 'admin',
        user: userObj,
        message: response.data.message
      };
    } catch (err) {
      setIsAdminLoading(false);
      const errorMessage =
        err.response?.data?.detail ||
        err.message ||
        'Unable to authenticate administrator. Please check your credentials.';
      setAdminError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // 2. Dedicated Contractor Login
  const loginContractor = async (email, password) => {
    setIsContractorLoading(true);
    setContractorError(null);

    try {
      const response = await api.post('/auth/contractor-login', { email, password });
      const { access_token, user: userData, user_type, must_change_password } = response.data;

      if (user_type !== 'contractor') {
        throw new Error('Access Denied: Non-contractor account cannot log in through Contractor Portal.');
      }

      const userObj = userData || { email: email.toLowerCase().trim(), user_type: 'contractor', must_change_password };
      userObj.user_type = 'contractor';
      userObj.role = 'contractor';
      userObj.must_change_password = !!must_change_password;

      updateContractorState(access_token, userObj);
      setIsContractorLoading(false);

      return {
        success: true,
        user_type: 'contractor',
        user: userObj,
        message: response.data.message
      };
    } catch (err) {
      setIsContractorLoading(false);
      const errorMessage =
        err.response?.data?.detail ||
        err.message ||
        'Unable to authenticate contractor. Please check your credentials.';
      setContractorError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Dedicated Logout Functions
  const logoutAdmin = async () => {
    try {
      if (adminToken) {
        await api.post('/auth/logout', {}, {
          headers: { Authorization: `Bearer ${adminToken}` }
        }).catch(() => {});
      }
    } finally {
      updateAdminState(null, null);
      setAdminError(null);
    }
  };

  const logoutContractor = async () => {
    try {
      if (contractorToken) {
        await api.post('/auth/logout', {}, {
          headers: { Authorization: `Bearer ${contractorToken}` }
        }).catch(() => {});
      }
    } finally {
      updateContractorState(null, null);
      setContractorError(null);
    }
  };

  // Intelligent Contextual Logout
  const logout = async (portal = null) => {
    const isContractorPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/contractor');
    if (portal === 'contractor' || isContractorPath) {
      await logoutContractor();
    } else if (portal === 'admin') {
      await logoutAdmin();
    } else {
      // Default: logout the current active portal, or both if indeterminate
      if (isAdminAuthenticated) await logoutAdmin();
      if (isContractorAuthenticated) await logoutContractor();
    }
  };

  // Generic login wrapper for backward-compatibility
  const login = async (email, password, isContractor = false) => {
    if (isContractor) {
      return loginContractor(email, password);
    }
    return loginAdmin(email, password);
  };

  // Context-aware defaults for legacy components
  const isContractorView = typeof window !== 'undefined' && window.location.pathname.startsWith('/contractor');

  const activeUser = isContractorView ? (contractorUser || adminUser) : (adminUser || contractorUser);
  const activeToken = isContractorView ? (contractorToken || adminToken) : (adminToken || contractorToken);
  const activeIsAuthenticated = isContractorView ? isContractorAuthenticated : isAdminAuthenticated;
  const activeIsLoading = isContractorView ? isContractorLoading : isAdminLoading;
  const activeError = isContractorView ? contractorError : adminError;

  const value = useMemo(() => ({
    // Shared / Context-aware
    user: activeUser,
    token: activeToken,
    isAuthenticated: activeIsAuthenticated,
    isLoading: activeIsLoading,
    authError: activeError,
    clearError: () => {
      setAdminError(null);
      setContractorError(null);
    },
    login,
    logout,

    // Specific Admin Portal Session
    admin: adminUser,
    adminUser,
    adminToken,
    isAdminAuthenticated,
    isAdminLoading,
    adminError,
    loginAdmin,
    logoutAdmin,
    checkAdminAuth,

    // Specific Contractor Portal Session
    contractor: contractorUser,
    contractorUser,
    contractorToken,
    isContractorAuthenticated,
    isContractorLoading,
    contractorError,
    loginContractor,
    logoutContractor,
    checkContractorAuth,
  }), [
    activeUser,
    activeToken,
    activeIsAuthenticated,
    activeIsLoading,
    activeError,
    adminUser,
    adminToken,
    isAdminAuthenticated,
    isAdminLoading,
    adminError,
    contractorUser,
    contractorToken,
    isContractorAuthenticated,
    isContractorLoading,
    contractorError,
    checkAdminAuth,
    checkContractorAuth
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
