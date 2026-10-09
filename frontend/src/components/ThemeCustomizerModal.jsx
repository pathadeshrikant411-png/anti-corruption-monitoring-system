import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Palette, X, Check, RefreshCw, Layout, Layers, Sparkles } from 'lucide-react';

const ThemeCustomizerModal = ({ isOpen, onClose }) => {
  const { config, updateConfig, resetTheme, THEME_PRESETS } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 print:hidden">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-gov-950 to-slate-900 text-white p-4 px-5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-gov-600/40 rounded-xl border border-gov-500/30 text-emerald-400">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                System Theme & Layout Customizer
              </h3>
              <p className="text-[11px] text-slate-300">
                1-Click Theme Switching & Government Portal Personalization
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-6 text-xs flex-1">
          {/* Preset Theme Selection (Instant 1-Click) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-gov-600" />
                1-Click Theme Preset Selection
              </label>
              <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                Instant Apply
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {Object.values(THEME_PRESETS).map((preset) => {
                const isSelected = config.theme === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => updateConfig({ theme: preset.id })}
                    className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between space-y-2 cursor-pointer ${
                      isSelected
                        ? 'border-emerald-600 ring-2 ring-emerald-500/30 bg-emerald-50/50 dark:bg-slate-800 font-extrabold shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <span className="text-sm shrink-0">{preset.icon || '🎨'}</span>
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">{preset.name}</span>
                      </div>
                      {isSelected && (
                        <div className="w-4 h-4 bg-emerald-600 text-white rounded-full flex items-center justify-center shrink-0 ml-1">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    {/* Color Swatch Preview Bar */}
                    <div className="h-3.5 w-full rounded-md flex overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner">
                      <div className="w-1/3 h-full" style={{ backgroundColor: preset.previewColor }}></div>
                      <div className="w-1/3 h-full bg-slate-100 dark:bg-slate-800"></div>
                      <div className="w-1/3 h-full bg-emerald-600"></div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sidebar Style Options */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <label className="font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px] flex items-center gap-2">
              <Layout className="w-4 h-4 text-gov-600" />
              Sidebar Appearance
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'dark', label: 'Dark Sleek', desc: 'Midnight navy background' },
                { id: 'light', label: 'Light Clean', desc: 'Minimal white sidebar' },
                { id: 'glass', label: 'Glassmorphism', desc: 'Translucent blur effect' }
              ].map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => updateConfig({ sidebarStyle: style.id })}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    config.sidebarStyle === style.id
                      ? 'border-gov-600 ring-2 ring-gov-500/20 bg-gov-50 dark:bg-slate-800 text-gov-900 dark:text-white font-bold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <p className="text-xs font-bold">{style.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">{style.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Card Style Options */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <label className="font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px] flex items-center gap-2">
              <Layers className="w-4 h-4 text-gov-600" />
              Dashboard Card Style
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'modern', label: 'Elevated Soft', desc: 'Soft shadow & gradient' },
                { id: 'bordered', label: 'Flat Bordered', desc: 'Clean crisp outline' },
                { id: 'glass', label: 'Dual-Tone Header', desc: 'Colored accent bar' }
              ].map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => updateConfig({ cardStyle: card.id })}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    config.cardStyle === card.id
                      ? 'border-gov-600 ring-2 ring-gov-500/20 bg-gov-50 dark:bg-slate-800 text-gov-900 dark:text-white font-bold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <p className="text-xs font-bold">{card.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">{card.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Border Radius & Layout Density */}
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[10px] block mb-2">
                Border Radius
              </label>
              <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 p-1 bg-slate-50 dark:bg-slate-900">
                {[
                  { id: 'sm', label: '4px' },
                  { id: 'md', label: '8px' },
                  { id: 'lg', label: '12px' },
                  { id: 'xl', label: '16px' }
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => updateConfig({ borderRadius: r.id })}
                    className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      config.borderRadius === r.id
                        ? 'bg-gov-700 text-white shadow'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[10px] block mb-2">
                Layout Density
              </label>
              <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 p-1 bg-slate-50 dark:bg-slate-900">
                {[
                  { id: 'comfortable', label: 'Comfortable' },
                  { id: 'compact', label: 'Compact' }
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => updateConfig({ layoutDensity: d.id })}
                    className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      config.layoutDensity === d.id
                        ? 'bg-gov-700 text-white shadow'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 dark:bg-slate-900 p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={resetTheme}
            className="px-3.5 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset Default
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gov-700 hover:bg-gov-800 text-white font-bold text-xs rounded-xl shadow transition-colors cursor-pointer"
          >
            Done / Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThemeCustomizerModal;
