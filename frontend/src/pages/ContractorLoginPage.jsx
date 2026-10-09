import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Landmark, Lock, Mail, Eye, EyeOff, ShieldAlert, ArrowRight, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationToast from '../components/NotificationToast';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../services/api';

const ContractorLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleContractorLoginSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setErrorMsg(null);

    const result = await login(email, password, true);
    setIsLoading(false);

    if (result.success) {
      navigate('/contractor/dashboard');
    } else {
      setErrorMsg(
        result.error || 'Unable to authenticate. Please check your contractor credentials.'
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between selection:bg-emerald-600 selection:text-white relative overflow-hidden">
      {/* Clean gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-emerald-50/20 to-slate-200 pointer-events-none"></div>

      {/* Top Banner Header */}
      <header className="w-full bg-slate-900 border-b border-slate-800 py-3 px-4 sm:px-8 text-white relative z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-600 p-2 rounded-lg text-white shadow-md">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Official Contractor Access Portal
              </p>
              <h1 className="text-sm sm:text-base font-bold text-slate-100 leading-tight">
                Anti Curruption Monitoring System
              </h1>
            </div>
          </div>
          <div className="hidden md:flex items-center text-xs text-slate-400 gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            <span>Contractor Authentication Perimeter</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 relative z-10">
        <div className="w-full max-w-md">
          {/* Card Container */}
          <div className="glass-panel bg-white/95 rounded-2xl shadow-gov-card border border-slate-200/80 overflow-hidden">
            {/* Top Accent Bar */}
            <div className="h-2 bg-gradient-to-r from-emerald-800 via-emerald-600 to-teal-400"></div>

            <div className="p-6 sm:p-8">
              {/* Building Icon & Headers */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-inner mb-3">
                  <Building2 className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Contractor Portal Login
                </h2>
                <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
                  Access Assigned Government Contracts & Financial Details
                </p>
              </div>

              {/* Notification Toast for Errors */}
              {errorMsg && (
                <div className="mb-5">
                  <NotificationToast
                    type="error"
                    message={errorMsg}
                    onClose={() => setErrorMsg(null)}
                  />
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleContractorLoginSubmit} className="space-y-4">
                {/* Email Input */}
                <div>
                  <label
                    htmlFor="contractor-email"
                    className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                  >
                    Contractor Login Email
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      id="contractor-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contractor@firm.gov"
                      className="block w-full pl-10 pr-3 py-2.5 text-sm text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <label
                    htmlFor="contractor-password"
                    className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      id="contractor-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="block w-full pl-10 pr-10 py-2.5 text-sm text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition-all placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || !email || !password}
                  className="w-full mt-2 py-3 px-4 bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white font-semibold text-sm rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                >
                  {isLoading ? (
                    <LoadingSpinner size="sm" text="Authenticating Contractor..." />
                  ) : (
                    <>
                      <span>Sign In to Contractor Portal</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Card Footer Switch Link */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 text-center text-xs text-slate-600 flex items-center justify-between">
              <span className="text-slate-500">Government Administrator?</span>
              <Link
                to="/login"
                className="font-bold text-gov-700 hover:text-gov-900 hover:underline transition-colors flex items-center gap-1"
              >
                <Landmark className="w-3.5 h-3.5" />
                Switch to Admin Portal
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-slate-500 border-t border-slate-200 bg-white relative z-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 Anti Curruption Monitoring System. All rights reserved.</p>
          <div className="flex items-center space-x-4 text-slate-400">
            <span>Contractor Access Policy</span>
            <span>•</span>
            <span>Audit Trail</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ContractorLoginPage;
