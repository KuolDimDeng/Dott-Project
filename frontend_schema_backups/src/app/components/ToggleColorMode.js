'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getCacheValue, setCacheValue } from '@/utils/appCache';
import { updateUserAttributes } from '@/config/amplifyUnified';
import { logger } from '@/utils/logger';

export default function ToggleColorMode() {
  const { t } = useTranslation();
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  useEffect(() => {
    // Check for saved preference or system preference
    const savedTheme = getCacheValue('color-theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);
  
  const toggleColorMode = () => {
    setIsDarkMode(prev => {
      const newMode = !prev;
      
      // Save preference in AppCache
      setCacheValue('color-theme', newMode ? 'dark' : 'light', { ttl: 365 * 24 * 60 * 60 * 1000 }); // 1 year
      
      // Update Cognito user attributes to remember preference
      try {
        updateUserAttributes({
          userAttributes: {
            'custom:theme': newMode ? 'dark' : 'light',
            'custom:preferences': JSON.stringify({ theme: newMode ? 'dark' : 'light' })
          }
        }).catch(err => logger.debug('Non-critical: Failed to update theme in Cognito', err));
      } catch (error) {
        // Non-critical error, just log for debugging
        logger.debug('Non-critical: Error updating theme preference', error);
      }
      
      // Apply theme
      if (newMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
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
