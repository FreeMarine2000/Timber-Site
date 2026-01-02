'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { CartProvider } from '@/Context/CartContext';

const ThemeContext = createContext();

export function Providers({ children }) {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // 1. Check LocalStorage or System Preference
    const isDark = localStorage.getItem('theme') === 'dark' || 
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    // 2. Set Initial Class (Instant)
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // 3. Sync React State (Deferred to avoid hydration mismatch)
    setTimeout(() => setDarkMode(isDark), 0);
  }, []);

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
    
    const root = window.document.documentElement;
    if (newMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  return (
    <ThemeContext.Provider value={{ darkMode, toggleTheme }}>
      <CartProvider>
        {children}
      </CartProvider>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);