import React from 'react';
import { useTypography } from '../../hooks/useTypography';
import { ArrowRight, Check } from 'lucide-react';

const fontFamilyOptions = [
  { key: 'Playfair Display', label: 'Playfair Display' },
  { key: 'Cormorant Garamond', label: 'Cormorant Garamond' },
  { key: 'Merriweather', label: 'Merriweather' },
  { key: 'Libre Baskerville', label: 'Libre Baskerville' },
  { key: 'Inter', label: 'Inter' },
  { key: 'Poppins', label: 'Poppins' },
  { key: 'Manrope', label: 'Manrope' },
  { key: 'Crimson Pro', label: 'Crimson Pro' },
  { key: 'Source Serif Pro', label: 'Source Serif Pro' },
  { key: 'EB Garamond', label: 'EB Garamond' },
  { key: 'JetBrains Mono', label: 'JetBrains Mono' },
];

const fontSizeOptions = [
  { key: 'xs', label: 'XS', value: '12px' },
  { key: 'small', label: 'Small', value: '14px' },
  { key: 'medium', label: 'Medium', value: '16px' },
  { key: 'large', label: 'Large', value: '18px' },
  { key: 'xl', label: 'XL', value: '20px' },
  { key: 'xxl', label: 'XXL', value: '24px' },
  { key: 'reader', label: 'Reader', value: '28px' },
];

const lineHeightOptions = [
  { key: 'compact', label: 'Compact' },
  { key: 'normal', label: 'Normal' },
  { key: 'comfortable', label: 'Comfortable' },
  { key: 'book', label: 'Book Reading' },
];

const letterSpacingOptions = [
  { key: 'tight', label: 'Tight' },
  { key: 'normal', label: 'Normal' },
  { key: 'wide', label: 'Wide' },
];

const widthOptions = [
  { key: 'narrow', label: 'Narrow' },
  { key: 'medium', label: 'Medium' },
  { key: 'wide', label: 'Wide' },
  { key: 'ultra', label: 'Ultra Wide' },
];

const typographyGroups = [
  { title: 'SERIF', values: ['Playfair Display', 'Cormorant Garamond', 'Merriweather', 'Libre Baskerville'] },
  { title: 'MODERN', values: ['Inter', 'Poppins', 'Manrope'] },
  { title: 'WRITER MODE', values: ['Crimson Pro', 'Source Serif Pro', 'EB Garamond'] },
  { title: 'MONOSPACE', values: ['JetBrains Mono'] },
];

const previewLines = [
  'THE VAULT',
  '"Words are vaults of memory.',
  'Thoughts become timeless when preserved."',
];

