'use client';


import i18next from 'i18next';
// Import appCache if needed for language preferences
// import { appCache } from '@/utils/appCache';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { appCache, setCacheValue } from '@/utils/appCache';
import { i18n as i18nConfig } from '../next-i18next.config.mjs';
import { getCognitoLanguageDetector, saveLanguagePreference } from '@/utils/userPreferences';
import { getLanguageForCountry } from '@/services/countryDetectionService';

// Import translation resources for all languages
import enCommon from '../public/locales/en/common.json';
import esCommon from '../public/locales/es/common.json';
import frCommon from '../public/locales/fr/common.json';
import ptCommon from '../public/locales/pt/common.json';
import deCommon from '../public/locales/de/common.json';
import zhCommon from '../public/locales/zh/common.json';
import arCommon from '../public/locales/ar/common.json';
import hiCommon from '../public/locales/hi/common.json';
import ruCommon from '../public/locales/ru/common.json';
import jaCommon from '../public/locales/ja/common.json';
import swCommon from '../public/locales/sw/common.json';
import trCommon from '../public/locales/tr/common.json';
import idCommon from '../public/locales/id/common.json';
import viCommon from '../public/locales/vi/common.json';
import nlCommon from '../public/locales/nl/common.json';
import haCommon from '../public/locales/ha/common.json';
import yoCommon from '../public/locales/yo/common.json';
import amCommon from '../public/locales/am/common.json';
import zuCommon from '../public/locales/zu/common.json';
import koCommon from '../public/locales/ko/common.json';

// Import onboarding namespaces
import enOnboarding from '../public/locales/en/onboarding.json';
import esOnboarding from '../public/locales/es/onboarding.json';
import frOnboarding from '../public/locales/fr/onboarding.json';
import ptOnboarding from '../public/locales/pt/onboarding.json';
import deOnboarding from '../public/locales/de/onboarding.json';
import zhOnboarding from '../public/locales/zh/onboarding.json';
import arOnboarding from '../public/locales/ar/onboarding.json';
import hiOnboarding from '../public/locales/hi/onboarding.json';
import ruOnboarding from '../public/locales/ru/onboarding.json';
import jaOnboarding from '../public/locales/ja/onboarding.json';
import swOnboarding from '../public/locales/sw/onboarding.json';
import trOnboarding from '../public/locales/tr/onboarding.json';
import idOnboarding from '../public/locales/id/onboarding.json';
import viOnboarding from '../public/locales/vi/onboarding.json';
import nlOnboarding from '../public/locales/nl/onboarding.json';
import haOnboarding from '../public/locales/ha/onboarding.json';
import yoOnboarding from '../public/locales/yo/onboarding.json';
import amOnboarding from '../public/locales/am/onboarding.json';
import zuOnboarding from '../public/locales/zu/onboarding.json';
import koOnboarding from '../public/locales/ko/onboarding.json';

// Import auth namespaces
import enAuth from '../public/locales/en/auth.json';
import esAuth from '../public/locales/es/auth.json';
import frAuth from '../public/locales/fr/auth.json';
import ptAuth from '../public/locales/pt/auth.json';
import deAuth from '../public/locales/de/auth.json';
import zhAuth from '../public/locales/zh/auth.json';
import arAuth from '../public/locales/ar/auth.json';
import hiAuth from '../public/locales/hi/auth.json';
import ruAuth from '../public/locales/ru/auth.json';
import jaAuth from '../public/locales/ja/auth.json';
import swAuth from '../public/locales/sw/auth.json';
import trAuth from '../public/locales/tr/auth.json';
import idAuth from '../public/locales/id/auth.json';
import viAuth from '../public/locales/vi/auth.json';
import nlAuth from '../public/locales/nl/auth.json';
import haAuth from '../public/locales/ha/auth.json';
import yoAuth from '../public/locales/yo/auth.json';
import amAuth from '../public/locales/am/auth.json';
import zuAuth from '../public/locales/zu/auth.json';
import koAuth from '../public/locales/ko/auth.json';

// Import calendar namespaces
import enCalendar from '../public/locales/en/calendar.json';

const resources = {
  en: {
    common: enCommon,
    onboarding: enOnboarding,
    auth: enAuth,
    calendar: enCalendar
  },
  es: {
    common: esCommon,
    onboarding: esOnboarding,
    auth: esAuth
  },
  fr: {
    common: frCommon,
    onboarding: frOnboarding,
    auth: frAuth
  },
  pt: {
    common: ptCommon,
    onboarding: ptOnboarding,
    auth: ptAuth
  },
  de: {
    common: deCommon,
    onboarding: deOnboarding,
    auth: deAuth
  },
  zh: {
    common: zhCommon,
    onboarding: zhOnboarding,
    auth: zhAuth
  },
  ar: {
    common: arCommon,
    onboarding: arOnboarding,
    auth: arAuth
  },
  hi: {
    common: hiCommon,
    onboarding: hiOnboarding,
    auth: hiAuth
  },
  ru: {
    common: ruCommon,
    onboarding: ruOnboarding,
    auth: ruAuth
  },
  ja: {
    common: jaCommon,
    onboarding: jaOnboarding,
    auth: jaAuth
  },
  sw: {
    common: swCommon,
    onboarding: swOnboarding,
    auth: swAuth
  },
  tr: {
    common: trCommon,
    onboarding: trOnboarding,
    auth: trAuth
  },
  id: {
    common: idCommon,
    onboarding: idOnboarding,
    auth: idAuth
  },
  vi: {
    common: viCommon,
    onboarding: viOnboarding,
    auth: viAuth
  },
  nl: {
    common: nlCommon,
    onboarding: nlOnboarding,
    auth: nlAuth
  },
  ha: {
    common: haCommon,
    onboarding: haOnboarding,
    auth: haAuth
  },
  yo: {
    common: yoCommon,
    onboarding: yoOnboarding,
    auth: yoAuth
  },
  am: {
    common: amCommon,
    onboarding: amOnboarding,
    auth: amAuth
  },
  zu: {
    common: zuCommon,
    onboarding: zuOnboarding,
    auth: zuAuth
  },
  ko: {
    common: koCommon,
    onboarding: koOnboarding,
    auth: koAuth
  }
};

