'use client';

import { useState, useEffect } from 'react';
import { getCacheValue, setCacheValue } from '@/utils/appCache';

export default function ThemeWrapper({ children }) {
  const [theme, setTheme] = useState('light');
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    
    // Initialize theme from AppCache or system preference
    const savedTheme = getCacheValue('color-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else if (prefersDark) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }
  }, []);
  
  useEffect(() => {
    if (mounted) {
      setCacheValue('color-theme', theme);
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }, [theme, mounted]);
  
  // Create a context value with the current theme and setter
  const themeContext = {
    theme,
    setTheme,
    toggleTheme: () => setTheme(prev => prev === 'dark' ? 'light' : 'dark'),
    isDark: theme === 'dark'
  };
  
  if (!mounted) {
    // Avoid rendering with incorrect theme
    return null;
  }
  
  // Return children with theme context
  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        {children}
      </div>
    </div>
  );
}
