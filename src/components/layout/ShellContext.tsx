import { createContext, useContext } from 'react';

/** What the app shell lends to screens that draw their own header. */
export interface ShellContextValue {
  /** Opens the navigation drawer (phones). */
  openMenu: () => void;
  isDesktop: boolean;
}

export const ShellContext = createContext<ShellContextValue>({ openMenu: () => {}, isDesktop: false });

export const useShell = () => useContext(ShellContext);