// Create a single i18n instance to be used throughout the app
const i18nInstance = i18next.createInstance();

// Initialize i18next for client-side only
if (typeof window !== 'undefined' && !i18nInstance.isInitialized) {
  try {
    // Create custom Cognito language detector
    const cognitoDetector = getCognitoLanguageDetector();
    
    // Create custom country-based language detector
    const countryDetector = {
      name: 'countryDetector',
      
      lookup() {
        try {
          // Get country from cache if available
          if (typeof window !== 'undefined') {
            // Try to get from appCache
            const cachedCountry = appCache.get('user_country');
            if (cachedCountry) {
              const language = getLanguageForCountry(cachedCountry);
              console.log(`🌍 Country detector (from cache): ${cachedCountry} -> ${language}`);
              return language;
            }
            
            // Also check localStorage as fallback
            const storedCountry = localStorage.getItem('detected_country');
            if (storedCountry) {
              const language = getLanguageForCountry(storedCountry);
              console.log(`🌍 Country detector (from localStorage): ${storedCountry} -> ${language}`);
              return language;
            }
          }
        } catch (error) {
          console.error('❌ Country language detector error:', error);
        }
        return null;
      },
      
      cacheUserLanguage(lng) {
        // This will be called by i18next when language changes
        console.log(`🌍 Country detector caching language: ${lng}`);
      }
    };
    
    i18nInstance
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        resources,
        fallbackLng: i18nConfig.defaultLocale,
        supportedLngs: i18nConfig.locales,
        ns: ['common', 'onboarding', 'auth'],
        defaultNS: 'common',
        detection: {
          order: ['querystring', 'localStorage', 'countryDetector', 'navigator', 'htmlTag'],
          lookupQuerystring: 'lang',
          lookupFromPathIndex: 0,
          checkWhitelist: true,
          caches: ['localStorage'], // Use localStorage for faster access
        },
        interpolation: {
          escapeValue: false, // React already protects from XSS
        },
        react: {
          useSuspense: false, // Disable suspense for SSR
        },
      });

    // Register the custom detectors
    i18nInstance.services.languageDetector.addDetector(cognitoDetector);
    i18nInstance.services.languageDetector.addDetector(countryDetector);

    // Add a language change listener to force re-render of components
    i18nInstance.on('languageChanged', async (lng) => {
      // Update HTML lang attribute and text direction for RTL languages
      if (typeof document !== 'undefined') {
        document.documentElement.lang = lng;
        document.documentElement.dir = ['ar', 'he', 'fa', 'ur'].includes(lng) ? 'rtl' : 'ltr';
        
        // Check if we're on a public page
        const isPublicPage = () => {
          const path = window.location.pathname;
          const publicPaths = ['/', '/about', '/contact', '/pricing', '/terms', '/privacy', '/blog', '/careers'];
          return publicPaths.includes(path) || path.startsWith('/auth/');
        };
        
        // Store the language in AWS Cognito attributes (only for authenticated pages)
        if (!isPublicPage()) {
          try {
            await saveLanguagePreference(lng);
            
            // Also store in AppCache for faster access
            setCacheValue('user_pref_custom:language', lng);
          } catch (error) {
            console.error('Failed to save language preference to Cognito:', error);
          }
        } else {
          // On public pages, just store in localStorage and AppCache
          try {
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('i18nextLng', lng);
            }
            setCacheValue('user_pref_custom:language', lng);
          } catch (error) {
            console.error('Failed to save language preference locally:', error);
          }
        }
        
        // Force re-render by dispatching a custom event
        window.dispatchEvent(new Event('languageChange'));
      }
    });
  } catch (error) {
    console.error('[i18n] Error initializing i18next:', error);
  }
} else if (typeof window === 'undefined') {
  // Server-side initialization with minimal config
  try {
    i18nInstance
      .use(initReactI18next)
      .init({
        resources,
        fallbackLng: i18nConfig.defaultLocale,
        supportedLngs: i18nConfig.locales,
        ns: ['common', 'onboarding', 'auth'],
        defaultNS: 'common',
        interpolation: {
          escapeValue: false,
        },
        react: {
          useSuspense: false,
        },
      });
  } catch (error) {
    console.error('[i18n] Error initializing i18next on server:', error);
  }
}

export default i18nInstance;