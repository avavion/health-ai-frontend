'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemeSetting = 'light' | 'dark' | 'system';
export interface ThemeLabels {
  label: string;
  light: string;
  dark: string;
  system: string;
}

const STORAGE_KEY = 'healthai-theme';

interface ThemeContextValue {
  setting: ThemeSetting;
  setSetting: (value: ThemeSetting) => void;
  labels: ThemeLabels;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function apply(setting: ThemeSetting) {
  const dark =
    setting === 'dark' ||
    (setting === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

export function ThemeProvider({ children, labels }: { children: ReactNode; labels: ThemeLabels }) {
  const [setting, setState] = useState<ThemeSetting>('system');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeSetting | null;
    const initial = stored ?? 'system';
    setState(initial);
    apply(initial);
  }, []);

  useEffect(() => {
    if (setting !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => apply('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [setting]);

  const setSetting = useCallback((value: ThemeSetting) => {
    setState(value);
    window.localStorage.setItem(STORAGE_KEY, value);
    apply(value);
  }, []);

  return (
    <ThemeContext.Provider value={{ setting, setSetting, labels }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme вызван вне ThemeProvider');
  return ctx;
}
