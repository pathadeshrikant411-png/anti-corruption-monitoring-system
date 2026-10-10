import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Landmark, Building2 } from 'lucide-react';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const {
    isAdminLoading,
    isAdminAuthenticated,
    adminUser,
    isContractorLoading,
    isContractorAuthenticated,
    contractorUser,
  } = useAuth();

  const location = useLocation();
  const requiresContractor = allowedRoles.includes('contractor');
  const requiresAdmin = allowedRoles.includes('admin') || (!requiresContractor && allowedRoles.length > 0);

  // 1. Contractor Route Protection
  if (requiresContractor) {
    if (isContractorLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
          <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-slate-800/80 border border-slate-700 shadow-2xl">
            <div className="p-3 bg-emerald-600/20 text-emerald-400 rounded-xl mb-1">
              <Building2 className="w-7 h-7 animate-pulse" />
            </div>
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-semibold text-slate-200">Verifying Contractor Credentials...</p>
            <p className="text-xs text-slate-400">Authenticating access to contractor portal</p>
          </div>
        </div>
      );
    }

    if (!isContractorAuthenticated || contractorUser?.user_type !== 'contractor') {
      return <Navigate to="/contractor/login" state={{ from: location }} replace />;
    }

    return children;
  }

  // 2. Admin Route Protection
  if (requiresAdmin) {
    if (isAdminLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
          <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-slate-800/80 border border-slate-700 shadow-2xl">
            <div className="p-3 bg-gov-600/20 text-gov-400 rounded-xl mb-1">
              <Landmark className="w-7 h-7 animate-pulse" />
            </div>
            <div className="w-8 h-8 border-3 border-gov-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-semibold text-slate-200">Verifying Administrative Security Clearance...</p>
            <p className="text-xs text-slate-400">Authenticating access to government dashboard</p>
          </div>
        </div>
      );
    }

    if (!isAdminAuthenticated || adminUser?.user_type !== 'admin') {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
  }

  return children;
};

export default ProtectedRoute;
