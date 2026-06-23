import React, { useState } from 'react';
import { useVault } from '../context/VaultContext';
import TypographySettings from '../components/settings/TypographySettings';
import { Save, Sparkles, Database, RefreshCw, Trash2, Check } from 'lucide-react';
import { WritingType } from '../types';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, writings } = useVault();
  
  // Local settings mirroring context
  const [defaultContentType, setDefaultContentType] = useState<WritingType>(settings.defaultContentType);
  const [autoSaveInterval, setAutoSaveInterval] = useState(settings.autoSaveInterval);
  const [enableE2E, setEnableE2E] = useState(settings.enableE2E);
  const [theme, setTheme] = useState(settings.theme);
  const [fontFamily, setFontFamily] = useState(settings.fontFamily);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleSave = () => {
    updateSettings({
      defaultContentType,
      autoSaveInterval,
      enableE2E,
      theme,
      fontFamily,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleExportData = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(writings, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "vault_backup.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    }, 1200);
  };

  const handleClearVault = () => {
    if (confirm('CAUTION: Are you absolutely sure you want to clear your entire vault? This will delete all writings, categories, and tags permanently.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="flex-1 space-y-8 px-4 py-8 md:px-8 max-w-4xl mx-auto text-left">
      {/* Head */}
      <div className="flex items-center justify-between border-b border-vault-800 pb-5">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight md:text-3xl text-zinc-100">
            Settings
          </h1>
          <p className="text-xs text-vault-500 font-sans tracking-wide">
            Configure your writer workspace environment, styling choices, and security keys.
          </p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-vault-gold/90 to-vault-gold border border-vault-gold/50 px-5 py-2.5 text-xs font-bold tracking-wider text-vault-950 uppercase shadow-lg transition hover:brightness-110"
        >
          {saveSuccess ? <Check size={16} /> : <Save size={16} />}
          <span>{saveSuccess ? 'Saved' : 'Save Changes'}</span>
        </button>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {/* Settings panels (Left/Middle 2 Columns) */}
        <div className="space-y-6 md:col-span-2">
          {/* Editor Preferences */}
          <div className="rounded-2xl border border-vault-800 bg-vault-950 p-6 space-y-5 premium-border">
            <h3 className="font-serif text-sm font-bold text-zinc-300">Editor Settings</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Default writing type */}
              <div className="space-y-1.5 text-left">
                <label htmlFor="default-content-type" className="text-[9px] font-bold uppercase tracking-wider text-vault-500">Default Writing Format</label>
                <select
                  id="default-content-type"
                  value={defaultContentType}
                  onChange={(e) => setDefaultContentType(e.target.value as WritingType)}
                  className="w-full rounded-xl border border-vault-800 bg-vault-900/40 px-3.5 py-2.5 text-xs text-zinc-200 outline-none"
                >
                  <option value="NOTE">Note</option>
                  <option value="SHAYARI">Shayari</option>
                  <option value="POEM">Poem</option>
                  <option value="QUOTE">Quote</option>
                  <option value="THOUGHT">Thought</option>
                  <option value="JOURNAL">Journal</option>
                </select>
              </div>

              {/* Auto save */}
              <div className="space-y-1.5 text-left">
                <label htmlFor="auto-save-interval" className="text-[9px] font-bold uppercase tracking-wider text-vault-500">Auto-save Interval</label>
                <select
                  id="auto-save-interval"
                  value={autoSaveInterval}
                  onChange={(e) => setAutoSaveInterval(Number(e.target.value))}
                  className="w-full rounded-xl border border-vault-800 bg-vault-900/40 px-3.5 py-2.5 text-xs text-zinc-200 outline-none"
                >
                  <option value={2}>Every 2 seconds</option>
                  <option value={5}>Every 5 seconds</option>
                  <option value={10}>Every 10 seconds</option>
                </select>
              </div>
            </div>
          </div>

          {/* Theme Visuals settings */}
          <div className="rounded-2xl border border-vault-800 bg-vault-950 p-6 space-y-5 premium-border">
            <h3 className="font-serif text-sm font-bold text-zinc-300">Aesthetics & Typography</h3>
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Theme option */}
              <div className="space-y-2 text-left">
                <label className="text-[9px] font-bold uppercase tracking-wider text-vault-500">Aesthetic Theme</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'dark', label: 'Obsidian' },
                    { key: 'midnight', label: 'Midnight' },
                    { key: 'classic', label: 'Parchment' },
                  ].map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setTheme(t.key as any)}
                      className={`rounded-xl border py-2 text-center text-[10px] font-medium transition ${
                        theme === t.key
                          ? 'border-vault-gold bg-vault-900/40 text-zinc-200'
                          : 'border-vault-800 text-vault-500 hover:text-vault-400'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fonts option */}
              <div className="space-y-2 text-left">
                <label className="text-[9px] font-bold uppercase tracking-wider text-vault-500">Editor Font Family</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'serif', label: 'Classical Serif' },
                    { key: 'sans', label: 'Modern Sans' },
                  ].map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setFontFamily(f.key as any)}
                      className={`rounded-xl border py-2 text-center text-[10px] font-medium transition ${
                        fontFamily === f.key
                          ? 'border-vault-gold bg-vault-900/40 text-zinc-200'
                          : 'border-vault-800 text-vault-500 hover:text-vault-400'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <TypographySettings />
        </div>

        {/* Security and Backup (Right Column) */}
        <div className="space-y-6">
          {/* Security details E2E */}
          <div className="rounded-2xl border border-vault-800 bg-vault-950 p-5 space-y-4 premium-border">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-vault-gold" />
              <h3 className="font-serif text-sm font-bold text-zinc-300">Privacy Encryption</h3>
            </div>
            <p className="text-xs text-vault-500 leading-relaxed">
              Enable client-side Zero-Knowledge encryption. When active, all entry contents are encrypted using AES-256-GCM before syncing to disk.
            </p>
            <div className="flex items-center justify-between border-t border-vault-900 pt-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-vault-400">AES-256-GCM status</span>
              <button
                onClick={() => setEnableE2E(!enableE2E)}
                aria-label="Toggle AES-256-GCM encryption"
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${
                  enableE2E ? 'bg-vault-emerald' : 'bg-vault-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white transition duration-200 ease-in-out mt-0.5 ${
                    enableE2E ? 'translate-x-4.5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Backup data controls */}
          <div className="rounded-2xl border border-vault-800 bg-vault-950 p-5 space-y-4 premium-border">
            <div className="flex items-center gap-2">
              <Database size={16} className="text-vault-gold" />
              <h3 className="font-serif text-sm font-bold text-zinc-300">Backup & Storage</h3>
            </div>
            <p className="text-xs text-vault-500 leading-relaxed">
              Export your entire library, folders, and tags as a standardized JSON data backup, or erase database cache.
            </p>
            
            <div className="space-y-2 pt-2">
              <button
                onClick={handleExportData}
                disabled={isExporting}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-vault-800 bg-vault-900/30 py-2.5 text-xs font-semibold text-vault-400 hover:text-zinc-200 transition"
              >
                {isExporting ? <RefreshCw size={12} className="animate-spin" /> : <Database size={12} />}
                <span>Backup Library (JSON)</span>
              </button>

              <button
                onClick={handleClearVault}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-vault-rose/20 bg-vault-rose/5 py-2.5 text-xs font-semibold text-vault-rose hover:bg-vault-rose/10 transition"
              >
                <Trash2 size={12} />
                <span>Format Vault (Erase All)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
