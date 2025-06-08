'use client';


import { useEffect, useState } from 'react';
import { getThemePreference } from '@/utils/userPreferences';
import { getCacheValue } from '@/utils/appCache';

export default function ThemeRegistry({ children }) {
  const [mounted, setMounted] = useState(false);
  
  // Mount effect for client-side rendering
  useEffect(() => {
    setMounted(true);
    
    // Check for dark mode preference - first from AppCache (fastest)
    const cachedTheme = getCacheValue('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (cachedTheme === 'dark' || (!cachedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
    } else if (cachedTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // If no cached value, check Cognito
      getThemePreference('system')
        .then(savedTheme => {
          if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
          } else if (savedTheme === 'light') {
            document.documentElement.classList.remove('dark');
          } else if (savedTheme === 'system' && prefersDark) {
            // If system theme and dark mode preferred
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        })
        .catch(() => {
          // If error, fall back to system preference
          if (prefersDark) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        });
    }
    
    // Listen to system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      // Only update if using system preference (if no saved preference)
      getCacheValue('theme')
        .then(cachedTheme => {
          if (!cachedTheme || cachedTheme === 'system') {
            if (e.matches) {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          }
        })
        .catch(() => {
          // If error checking cache, fall back to system preference
          if (e.matches) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        });
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  if (!mounted) {
    // Return empty div during SSR to avoid hydration mismatch
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }
  
  return (
    <>
      <style jsx global>{`
        :root {
          --color-primary-light: #5c93d8;
          --color-primary-main: #1976d2;
          --color-primary-dark: #1565c0;
          --color-secondary-light: #ff7961;
          --color-secondary-main: #f44336;
          --color-secondary-dark: #ba000d;
          --color-error-main: #f44336;
          --color-info-main: #2196f3;
          --color-success-main: #4caf50;
          --color-warning-main: #ff9800;
          --color-text-primary: rgba(0, 0, 0, 0.87);
          --color-text-secondary: rgba(0, 0, 0, 0.6);
          --color-text-disabled: rgba(0, 0, 0, 0.38);
        }
        
        .dark {
          --color-primary-light: #77a4db;
          --color-primary-main: #4299e1;
          --color-primary-dark: #2b6cb0;
          --color-secondary-light: #fc8e81;
          --color-secondary-main: #f56565;
          --color-secondary-dark: #c53030;
          --color-error-main: #f56565;
          --color-info-main: #4299e1;
          --color-success-main: #48bb78;
          --color-warning-main: #ed8936;
          --color-text-primary: rgba(255, 255, 255, 0.87);
          --color-text-secondary: rgba(255, 255, 255, 0.6);
          --color-text-disabled: rgba(255, 255, 255, 0.38);
        }
      `}</style>
      {children}
    </>
  );
}