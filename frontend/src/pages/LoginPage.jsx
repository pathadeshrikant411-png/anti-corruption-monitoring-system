import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Landmark, Lock, Mail, Eye, EyeOff, ShieldAlert, HelpCircle, ArrowRight, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationToast from '../components/NotificationToast';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../services/api';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState(null);
  const [isForgotLoading, setIsForgotLoading] = useState(false);

  const { login, isLoading, authError, clearError } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    const result = await login(email, password);
    if (result.success) {
      if (result.user_type === 'contractor') {
        navigate('/contractor/dashboard');
      } else {
        navigate('/dashboard');
      }
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return;

    setIsForgotLoading(true);
    setForgotMessage(null);

    try {
      const response = await api.post('/auth/forgot-password', { email: forgotEmail });
      setForgotMessage({ type: 'success', text: response.data.message });
    } catch (err) {
      setForgotMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to submit password recovery request.',
      });
    } finally {
      setIsForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between selection:bg-gov-600 selection:text-white relative overflow-hidden">
      {/* Clean gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-blue-50/20 to-slate-200 pointer-events-none"></div>

      {/* Top Banner Header */}
      <header className="w-full bg-slate-900 border-b border-slate-800 py-3 px-4 sm:px-8 text-white relative z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gov-600 p-2 rounded-lg text-white shadow-md">
              <Landmark className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gov-400">
                Official Admin Portal
              </p>
              <h1 className="text-sm sm:text-base font-bold text-slate-100 leading-tight">
                Anti Curruption Monitoring System
              </h1>
            </div>
          </div>
          <div className="hidden md:flex items-center text-xs text-slate-400 gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            <span>Encrypted 256-bit SSL Connection</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 relative z-10">
        <div className="w-full max-w-md">
          {/* Card Container */}
          <div className="glass-panel bg-white/95 rounded-2xl shadow-gov-card border border-slate-200/80 overflow-hidden">
            {/* Top Accent Bar */}
            <div className="h-2 bg-gradient-to-r from-gov-800 via-gov-600 to-gov-400"></div>

            <div className="p-6 sm:p-8">
              {/* Building Icon & Headers */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gov-50 text-gov-700 border border-gov-100 shadow-inner mb-3">
                  <Landmark className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Admin Login
                </h2>
                <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
                  Secure Administration Portal
                </p>
              </div>

              {/* Notification Toast for Errors */}
              {authError && (
                <div className="mb-5">
                  <NotificationToast
                    type="error"
                    message={authError}
                    onClose={clearError}
                  />
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Email Input */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                  >
                    Admin Email Address
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@transparency.gov"
                      className="block w-full pl-10 pr-3 py-2.5 text-sm text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-500 focus:border-gov-500 focus:bg-white transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="block w-full pl-10 pr-10 py-2.5 text-sm text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-500 focus:border-gov-500 focus:bg-white transition-all placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 text-gov-600 focus:ring-gov-500 border-slate-300 rounded cursor-pointer"
                    />
                    <span className="ml-2 text-xs text-slate-600 font-medium">
                      Remember Me
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setIsForgotModalOpen(true);
                      setForgotMessage(null);
                    }}
                    className="text-xs font-semibold text-gov-600 hover:text-gov-800 hover:underline transition-colors focus:outline-none"
                  >
                    Forgot Password?
                  </button>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || !email || !password}
                  className="w-full mt-2 py-3 px-4 bg-gov-800 hover:bg-gov-900 active:bg-gov-950 text-white font-semibold text-sm rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gov-500 focus:ring-offset-2"
                >
                  {isLoading ? (
                    <LoadingSpinner size="sm" text="Authenticating Admin..." />
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Card Footer Switch Link */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 text-center text-xs text-slate-600 flex items-center justify-between">
              <span className="text-slate-500">Registered Contractor?</span>
              <Link
                to="/contractor/login"
                className="font-bold text-emerald-700 hover:text-emerald-900 hover:underline transition-colors flex items-center gap-1"
              >
                <Building2 className="w-3.5 h-3.5" />
                Switch to Contractor Portal
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
            <span>Security Policy</span>
            <span>•</span>
            <span>Audit Trail</span>
            <span>•</span>
            <span>System Status</span>
          </div>
        </div>
      </footer>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden">
            <div className="bg-gov-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <HelpCircle className="w-5 h-5 text-gov-300" />
                <h3 className="font-bold text-sm">Admin Password Reset</h3>
              </div>
              <button
                onClick={() => setIsForgotModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                ✕
              </button>
            </div>
            <div className="p-5">
              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                Enter your registered administrator email address below. Password reset requests undergo security verification.
              </p>

              {forgotMessage && (
                <div className="mb-4">
                  <NotificationToast
                    type={forgotMessage.type}
                    message={forgotMessage.text}
                  />
                </div>
              )}

              <form onSubmit={handleForgotPasswordSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Registered Email
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="admin@transparency.gov"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-500 focus:outline-none"
                  />
                </div>
                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isForgotLoading || !forgotEmail}
                    className="flex-1 py-2 px-3 bg-gov-700 hover:bg-gov-800 text-white text-xs font-semibold rounded-lg shadow flex items-center justify-center"
                  >
                    {isForgotLoading ? <LoadingSpinner size="sm" text="" /> : 'Send Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
