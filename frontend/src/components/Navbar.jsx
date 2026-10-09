import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Landmark, LogOut, ShieldCheck, Palette, Check, Settings,
  LayoutDashboard, AlertTriangle, UserPlus, Users, ChevronDown, Sparkles, Building
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ThemeCustomizerModal from './ThemeCustomizerModal';

const Navbar = ({ hideTheme = false, isPublic = false }) => {
  const { admin, contractor, logout } = useAuth();
  const { config, updateConfig, currentPreset, THEME_PRESETS } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  // Active Dropdown state: null | 'operations' | 'contractors' | 'theme'
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isAdvancedThemeOpen, setIsAdvancedThemeOpen] = useState(false);
  
  const navRef = useRef(null);

  const isPublicView = hideTheme || isPublic;
  const headerBgClass = isPublicView
    ? 'bg-gradient-to-r from-gov-950 via-gov-900 to-gov-800 text-white border-b border-gov-800 shadow-md relative z-30'
    : `${currentPreset.headerBg} border-b shadow-md transition-colors duration-300 relative z-30`;

  // Close all dropdown menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdowns on route change
  useEffect(() => {
    setActiveDropdown(null);
  }, [location.pathname]);

  const toggleDropdown = (menuName) => {
    setActiveDropdown(prev => (prev === menuName ? null : menuName));
  };

  const handleSelectTheme = (themeId) => {
    updateConfig({ theme: themeId });
    setActiveDropdown(null);
  };

  // Active route checkers
  const isOperationsActive = location.pathname === '/dashboard' || location.pathname === '/admin/complaints';
  const isContractorsActive = location.pathname.startsWith('/admin/contractors');

  return (
    <>
      <header className={headerBgClass} ref={navRef}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-3 min-w-0 flex-shrink-0 mr-4">
            <div
              onClick={() => navigate(admin ? '/dashboard' : contractor ? '/contractor/dashboard' : '/')}
              className="bg-gov-600/90 p-2 rounded-xl text-white shadow-md flex items-center justify-center shrink-0 border border-white/20 cursor-pointer hover:opacity-90 transition-opacity"
            >
              <Landmark className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1
                  onClick={() => navigate(admin ? '/dashboard' : contractor ? '/contractor/dashboard' : '/')}
                  className="font-extrabold text-xs sm:text-base tracking-tight text-white leading-tight truncate cursor-pointer hover:text-slate-200 transition-colors"
                >
                  Anti Curruption Monitoring System
                </h1>
                <span className="hidden xl:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  Transparency Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-300 hidden md:block truncate">
                Government Oversight, Contractor Accountability & Citizen Monitoring
              </p>
            </div>
          </div>

          {/* Professional Navigation Dropdowns (For Admin Sessions) */}
          {!isPublicView && admin && (
            <nav className="hidden lg:flex items-center space-x-1.5 shrink-0">
              {/* 1. Main Operations Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => toggleDropdown('operations')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    isOperationsActive || activeDropdown === 'operations'
                      ? 'bg-white/20 text-white border-white/30 shadow-sm'
                      : 'bg-white/5 hover:bg-white/15 text-slate-200 border-white/10'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-emerald-300" />
                  <span>Main Operations</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${activeDropdown === 'operations' ? 'rotate-180' : ''}`} />
                </button>

                {activeDropdown === 'operations' && (
                  <div className="absolute left-0 mt-2 w-64 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl z-50 p-2 text-xs space-y-1 animate-fadeIn">
                    <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-800 flex items-center justify-between">
                      <span>Operations & Monitoring</span>
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                    </div>

                    <NavLink
                      to="/dashboard"
                      end
                      onClick={() => setActiveDropdown(null)}
                      className={({ isActive }) =>
                        `flex items-start space-x-2.5 p-2.5 rounded-xl transition-all ${
                          isActive ? 'bg-gov-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`
                      }
                    >
                      <LayoutDashboard className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-bold text-xs text-white">Executive Dashboard</p>
                        <p className="text-[10px] text-slate-400 font-normal">Real-time metrics, budgets & audits</p>
                      </div>
                    </NavLink>

                    <NavLink
                      to="/admin/complaints"
                      end
                      onClick={() => setActiveDropdown(null)}
                      className={({ isActive }) =>
                        `flex items-start space-x-2.5 p-2.5 rounded-xl transition-all ${
                          isActive ? 'bg-gov-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`
                      }
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-bold text-xs text-white">Citizen Complaints</p>
                        <p className="text-[10px] text-slate-400 font-normal">Live QR feedback & investigation feed</p>
                      </div>
                    </NavLink>
                  </div>
                )}
              </div>

              {/* 2. Contractor Oversight Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => toggleDropdown('contractors')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    isContractorsActive || activeDropdown === 'contractors'
                      ? 'bg-white/20 text-white border-white/30 shadow-sm'
                      : 'bg-white/5 hover:bg-white/15 text-slate-200 border-white/10'
                  }`}
                >
                  <Users className="w-4 h-4 text-emerald-300" />
                  <span>Contractor Oversight</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${activeDropdown === 'contractors' ? 'rotate-180' : ''}`} />
                </button>

                {activeDropdown === 'contractors' && (
                  <div className="absolute left-0 mt-2 w-64 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl z-50 p-2 text-xs space-y-1 animate-fadeIn">
                    <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                      Contractor Management
                    </div>

                    <NavLink
                      to="/admin/contractors/create"
                      onClick={() => setActiveDropdown(null)}
                      className={({ isActive }) =>
                        `flex items-start space-x-2.5 p-2.5 rounded-xl transition-all ${
                          isActive ? 'bg-gov-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`
                      }
                    >
                      <UserPlus className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-bold text-xs text-white">Create Contractor Profile</p>
                        <p className="text-[10px] text-slate-400 font-normal">Register firm & assign work orders</p>
                      </div>
                    </NavLink>

                    <NavLink
                      to="/admin/contractors"
                      end
                      onClick={() => setActiveDropdown(null)}
                      className={({ isActive }) =>
                        `flex items-start space-x-2.5 p-2.5 rounded-xl transition-all ${
                          isActive ? 'bg-gov-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`
                      }
                    >
                      <Users className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-bold text-xs text-white">Contractor Directory</p>
                        <p className="text-[10px] text-slate-400 font-normal">View all profiles & print QR posters</p>
                      </div>
                    </NavLink>
                  </div>
                )}
              </div>
            </nav>
          )}

          {/* Right Action Controls: Theme Switcher & Logout */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            {/* 1-Click Theme Switcher Dropdown */}
            {!isPublicView && (admin || contractor) && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => toggleDropdown('theme')}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/15 cursor-pointer shadow-sm active:scale-95"
                  title="1-Click Theme Switcher"
                >
                  <Palette className="w-4 h-4 text-emerald-300" />
                  <span className="hidden md:inline">Theme</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${activeDropdown === 'theme' ? 'rotate-180' : ''}`} />
                </button>

                {/* 1-Click Theme Selector Dropdown Menu */}
                {activeDropdown === 'theme' && (
                  <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl z-50 p-2 space-y-1 animate-fadeIn text-xs">
                    <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
                      <span className="font-extrabold text-[11px] text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-emerald-400" />
                        1-Click Theme Switch
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/20 px-1.5 py-0.5 rounded">Instant</span>
                    </div>

                    <div className="grid grid-cols-1 gap-1 pt-1">
                      {Object.values(THEME_PRESETS).map((preset) => {
                        const isSelected = config.theme === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => handleSelectTheme(preset.id)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-600 text-white border border-emerald-500/40 shadow-sm'
                                : 'text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent'
                            }`}
                          >
                            <div className="flex items-center space-x-2.5">
                              <span className="text-sm">{preset.icon || '🎨'}</span>
                              <span className="text-xs font-bold">{preset.name}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div
                                className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-inner"
                                style={{ backgroundColor: preset.previewColor }}
                              />
                              {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-1.5 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveDropdown(null);
                          setIsAdvancedThemeOpen(true);
                        }}
                        className="w-full text-center py-1.5 px-2 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Settings className="w-3 h-3 text-slate-400" />
                        <span>Advanced Customizer...</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Logout Button */}
            {(admin || contractor) && (
              <button
                onClick={logout}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-600/90 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 shrink-0 cursor-pointer"
                title="Sign out of Session"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Theme Customizer Modal */}
      {!isPublicView && (
        <ThemeCustomizerModal isOpen={isAdvancedThemeOpen} onClose={() => setIsAdvancedThemeOpen(false)} />
      )}
    </>
  );
};

export default Navbar;
