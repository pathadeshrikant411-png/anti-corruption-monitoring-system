import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-gov-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-600">Verifying Security Credentials...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const isContractorPath = location.pathname.startsWith('/contractor');
    const redirectPath = isContractorPath ? '/contractor/login' : '/login';
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  const isContractorUser = user?.user_type === 'contractor' || user?.role === 'contractor';
  const userRole = isContractorUser ? 'contractor' : 'admin';

  // Role restriction enforcement
  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    if (userRole === 'contractor') {
      if (location.pathname !== '/contractor/dashboard') {
        return <Navigate to="/contractor/dashboard" replace />;
      }
    } else {
      if (location.pathname !== '/dashboard') {
        return <Navigate to="/dashboard" replace />;
      }
    }
  }

  return children;
};

export default ProtectedRoute;
