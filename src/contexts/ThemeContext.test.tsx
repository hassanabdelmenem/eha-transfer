import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider, useTheme } from './ThemeContext';

const Consumer = () => {
  const { theme, setTheme, nightShift, setNightShift } = useTheme();
  return (
    <div>
      <div data-testid="theme">{theme}</div>
      <div data-testid="nightShift">{String(nightShift)}</div>
      <button onClick={() => setTheme('dark')}>SetDark</button>
      <button onClick={() => setTheme('light')}>SetLight</button>
      <button onClick={() => setTheme('system')}>SetSystem</button>
      <button onClick={() => setNightShift(true)}>SetNightShift</button>
    </div>
  );
};

function mockMatchMedia(prefersDark: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('dark') ? prefersDark : !prefersDark,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    mockMatchMedia(false);
  });

  it('defaults to "system" with no stored preference or defaultTheme prop', () => {
    render(<ThemeProvider><Consumer /></ThemeProvider>);
    expect(screen.getByTestId('theme')).toHaveTextContent('system');
  });

  it('honors a defaultTheme prop when nothing is stored', () => {
    render(<ThemeProvider defaultTheme="dark"><Consumer /></ThemeProvider>);
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
  });

  it('prefers a stored theme over the defaultTheme prop', () => {
    localStorage.setItem('vite-ui-theme', 'light');
    render(<ThemeProvider defaultTheme="dark"><Consumer /></ThemeProvider>);
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
  });

  it('reads and writes under a custom storageKey', () => {
    localStorage.setItem('custom-key', 'dark');
    render(<ThemeProvider storageKey="custom-key"><Consumer /></ThemeProvider>);
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');

    act(() => { screen.getByText('SetLight').click(); });
    expect(localStorage.getItem('custom-key')).toBe('light');
    expect(localStorage.getItem('vite-ui-theme')).toBeNull();
  });

  it('updates state and persists to localStorage when the theme is changed', () => {
    render(<ThemeProvider><Consumer /></ThemeProvider>);

    act(() => { screen.getByText('SetDark').click(); });
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(localStorage.getItem('vite-ui-theme')).toBe('dark');

    act(() => { screen.getByText('SetLight').click(); });
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(localStorage.getItem('vite-ui-theme')).toBe('light');
  });

  it('applies the explicit theme class to the document root', () => {
    render(<ThemeProvider defaultTheme="dark"><Consumer /></ThemeProvider>);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });

  it('resolves "system" to the dark class when the OS prefers dark', () => {
    mockMatchMedia(true);
    render(<ThemeProvider defaultTheme="system"><Consumer /></ThemeProvider>);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('resolves "system" to the light class when the OS prefers light', () => {
    mockMatchMedia(false);
    render(<ThemeProvider defaultTheme="system"><Consumer /></ThemeProvider>);
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });

  it('removes the previous theme class before applying the new one', () => {
    render(<ThemeProvider defaultTheme="dark"><Consumer /></ThemeProvider>);
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    act(() => { screen.getByText('SetLight').click(); });
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });

  it('exposes a fixed, inert nightShift flag and setter', () => {
    render(<ThemeProvider><Consumer /></ThemeProvider>);
    expect(screen.getByTestId('nightShift')).toHaveTextContent('false');

    act(() => { screen.getByText('SetNightShift').click(); });
    expect(screen.getByTestId('nightShift')).toHaveTextContent('false');
  });

  it('returns the default context value outside a provider rather than crashing', () => {
    const Bare = () => {
      const { theme, setTheme, setNightShift } = useTheme();
      return (
        <div>
          <div data-testid="bare-theme">{theme}</div>
          <button onClick={() => setTheme('dark')}>NoopSetTheme</button>
          <button onClick={() => setNightShift(true)}>NoopSetNightShift</button>
        </div>
      );
    };
    render(<Bare />);
    expect(screen.getByTestId('bare-theme')).toHaveTextContent('system');

    expect(() => { act(() => { screen.getByText('NoopSetTheme').click(); }); }).not.toThrow();
    expect(() => { act(() => { screen.getByText('NoopSetNightShift').click(); }); }).not.toThrow();
  });
});
