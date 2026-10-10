import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import ContractorLoginPage from './pages/ContractorLoginPage';
import DashboardPage from './pages/DashboardPage';
import CreateContractorPage from './pages/CreateContractorPage';
import ContractorListPage from './pages/ContractorListPage';
import ContractorDashboardPage from './pages/ContractorDashboardPage';
import PublicContractDetailsPage from './pages/PublicContractDetailsPage';
import CitizenComplaintsPage from './pages/CitizenComplaintsPage';

// Smart Home Redirect based on independently verified user role
const SmartHomeRedirect = () => {
  const {
    isAdminLoading,
    isAdminAuthenticated,
    isContractorLoading,
    isContractorAuthenticated,
  } = useAuth();

  if (isAdminLoading || isContractorLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-gov-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-slate-300">Loading Anti Corruption Transparency System...</p>
        </div>
      </div>
    );
  }

  if (isAdminAuthenticated) return <Navigate to="/dashboard" replace />;
  if (isContractorAuthenticated) return <Navigate to="/contractor/dashboard" replace />;
  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Dedicated Public Citizen QR Routes (Scan QR Code) */}
            <Route path="/public/project/:qrToken" element={<PublicContractDetailsPage />} />
            <Route path="/public/projects/:qrToken" element={<PublicContractDetailsPage />} />
            <Route path="/public/contracts/:qrToken" element={<PublicContractDetailsPage />} />
            <Route path="/public/contract/:qrToken" element={<PublicContractDetailsPage />} />
            <Route path="/contract/:qrToken" element={<PublicContractDetailsPage />} />

            {/* Public Login Routes (Strict Login System - No Public Registration) */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/contractor/login" element={<ContractorLoginPage />} />

            {/* Strict Sign-Up Prevention Routes (Redirects to Login) */}
            <Route path="/signup" element={<Navigate to="/login" replace />} />
            <Route path="/register" element={<Navigate to="/login" replace />} />
            <Route path="/admin/signup" element={<Navigate to="/login" replace />} />
            <Route path="/admin/register" element={<Navigate to="/login" replace />} />
            <Route path="/contractor/signup" element={<Navigate to="/contractor/login" replace />} />
            <Route path="/contractor/register" element={<Navigate to="/contractor/login" replace />} />

            {/* Protected Admin Routes (Admin Only) */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/contractors/create"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <CreateContractorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/contractors"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ContractorListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/complaints"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <CitizenComplaintsPage />
                </ProtectedRoute>
              }
            />

            {/* Protected Contractor Portal Routes (Contractor Only) */}
            <Route
              path="/contractor/dashboard"
              element={
                <ProtectedRoute allowedRoles={['contractor']}>
                  <ContractorDashboardPage />
                </ProtectedRoute>
              }
            />

            {/* Root Redirect */}
            <Route path="/" element={<SmartHomeRedirect />} />

            {/* Catch-all redirect */}
            <Route path="*" element={<SmartHomeRedirect />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
