'use client';

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { appCache, setCacheValue } from '@/utils/appCache';
import { i18n as i18nConfig } from '../next-i18next.config.mjs';
import { getCognitoLanguageDetector, saveLanguagePreference } from '@/utils/userPreferences';
import { getLanguageForCountry } from '@/services/countryDetectionService';

// Only load English by default
import enNavigation from '../public/locales/en/navigation.json';
import enAuth from '../public/locales/en/auth.json';
import enOnboarding from '../public/locales/en/onboarding.json';
import enDashboard from '../public/locales/en/dashboard.json';
import enSettings from '../public/locales/en/settings.json';
import enProfile from '../public/locales/en/profile.json';
import enHelp from '../public/locales/en/help.json';
import enCalendar from '../public/locales/en/calendar.json';
import enImportExport from '../public/locales/en/import-export.json';

// Language metadata for lazy loading
const languageMetadata = {
  en: { name: 'English', loaded: true },
  es: { name: 'Español', loaded: false },
  fr: { name: 'Français', loaded: false },
  pt: { name: 'Português', loaded: false },
  de: { name: 'Deutsch', loaded: false },
  zh: { name: '中文', loaded: false },
  ar: { name: 'العربية', loaded: false, rtl: true },
  hi: { name: 'हिन्दी', loaded: false },
  ru: { name: 'Русский', loaded: false },
  ja: { name: '日本語', loaded: false },
  sw: { name: 'Kiswahili', loaded: false },
  tr: { name: 'Türkçe', loaded: false },
  id: { name: 'Bahasa Indonesia', loaded: false },
  vi: { name: 'Tiếng Việt', loaded: false },
  nl: { name: 'Nederlands', loaded: false },
  ha: { name: 'Hausa', loaded: false },
  yo: { name: 'Yorùbá', loaded: false },
  am: { name: 'አማርኛ', loaded: false },
  zu: { name: 'isiZulu', loaded: false },
  ko: { name: '한국어', loaded: false }
};

// Function to lazy load language resources
const loadLanguageResources = async (language) => {
  console.log(`🌐 [i18n-optimized] Checking if ${language} resources need loading...`);
  
  if (languageMetadata[language]?.loaded) {
    console.log(`🌐 [i18n-optimized] ${language} already loaded, skipping`);
    return; // Already loaded
  }

  console.log(`🌐 [i18n-optimized] Starting lazy load for ${language}...`);
  const startTime = performance.now();

  try {
    const namespaces = [
      'navigation', 'auth', 'onboarding', 'dashboard', 
      'settings', 'profile', 'help', 'calendar'
    ];
    
    const resources = {};
    
    // Load all namespaces for the language in parallel
    const promises = namespaces.map(async (ns) => {
      try {
        console.log(`🌐 [i18n-optimized] Loading ${ns} namespace for ${language}...`);
        const module = await import(`../public/locales/${language}/${ns}.json`);
        resources[ns] = module.default;
        console.log(`✅ [i18n-optimized] Successfully loaded ${ns} for ${language}`);
      } catch (error) {
        console.warn(`⚠️ [i18n-optimized] Failed to load ${ns} for ${language}:`, error);
        // Use English as fallback
        resources[ns] = await import(`../public/locales/en/${ns}.json`).then(m => m.default);
        console.log(`🔄 [i18n-optimized] Using English fallback for ${ns}`);
      }
    });
    
    await Promise.all(promises);
    
    // Add resources to i18next
    Object.keys(resources).forEach(ns => {
      i18nInstance.addResourceBundle(language, ns, resources[ns], true, true);
    });
    
    languageMetadata[language].loaded = true;
    const loadTime = performance.now() - startTime;
    console.log(`✅ [i18n-optimized] Successfully loaded all ${language} resources in ${loadTime.toFixed(2)}ms`);
  } catch (error) {
    console.error(`❌ [i18n-optimized] Failed to load language resources for ${language}:`, error);
  }
};

// Check if running in browser
const isBrowser = typeof window !== 'undefined';

// Create i18n instance
const i18nInstance = i18next.createInstance({
  ...i18nConfig,
  resources: {
    en: {
      navigation: enNavigation,
      auth: enAuth,
      onboarding: enOnboarding,
      dashboard: enDashboard,
      settings: enSettings,
      profile: enProfile,
      help: enHelp,
      calendar: enCalendar,
      'import-export': enImportExport
    }
  },
  ns: ['navigation', 'auth', 'onboarding', 'dashboard', 'settings', 'profile', 'help', 'calendar', 'import-export'],
  defaultNS: 'navigation',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false
  },
  react: {
    useSuspense: false
  },
  detection: {
    order: ['localStorage', 'navigator', 'htmlTag'],
    caches: ['localStorage'],
    lookupLocalStorage: 'userLanguage'
  }
});

// Initialize i18next
const initI18n = async () => {
  if (!isBrowser) return i18nInstance;

  console.log('🌐 [i18n-optimized] Starting i18n initialization...');

  try {
    // Initialize i18next with plugins
    await i18nInstance
      .use(LanguageDetector)
      .use(initReactI18next)
      .init();

    console.log('🌐 [i18n-optimized] i18next core initialized');

    // Get stored language preference
    const storedLanguage = localStorage.getItem('userLanguage') || 
                         appCache.getItem('userLanguage');
    
    console.log(`🌐 [i18n-optimized] Stored language preference: ${storedLanguage}`);
    console.log(`🌐 [i18n-optimized] Detected language: ${i18nInstance.language}`);
    
    // Determine initial language
    let initialLanguage = storedLanguage || i18nInstance.language || 'en';
    console.log(`🌐 [i18n-optimized] Initial language will be: ${initialLanguage}`);
    
    // If language is not English, load its resources
    if (initialLanguage !== 'en') {
      console.log(`🌐 [i18n-optimized] Non-English language detected, loading ${initialLanguage} resources...`);
      await loadLanguageResources(initialLanguage);
    } else {
      console.log('🌐 [i18n-optimized] Using pre-loaded English resources');
    }
    
    // Change to the initial language
    await i18nInstance.changeLanguage(initialLanguage);
    console.log(`🌐 [i18n-optimized] Language set to: ${initialLanguage}`);
    
    // Override changeLanguage to include lazy loading
    if (i18nInstance && typeof i18nInstance.changeLanguage === 'function') {
      const originalChangeLanguage = i18nInstance.changeLanguage.bind(i18nInstance);
      i18nInstance.changeLanguage = async (language) => {
        console.log(`🌐 [i18n-optimized] Language change requested to: ${language}`);
        
        // Load resources if not already loaded
        await loadLanguageResources(language);
        
        // Change language
        const result = await originalChangeLanguage(language);
        
        // Save preference
        localStorage.setItem('userLanguage', language);
        appCache.setItem('userLanguage', language);
        setCacheValue('language', language);
        console.log(`🌐 [i18n-optimized] Language preference saved: ${language}`);
        
        // Update document direction for RTL languages
        document.documentElement.dir = languageMetadata[language]?.rtl ? 'rtl' : 'ltr';
        
        return result;
      };
    } else {
      console.error('🌐 [i18n-optimized] Warning: i18nInstance.changeLanguage is not a function');
    }
    
    console.log('✅ [i18n-optimized] i18n initialization complete');
  } catch (error) {
    console.error('❌ [i18n-optimized] Error initializing i18n:', error);
  }

  return i18nInstance;
};

// Initialize on module load if in browser
if (isBrowser) {
  initI18n();
}

export default i18nInstance;
export { loadLanguageResources, languageMetadata };