import React, { createContext, useEffect, useMemo, useState } from 'react';

export type FontSizeKey = 'xs' | 'small' | 'medium' | 'large' | 'xl' | 'xxl' | 'reader';
export type LineHeightKey = 'compact' | 'normal' | 'comfortable' | 'book';
export type LetterSpacingKey = 'tight' | 'normal' | 'wide';
export type ReadingWidthKey = 'narrow' | 'medium' | 'wide' | 'ultra';
export type FontFamilyKey =
  | 'Playfair Display'
  | 'Cormorant Garamond'
  | 'Merriweather'
  | 'Libre Baskerville'
  | 'Inter'
  | 'Poppins'
  | 'Manrope'
  | 'Crimson Pro'
  | 'Source Serif Pro'
  | 'EB Garamond'
  | 'JetBrains Mono';

export interface TypographyPreferences {
  fontSize: FontSizeKey;
  bodyFont: FontFamilyKey;
  headingFont: FontFamilyKey;
  h1Font: FontFamilyKey;
  h2Font: FontFamilyKey;
  h3Font: FontFamilyKey;
  titleFont: FontFamilyKey;
  lineHeight: LineHeightKey;
  letterSpacing: LetterSpacingKey;
  contentWidth: ReadingWidthKey;
  focusMode: boolean;
}

export interface TypographyContextType {
  preferences: TypographyPreferences;
  updatePreferences: (updates: Partial<TypographyPreferences>) => void;
  resetPreferences: () => void;
}

const STORAGE_KEY = 'vault_typography_preferences';

const defaultPreferences: TypographyPreferences = {
  fontSize: 'medium',
  bodyFont: 'Inter',
  headingFont: 'Playfair Display',
  h1Font: 'Playfair Display',
  h2Font: 'Cormorant Garamond',
  h3Font: 'Merriweather',
  titleFont: 'Playfair Display',
  lineHeight: 'comfortable',
  letterSpacing: 'normal',
  contentWidth: 'medium',
  focusMode: false,
};

const fontSizeMap: Record<FontSizeKey, number> = {
  xs: 12,
  small: 14,
  medium: 16,
  large: 18,
  xl: 20,
  xxl: 24,
  reader: 28,
};

const lineHeightMap: Record<LineHeightKey, string> = {
  compact: '1.45',
  normal: '1.6',
  comfortable: '1.75',
  book: '1.95',
};

const letterSpacingMap: Record<LetterSpacingKey, string> = {
  tight: '-0.03em',
  normal: '0.01em',
  wide: '0.08em',
};

const contentWidthMap: Record<ReadingWidthKey, string> = {
  narrow: '680px',
  medium: '780px',
  wide: '980px',
  ultra: '1120px',
};

const fontFamilyMap: Record<FontFamilyKey, string> = {
  'Playfair Display': '"Playfair Display", Georgia, serif',
  'Cormorant Garamond': '"Cormorant Garamond", Georgia, serif',
  'Merriweather': '"Merriweather", Georgia, serif',
  'Libre Baskerville': '"Libre Baskerville", Georgia, serif',
  Inter: 'Inter, system-ui, sans-serif',
  Poppins: 'Poppins, system-ui, sans-serif',
  Manrope: 'Manrope, system-ui, sans-serif',
  'Crimson Pro': '"Crimson Pro", Georgia, serif',
  'Source Serif Pro': '"Source Serif Pro", Georgia, serif',
  'EB Garamond': '"EB Garamond", Georgia, serif',
  'JetBrains Mono': '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
};

const applyTypographyPreferences = (preferences: TypographyPreferences) => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.style.setProperty('--vault-font-size', `${fontSizeMap[preferences.fontSize]}px`);
  root.style.setProperty('--vault-body-font', fontFamilyMap[preferences.bodyFont]);
  root.style.setProperty('--vault-heading-font', fontFamilyMap[preferences.headingFont]);
  root.style.setProperty('--vault-h1-font', fontFamilyMap[preferences.h1Font]);
  root.style.setProperty('--vault-h2-font', fontFamilyMap[preferences.h2Font]);
  root.style.setProperty('--vault-h3-font', fontFamilyMap[preferences.h3Font]);
  root.style.setProperty('--vault-title-font', fontFamilyMap[preferences.titleFont]);
  root.style.setProperty('--vault-mono-font', fontFamilyMap['JetBrains Mono']);
  root.style.setProperty('--vault-line-height', lineHeightMap[preferences.lineHeight]);
  root.style.setProperty('--vault-letter-spacing', letterSpacingMap[preferences.letterSpacing]);
  root.style.setProperty('--vault-content-width', contentWidthMap[preferences.contentWidth]);

  if (preferences.focusMode) {
    root.classList.add('vault-focus-mode');
  } else {
    root.classList.remove('vault-focus-mode');
  }
};

const loadPreferences = (): TypographyPreferences => {
  if (typeof window === 'undefined') return defaultPreferences;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultPreferences;
    const parsed = JSON.parse(stored) as Partial<TypographyPreferences>;
    return { ...defaultPreferences, ...parsed };
  } catch {
    return defaultPreferences;
  }
};

const TypographyContext = createContext<TypographyContextType | undefined>(undefined);

export const TypographyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<TypographyPreferences>(loadPreferences);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    applyTypographyPreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    applyTypographyPreferences(preferences);
  }, []);

  const updatePreferences = (updates: Partial<TypographyPreferences>) => {
    setPreferences((current) => ({ ...current, ...updates }));
  };

  const resetPreferences = () => {
    setPreferences(defaultPreferences);
  };

  const value = useMemo(
    () => ({ preferences, updatePreferences, resetPreferences }),
    [preferences]
  );

  return <TypographyContext.Provider value={value}>{children}</TypographyContext.Provider>;
};

export default TypographyContext;
