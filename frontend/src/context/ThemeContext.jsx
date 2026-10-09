import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const THEME_PRESETS = {
  light: {
    name: 'Light Theme',
    id: 'light',
    icon: '☀️',
    bgMain: 'bg-slate-50',
    bgCard: 'bg-white',
    textMain: 'text-slate-900',
    textMuted: 'text-slate-500',
    border: 'border-slate-200',
    headerBg: 'bg-slate-900 text-white',
    accent: 'bg-gov-700 text-white',
    badge: 'bg-gov-100 text-gov-800 border-gov-200',
    previewColor: '#0f172a'
  },
  dark: {
    name: 'Dark Theme',
    id: 'dark',
    icon: '🌙',
    bgMain: 'bg-slate-950',
    bgCard: 'bg-slate-900',
    textMain: 'text-slate-100',
    textMuted: 'text-slate-400',
    border: 'border-slate-800',
    headerBg: 'bg-slate-900 text-white border-b border-slate-800',
    accent: 'bg-blue-600 text-white',
    badge: 'bg-blue-950 text-blue-300 border-blue-800',
    previewColor: '#020617'
  },
  'gov-blue': {
    name: 'Government Blue',
    id: 'gov-blue',
    icon: '🏛️',
    bgMain: 'bg-blue-50/50',
    bgCard: 'bg-white',
    textMain: 'text-slate-900',
    textMuted: 'text-slate-600',
    border: 'border-blue-100',
    headerBg: 'bg-gradient-to-r from-gov-950 via-gov-900 to-gov-800 text-white',
    accent: 'bg-gov-700 hover:bg-gov-800 text-white',
    badge: 'bg-blue-100 text-gov-900 border-blue-200',
    previewColor: '#004aa9'
  },
  'gov-green': {
    name: 'Professional Green',
    id: 'gov-green',
    icon: '🌲',
    bgMain: 'bg-emerald-50/40',
    bgCard: 'bg-white',
    textMain: 'text-slate-900',
    textMuted: 'text-slate-600',
    border: 'border-emerald-100',
    headerBg: 'bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 text-white',
    accent: 'bg-emerald-700 hover:bg-emerald-800 text-white',
    badge: 'bg-emerald-100 text-emerald-900 border-emerald-200',
    previewColor: '#047857'
  },
  'modern-purple': {
    name: 'Modern Purple',
    id: 'modern-purple',
    icon: '🔮',
    bgMain: 'bg-purple-50/30',
    bgCard: 'bg-white',
    textMain: 'text-slate-900',
    textMuted: 'text-slate-600',
    border: 'border-purple-100',
    headerBg: 'bg-gradient-to-r from-slate-950 via-purple-950 to-slate-900 text-white',
    accent: 'bg-purple-700 hover:bg-purple-800 text-white',
    badge: 'bg-purple-100 text-purple-900 border-purple-200',
    previewColor: '#6b21a8'
  },
  'high-contrast': {
    name: 'High Contrast',
    id: 'high-contrast',
    icon: '⚡',
    bgMain: 'bg-black',
    bgCard: 'bg-slate-900',
    textMain: 'text-yellow-300',
    textMuted: 'text-slate-300',
    border: 'border-yellow-400',
    headerBg: 'bg-black text-yellow-300 border-b-2 border-yellow-400',
    accent: 'bg-yellow-400 text-black font-extrabold',
    badge: 'bg-yellow-400 text-black font-bold border-black',
    previewColor: '#facc15'
  }
};

const DEFAULT_CONFIG = {
  theme: 'gov-blue',
  primaryColor: 'navy',
  secondaryColor: 'blue',
  sidebarStyle: 'dark', // 'dark', 'light', 'glass'
  cardStyle: 'modern', // 'modern', 'bordered', 'glass'
  borderRadius: 'lg', // 'sm', 'md', 'lg', 'xl'
  layoutDensity: 'comfortable' // 'compact', 'comfortable'
};

export const ThemeProvider = ({ children }) => {
  const [config, setConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('gov_portal_theme_config');
      return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
    } catch (e) {
      return DEFAULT_CONFIG;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('gov_portal_theme_config', JSON.stringify(config));
    } catch (e) {
      console.warn("Could not save theme config to localStorage", e);
    }
    // Set data attribute on body/html
    document.documentElement.setAttribute('data-theme', config.theme);
  }, [config]);

  const updateConfig = (newSettings) => {
    setConfig(prev => ({ ...prev, ...newSettings }));
  };

  const resetTheme = () => {
    setConfig(DEFAULT_CONFIG);
  };

  const currentPreset = THEME_PRESETS[config.theme] || THEME_PRESETS['gov-blue'];

  return (
    <ThemeContext.Provider value={{ config, updateConfig, resetTheme, currentPreset, THEME_PRESETS }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
