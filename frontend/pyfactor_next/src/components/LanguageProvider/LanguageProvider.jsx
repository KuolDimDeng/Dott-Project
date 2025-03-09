'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { useCookies } from 'react-cookie';
import i18nInstance from '../../i18n';

export function LanguageProvider({ children }) {
  const [isReady, setIsReady] = useState(false);
  const pathname = usePathname();
  const [cookies, setCookie] = useCookies(['i18nextLng']);
  
  // Force re-render when language changes
  const [, setRenderKey] = useState(0);

  // Detect user's language on initial load
  useEffect(() => {
    const detectUserLanguage = async () => {
      try {
        if (!i18nInstance.isInitialized) {
          await new Promise(resolve => setTimeout(resolve, 50));
          return detectUserLanguage();
        }
        
        // Get saved language from localStorage or cookie
        const savedLang = localStorage.getItem('i18nextLng') || cookies.i18nextLng;
        
        if (savedLang && i18nInstance.options.supportedLngs.includes(savedLang)) {
          await i18nInstance.changeLanguage(savedLang);
        } else {
          // Get browser language
          const browserLang = navigator.language.split('-')[0];
          
          // Check if it's in our supported languages
          const isSupported = i18nInstance.options.supportedLngs.includes(browserLang);
          
          if (isSupported) {
            await i18nInstance.changeLanguage(browserLang);
          }
        }
        
        setIsReady(true);
      } catch (error) {
        console.error('Error detecting language:', error);
        setIsReady(true); // Continue even if there's an error
      }
    };

    detectUserLanguage();
  }, [cookies.i18nextLng]);

  // Listen for language changes
  useEffect(() => {
    const handleLanguageChange = () => {
      setRenderKey(prev => prev + 1); // Force re-render
    };

    window.addEventListener('languageChange', handleLanguageChange);
    
    return () => {
      window.removeEventListener('languageChange', handleLanguageChange);
    };
  }, []);

  if (!isReady) {
    // You could return a loading indicator here if needed
    return children;
  }

  return (
    <I18nextProvider i18n={i18nInstance}>
      {children}
    </I18nextProvider>
  );
}

export default LanguageProvider;