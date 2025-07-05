'use client';


import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getThemePreference, saveThemePreference } from '@/utils/userPreferences';
import { getCacheValue, setCacheValue } from @/utils/appCache';

export default function ToggleColorMode() {
  const { t } = useTranslation();
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  useEffect(() => {
    // First check AppCache for faster initial render
    const cachedTheme = getCacheValue('theme');
    if (cachedTheme) {
      const isDark = cachedTheme === 'dark';
      setIsDarkMode(isDark);
      document.documentElement.classList.toggle('dark', isDark);
    } else {
      // Fall back to system preference while loading from Cognito
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(systemPrefersDark);
      document.documentElement.classList.toggle('dark', systemPrefersDark);
    }
    
    // Then load from Cognito
    const loadTheme = async () => {
      try {
        const savedTheme = await getThemePreference('system');
        
        // If system preference, use matching theme
        if (savedTheme === 'system') {
          const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          setIsDarkMode(systemPrefersDark);
          document.documentElement.classList.toggle('dark', systemPrefersDark);
        } else {
          const isDark = savedTheme === 'dark';
          setIsDarkMode(isDark);
          document.documentElement.classList.toggle('dark', isDark);
        }
      } catch (error) {
        console.error('Failed to load theme preference:', error);
      }
    };
    
    loadTheme();
  }, []);
  
  const toggleColorMode = () => {
    setIsDarkMode(prev => {
      const newMode = !prev;
      const newTheme = newMode ? 'dark' : 'light';
      
      // Save preference to Cognito
      saveThemePreference(newTheme).catch(error => {
        console.error('Failed to save theme preference:', error);
      });
      
      // Update AppCache for faster loading next time
      setCacheValue('theme', newTheme);
      
      // Apply theme
      document.documentElement.classList.toggle('dark', newMode);
      
      return newMode;
    });
  };

  return (
    <button
      onClick={toggleColorMode}
      className="inline-flex items-center justify-center rounded-full p-2 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-light dark:text-gray-400 dark:hover:bg-gray-800"
      aria-label={isDarkMode ? t('aria.switchToLightMode', 'Switch to light mode') : t('aria.switchToDarkMode', 'Switch to dark mode')}
    >
      {isDarkMode ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      )}
    </button>
  );
}
