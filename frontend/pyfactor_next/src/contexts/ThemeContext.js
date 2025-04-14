'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getThemePreference, saveThemePreference } from '@/utils/userPreferences';
import { getCacheValue, setCacheValue } from '@/utils/appCache';

// Create the context
const ThemeContext = createContext(null);

// Default theme values
const LIGHT_THEME = 'light';
const DARK_THEME = 'dark';
const SYSTEM_THEME = 'system';

// Theme provider component
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(LIGHT_THEME);
  const [systemTheme, setSystemTheme] = useState(LIGHT_THEME);

  // Function to get user's preferred color scheme
  const getSystemTheme = () => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK_THEME : LIGHT_THEME;
    }
    return LIGHT_THEME;
  };

  // Initialize theme on component mount
  useEffect(() => {
    // First check if theme is in AppCache for immediate display
    const cachedTheme = getCacheValue('theme');
    const currentSystemTheme = getSystemTheme();
    setSystemTheme(currentSystemTheme);
    
    if (cachedTheme) {
      setTheme(cachedTheme === SYSTEM_THEME ? currentSystemTheme : cachedTheme);
    } else {
      // If not in cache, load from Cognito
      const initTheme = async () => {
        try {
          const savedTheme = await getThemePreference(SYSTEM_THEME);
          setTheme(savedTheme === SYSTEM_THEME ? currentSystemTheme : savedTheme);
        } catch (error) {
          console.error('Failed to get theme preference from Cognito:', error);
          setTheme(currentSystemTheme); // Fall back to system preference
        }
      };
      
      initTheme();
    }
    
    // Set up listener for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      const newSystemTheme = e.matches ? DARK_THEME : LIGHT_THEME;
      setSystemTheme(newSystemTheme);
      
      // Update current theme if using system preference
      if (theme === SYSTEM_THEME) {
        setTheme(newSystemTheme);
      }
    };
    
    // Add listener for theme changes
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }
    
    // Cleanup function to remove listener
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        // Fallback for older browsers
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  // Function to update theme
  const updateTheme = (newTheme) => {
    setTheme(newTheme);
    
    // If using system preference, use system theme
    const effectiveTheme = newTheme === SYSTEM_THEME ? systemTheme : newTheme;
    
    // Apply theme to document
    if (effectiveTheme === DARK_THEME) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Store theme preference in Cognito and AppCache
    saveThemePreference(newTheme).catch(error => {
      console.error('Failed to save theme preference to Cognito:', error);
    });
    
    // Also update AppCache for faster loading next time
    setCacheValue('theme', newTheme);
  };

  // Apply current theme to document
  useEffect(() => {
    const effectiveTheme = theme === SYSTEM_THEME ? systemTheme : theme;
    
    if (effectiveTheme === DARK_THEME) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme, systemTheme]);

  // Provide theme context value
  const value = {
    theme,
    systemTheme,
    updateTheme,
    LIGHT_THEME,
    DARK_THEME,
    SYSTEM_THEME
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// Custom hook to use the theme context
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext; 