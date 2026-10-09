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

// Smart Home Redirect based on logged-in user role
const SmartHomeRedirect = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const isContractorUser = user?.user_type === 'contractor' || user?.role === 'contractor';
  if (isContractorUser) return <Navigate to="/contractor/dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
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
