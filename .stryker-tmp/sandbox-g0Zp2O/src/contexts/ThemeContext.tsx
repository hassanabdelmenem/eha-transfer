// @ts-nocheck
import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  nightShift: boolean;
  setNightShift: (enabled: boolean) => void;
}

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
  nightShift: false,
  setNightShift: () => null,
};

const ThemeContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'vite-ui-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );
  const [nightShift, setNightShift] = useState<boolean>(
    () => localStorage.getItem('app-night-shift') === 'true'
  );

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Handle night shift
    if (nightShift) {
      root.classList.add('night-shift-mode');
    } else {
      root.classList.remove('night-shift-mode');
    }

    // Handle theme
    root.classList.remove('light', 'dark');
    if (nightShift) {
      root.classList.add('dark'); // Force dark mode for night shift
    } else if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme, nightShift]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
    nightShift,
    setNightShift: (enabled: boolean) => {
      localStorage.setItem('app-night-shift', enabled.toString());
      setNightShift(enabled);
    }
  };

  return (
    <ThemeContext.Provider {...props} value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};