export const TypographySettings: React.FC = () => {
  const { preferences, updatePreferences, resetPreferences } = useTypography();

  return (
    <div className="space-y-8 rounded-3xl border border-vault-800 bg-vault-950 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.32)]">
      <div className="flex flex-col gap-3 rounded-3xl border border-vault-800/70 bg-vault-900/40 p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-vault-500">Reading & Writing Experience</p>
            <h2 className="mt-2 text-2xl font-serif font-semibold text-white">Typography Customization</h2>
            <p className="mt-1 max-w-2xl text-sm text-vault-400">
              Personalize your global font settings for a premium reading and writing flow throughout THE VAULT.
            </p>
          </div>
          <button
            onClick={resetPreferences}
            className="inline-flex items-center gap-2 rounded-2xl border border-vault-800 bg-vault-900/70 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-vault-300 transition hover:border-vault-gold hover:text-vault-gold"
          >
            <ArrowRight size={14} /> Reset Styles
          </button>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-vault-800 bg-vault-900/60 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-vault-500">Font Size</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {fontSizeOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => updatePreferences({ fontSize: option.key as any })}
                    className={`rounded-2xl border px-3 py-2 text-left text-xs transition ${
                      preferences.fontSize === option.key
                        ? 'border-vault-gold bg-vault-gold/10 text-white'
                        : 'border-vault-800 bg-vault-900 text-vault-400 hover:border-vault-700'
                    }`}
                  >
                    <p className="font-semibold">{option.label}</p>
                    <p className="text-[10px] text-vault-500">{option.value}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-vault-800 bg-vault-900/60 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-vault-500">Line Height</p>
              <div className="mt-3 grid gap-2">
                {lineHeightOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => updatePreferences({ lineHeight: option.key as any })}
                    className={`flex items-center justify-between rounded-2xl border px-3 py-3 text-sm transition ${
                      preferences.lineHeight === option.key
                        ? 'border-vault-gold bg-vault-gold/10 text-white'
                        : 'border-vault-800 bg-vault-900 text-vault-400 hover:border-vault-700'
                    }`}
                  >
                    <span>{option.label}</span>
                    {preferences.lineHeight === option.key && <Check size={16} className="text-vault-gold" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-vault-800 bg-vault-900/60 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-vault-500">Preview</p>
            <div className="mt-4 rounded-3xl border border-vault-800/60 bg-black/40 p-5 text-white shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-[0.35em] text-vault-500">Live Preview</span>
                <span className="inline-flex items-center rounded-full border border-vault-800 bg-vault-900/70 px-3 py-1 text-[10px] uppercase text-vault-400">
                  {preferences.contentWidth === 'narrow' ? 'Narrow' : preferences.contentWidth === 'medium' ? 'Medium' : preferences.contentWidth === 'wide' ? 'Wide' : 'Ultra Wide'}
                </span>
              </div>

              <div className="mt-5 rounded-3xl border border-vault-800/50 bg-vault-950/80 p-5 typography-preview">
                <h1 className="font-serif text-2xl font-semibold tracking-tight text-white">
                  {previewLines[0]}
                </h1>
                <p className="mt-4 text-sm leading-7 text-vault-200">
                  {previewLines[1]}
                </p>
                <p className="mt-1 text-sm leading-7 text-vault-300">
                  {previewLines[2]}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-3xl border border-vault-800 bg-vault-900/50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-vault-500">Body Font</p>
            <div className="mt-4 grid gap-2">
              {fontFamilyOptions.slice(0, 7).map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => updatePreferences({ bodyFont: option.key as any })}
                  className={`w-full rounded-2xl border px-3 py-3 text-left text-sm transition ${
                    preferences.bodyFont === option.key
                      ? 'border-vault-gold bg-vault-gold/10 text-white'
                      : 'border-vault-800 bg-vault-900 text-vault-400 hover:border-vault-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-vault-800 bg-vault-900/50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-vault-500">Heading Font</p>
            <div className="mt-4 grid gap-2">
              {fontFamilyOptions.slice(0, 7).map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => updatePreferences({ headingFont: option.key as any })}
                  className={`w-full rounded-2xl border px-3 py-3 text-left text-sm transition ${
                    preferences.headingFont === option.key
                      ? 'border-vault-gold bg-vault-gold/10 text-white'
                      : 'border-vault-800 bg-vault-900 text-vault-400 hover:border-vault-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-vault-800 bg-vault-900/50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-vault-500">Heading Overrides</p>
            <div className="mt-4 space-y-2">
              {['h1Font', 'h2Font', 'h3Font', 'titleFont'].map((setting) => (
                <div key={setting} className="space-y-2 rounded-2xl border border-vault-800 bg-vault-950/60 p-3">
                  <label htmlFor={`${setting}-select`} className="text-[11px] font-semibold uppercase tracking-[0.35em] text-vault-500">{setting === 'h1Font' ? 'H1 Font' : setting === 'h2Font' ? 'H2 Font' : setting === 'h3Font' ? 'H3 Font' : 'Title Font'}</label>
                  <select
                    id={`${setting}-select`}
                    value={preferences[setting as keyof typeof preferences] as string}
                    onChange={(e) => updatePreferences({ [setting]: e.target.value as any })}
                    className="w-full rounded-xl border border-vault-800 bg-vault-900/40 px-3 py-2.5 text-sm text-zinc-200 outline-none"
                  >
                    {fontFamilyOptions.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-vault-800 bg-vault-900/50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-vault-500">Letter Spacing</p>
            <div className="mt-4 grid gap-2">
              {letterSpacingOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => updatePreferences({ letterSpacing: option.key as any })}
                  className={`w-full rounded-2xl border px-3 py-3 text-left text-sm transition ${
                    preferences.letterSpacing === option.key
                      ? 'border-vault-gold bg-vault-gold/10 text-white'
                      : 'border-vault-800 bg-vault-900 text-vault-400 hover:border-vault-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-vault-800 bg-vault-900/50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-vault-500">Reading Width</p>
            <div className="mt-4 grid gap-2">
              {widthOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => updatePreferences({ contentWidth: option.key as any })}
                  className={`w-full rounded-2xl border px-3 py-3 text-left text-sm transition ${
                    preferences.contentWidth === option.key
                      ? 'border-vault-gold bg-vault-gold/10 text-white'
                      : 'border-vault-800 bg-vault-900 text-vault-400 hover:border-vault-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-vault-800 bg-vault-900/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-vault-500">Focus Mode</p>
                <p className="mt-1 text-xs text-vault-400">Concentrated writing experience. Hides sidebar and simplifies layout.</p>
              </div>
              <button
                onClick={() => updatePreferences({ focusMode: !preferences.focusMode })}
                aria-label="Toggle focus mode"
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out ${
                  preferences.focusMode ? 'bg-vault-gold' : 'bg-vault-800'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-black shadow-sm transition-transform duration-200 ease-in-out ${
                    preferences.focusMode ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TypographySettings;
