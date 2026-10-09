import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, UserPlus, Users, ShieldCheck, ChevronRight, AlertTriangle, Menu, X, Palette, Sparkles, Building, Settings } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import ThemeCustomizerModal from './ThemeCustomizerModal';

const AdminSidebar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const { config, currentPreset } = useTheme();

  // Sidebar dynamic classes based on sidebarStyle setting
  let sidebarBgClass = 'bg-slate-900 text-slate-300 border-r border-slate-800';
  let activeNavClass = 'bg-gov-600 text-white shadow-md shadow-gov-600/30';
  let inactiveNavClass = 'text-slate-400 hover:text-white hover:bg-slate-800/80';

  if (config.sidebarStyle === 'light') {
    sidebarBgClass = 'bg-white text-slate-800 border-r border-slate-200 shadow-sm';
    activeNavClass = 'bg-gov-700 text-white shadow-md';
    inactiveNavClass = 'text-slate-600 hover:text-slate-900 hover:bg-slate-100';
  } else if (config.sidebarStyle === 'glass') {
    sidebarBgClass = 'bg-slate-900 text-slate-200 border-r border-slate-800';
    activeNavClass = 'bg-gradient-to-r from-gov-700 to-gov-600 text-white shadow-md';
    inactiveNavClass = 'text-slate-300 hover:text-white hover:bg-white/10';
  }

  const menuContent = (
    <div className="flex flex-col justify-between h-full space-y-6">
      <div className="space-y-6">
        <div>
          <p className="px-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center justify-between">
            <span>Main Operations</span>
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
          </p>
          <nav className="space-y-1.5">
            <NavLink
              to="/dashboard"
              end
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                  isActive ? activeNavClass : inactiveNavClass
                }`
              }
            >
              <div className="flex items-center space-x-2.5">
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>Executive Dashboard</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </NavLink>

            <NavLink
              to="/admin/complaints"
              end
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                  isActive ? activeNavClass : inactiveNavClass
                }`
              }
            >
              <div className="flex items-center space-x-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Citizen Complaints</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </NavLink>
          </nav>
        </div>

        <div>
          <p className="px-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2.5">
            Contractor Oversight
          </p>
          <nav className="space-y-1.5">
            <NavLink
              to="/admin/contractors/create"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                  isActive ? activeNavClass : inactiveNavClass
                }`
              }
            >
              <div className="flex items-center space-x-2.5">
                <UserPlus className="w-4 h-4 shrink-0" />
                <span>Create Contractor Profile</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </NavLink>

            <NavLink
              to="/admin/contractors"
              end
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                  isActive ? activeNavClass : inactiveNavClass
                }`
              }
            >
              <div className="flex items-center space-x-2.5">
                <Users className="w-4 h-4 shrink-0" />
                <span>Contractor Directory</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </NavLink>
          </nav>
        </div>

        <div>
          <p className="px-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2.5">
            System & Personalization
          </p>
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              setIsThemeOpen(true);
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20 cursor-pointer"
          >
            <div className="flex items-center space-x-2.5">
              <Palette className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Theme Customization</span>
            </div>
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          </button>
        </div>
      </div>

      {/* Footer Security Badge */}
      <div className="p-3 bg-slate-800/80 dark:bg-slate-900/90 rounded-xl border border-slate-700/60 text-[11px] text-slate-300 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <div className="min-w-0">
          <p className="font-extrabold text-white text-[11px]">Admin Clearance</p>
          <p className="text-[10px] text-slate-400 truncate">Anti-Corruption Officer</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Navigation Header */}
      <div className="lg:hidden bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-white w-full z-20">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex items-center space-x-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
        >
          <Menu className="w-4 h-4 text-emerald-400" />
          <span>Navigation Menu</span>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsThemeOpen(true)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg text-xs font-bold border border-slate-700"
            title="Theme Settings"
          >
            <Palette className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
            Admin Portal
          </span>
        </div>
      </div>

      {/* Mobile Slide-Over Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          ></div>
          <div className="relative flex-1 max-w-xs w-full bg-slate-900 p-5 flex flex-col justify-between z-10 shadow-2xl border-r border-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <span className="font-extrabold text-sm text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Admin Operations
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {menuContent}
          </div>
        </div>
      )}

      {/* Desktop Persistent Sidebar */}
      <aside className={`hidden lg:flex w-64 flex-shrink-0 min-h-[calc(100vh-4rem)] flex-col justify-between py-6 px-4 ${sidebarBgClass} transition-colors duration-300`}>
        {menuContent}
      </aside>

      {/* Theme Customizer Modal Trigger */}
      <ThemeCustomizerModal isOpen={isThemeOpen} onClose={() => setIsThemeOpen(false)} />
    </>
  );
};

export default AdminSidebar;
