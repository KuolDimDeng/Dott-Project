'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';

export default function OnboardingLayout({ children }) {
  const { i18n } = useTranslation();
  const searchParams = useSearchParams();
  
  // Initialize language from URL parameter or localStorage
  useEffect(() => {
    const initializeLanguage = async () => {
      // First priority: URL parameter
      const langParam = searchParams.get('lang');
      if (langParam && langParam !== i18n.language && i18n.changeLanguage) {
        await i18n.changeLanguage(langParam);
        console.log('🌐 Onboarding page language set from URL parameter:', langParam);
        return;
      }
      
      // Second priority: localStorage (manual selection)
      const savedLang = localStorage.getItem('i18nextLng');
      const userManuallySelected = localStorage.getItem('userManuallySelectedLanguage');
      
      if (savedLang && userManuallySelected === 'true' && savedLang !== i18n.language && i18n.changeLanguage) {
        await i18n.changeLanguage(savedLang);
        console.log('🌐 Onboarding page language set from localStorage:', savedLang);
      }
    };
    
    initializeLanguage();
  }, [searchParams, i18n]);

  return children;
}