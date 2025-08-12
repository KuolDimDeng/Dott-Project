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
import itCommon from '../public/locales/it/common.json';
import plCommon from '../public/locales/pl/common.json';
import thCommon from '../public/locales/th/common.json';
import bnCommon from '../public/locales/bn/common.json';
import urCommon from '../public/locales/ur/common.json';
import tlCommon from '../public/locales/tl/common.json';
import ukCommon from '../public/locales/uk/common.json';
import faCommon from '../public/locales/fa/common.json';
import snCommon from '../public/locales/sn/common.json';
import igCommon from '../public/locales/ig/common.json';

// Import auth namespaces for new languages
import itAuth from '../public/locales/it/auth.json';
import plAuth from '../public/locales/pl/auth.json';
import thAuth from '../public/locales/th/auth.json';
import bnAuth from '../public/locales/bn/auth.json';
import urAuth from '../public/locales/ur/auth.json';
import tlAuth from '../public/locales/tl/auth.json';
import ukAuth from '../public/locales/uk/auth.json';
import faAuth from '../public/locales/fa/auth.json';
import snAuth from '../public/locales/sn/auth.json';
import igAuth from '../public/locales/ig/auth.json';

// Import onboarding namespaces for new languages
import itOnboarding from '../public/locales/it/onboarding.json';
import plOnboarding from '../public/locales/pl/onboarding.json';
import thOnboarding from '../public/locales/th/onboarding.json';
import bnOnboarding from '../public/locales/bn/onboarding.json';
import urOnboarding from '../public/locales/ur/onboarding.json';
import tlOnboarding from '../public/locales/tl/onboarding.json';
import ukOnboarding from '../public/locales/uk/onboarding.json';
import faOnboarding from '../public/locales/fa/onboarding.json';
import snOnboarding from '../public/locales/sn/onboarding.json';
import igOnboarding from '../public/locales/ig/onboarding.json';

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
import esCalendar from '../public/locales/es/calendar.json';
import frCalendar from '../public/locales/fr/calendar.json';
import ptCalendar from '../public/locales/pt/calendar.json';
import deCalendar from '../public/locales/de/calendar.json';
import zhCalendar from '../public/locales/zh/calendar.json';
import arCalendar from '../public/locales/ar/calendar.json';
import hiCalendar from '../public/locales/hi/calendar.json';
import ruCalendar from '../public/locales/ru/calendar.json';
import jaCalendar from '../public/locales/ja/calendar.json';
import swCalendar from '../public/locales/sw/calendar.json';
import trCalendar from '../public/locales/tr/calendar.json';
import idCalendar from '../public/locales/id/calendar.json';
import viCalendar from '../public/locales/vi/calendar.json';
import nlCalendar from '../public/locales/nl/calendar.json';
import haCalendar from '../public/locales/ha/calendar.json';
import yoCalendar from '../public/locales/yo/calendar.json';
import amCalendar from '../public/locales/am/calendar.json';
import zuCalendar from '../public/locales/zu/calendar.json';
import koCalendar from '../public/locales/ko/calendar.json';

// Import navigation namespaces
import enNavigation from '../public/locales/en/navigation.json';
import esNavigation from '../public/locales/es/navigation.json';
import frNavigation from '../public/locales/fr/navigation.json';
import ptNavigation from '../public/locales/pt/navigation.json';
import deNavigation from '../public/locales/de/navigation.json';
import zhNavigation from '../public/locales/zh/navigation.json';
import arNavigation from '../public/locales/ar/navigation.json';
import hiNavigation from '../public/locales/hi/navigation.json';
import ruNavigation from '../public/locales/ru/navigation.json';
import jaNavigation from '../public/locales/ja/navigation.json';
import swNavigation from '../public/locales/sw/navigation.json';
import trNavigation from '../public/locales/tr/navigation.json';
import idNavigation from '../public/locales/id/navigation.json';
import viNavigation from '../public/locales/vi/navigation.json';
import nlNavigation from '../public/locales/nl/navigation.json';
import haNavigation from '../public/locales/ha/navigation.json';
import yoNavigation from '../public/locales/yo/navigation.json';
import amNavigation from '../public/locales/am/navigation.json';
import zuNavigation from '../public/locales/zu/navigation.json';
import koNavigation from '../public/locales/ko/navigation.json';
import itNavigation from '../public/locales/it/navigation.json';
import plNavigation from '../public/locales/pl/navigation.json';
import thNavigation from '../public/locales/th/navigation.json';
import bnNavigation from '../public/locales/bn/navigation.json';
import urNavigation from '../public/locales/ur/navigation.json';
import tlNavigation from '../public/locales/tl/navigation.json';
import ukNavigation from '../public/locales/uk/navigation.json';
import faNavigation from '../public/locales/fa/navigation.json';
import snNavigation from '../public/locales/sn/navigation.json';
import igNavigation from '../public/locales/ig/navigation.json';

// Import settings namespaces
import enSettings from '../public/locales/en/settings.json';
import esSettings from '../public/locales/es/settings.json';
import frSettings from '../public/locales/fr/settings.json';
import ptSettings from '../public/locales/pt/settings.json';
import deSettings from '../public/locales/de/settings.json';
import zhSettings from '../public/locales/zh/settings.json';
import arSettings from '../public/locales/ar/settings.json';
import hiSettings from '../public/locales/hi/settings.json';
import ruSettings from '../public/locales/ru/settings.json';
import jaSettings from '../public/locales/ja/settings.json';
import swSettings from '../public/locales/sw/settings.json';
import trSettings from '../public/locales/tr/settings.json';
import idSettings from '../public/locales/id/settings.json';
import viSettings from '../public/locales/vi/settings.json';
import nlSettings from '../public/locales/nl/settings.json';
import haSettings from '../public/locales/ha/settings.json';
import yoSettings from '../public/locales/yo/settings.json';
import amSettings from '../public/locales/am/settings.json';
import zuSettings from '../public/locales/zu/settings.json';
import koSettings from '../public/locales/ko/settings.json';

// Import profile namespaces
import enProfile from '../public/locales/en/profile.json';
import esProfile from '../public/locales/es/profile.json';
import frProfile from '../public/locales/fr/profile.json';
import ptProfile from '../public/locales/pt/profile.json';
import deProfile from '../public/locales/de/profile.json';
import zhProfile from '../public/locales/zh/profile.json';
import arProfile from '../public/locales/ar/profile.json';
import hiProfile from '../public/locales/hi/profile.json';
import ruProfile from '../public/locales/ru/profile.json';
import jaProfile from '../public/locales/ja/profile.json';
import swProfile from '../public/locales/sw/profile.json';
import trProfile from '../public/locales/tr/profile.json';
import idProfile from '../public/locales/id/profile.json';
import viProfile from '../public/locales/vi/profile.json';
import nlProfile from '../public/locales/nl/profile.json';
import haProfile from '../public/locales/ha/profile.json';
import yoProfile from '../public/locales/yo/profile.json';
import amProfile from '../public/locales/am/profile.json';
import zuProfile from '../public/locales/zu/profile.json';
import koProfile from '../public/locales/ko/profile.json';

// Import help namespaces
import enHelp from '../public/locales/en/help.json';
import esHelp from '../public/locales/es/help.json';
import frHelp from '../public/locales/fr/help.json';
import ptHelp from '../public/locales/pt/help.json';
import deHelp from '../public/locales/de/help.json';
import zhHelp from '../public/locales/zh/help.json';
import arHelp from '../public/locales/ar/help.json';
import hiHelp from '../public/locales/hi/help.json';
import ruHelp from '../public/locales/ru/help.json';
import jaHelp from '../public/locales/ja/help.json';
import swHelp from '../public/locales/sw/help.json';
import trHelp from '../public/locales/tr/help.json';
import idHelp from '../public/locales/id/help.json';
import viHelp from '../public/locales/vi/help.json';
import nlHelp from '../public/locales/nl/help.json';
import haHelp from '../public/locales/ha/help.json';
import yoHelp from '../public/locales/yo/help.json';
import amHelp from '../public/locales/am/help.json';
import zuHelp from '../public/locales/zu/help.json';
import koHelp from '../public/locales/ko/help.json';

// Import dashboard namespaces
import enDashboard from '../public/locales/en/dashboard.json';
import esDashboard from '../public/locales/es/dashboard.json';
import frDashboard from '../public/locales/fr/dashboard.json';
import ptDashboard from '../public/locales/pt/dashboard.json';
import deDashboard from '../public/locales/de/dashboard.json';
import zhDashboard from '../public/locales/zh/dashboard.json';
import arDashboard from '../public/locales/ar/dashboard.json';
import hiDashboard from '../public/locales/hi/dashboard.json';
import ruDashboard from '../public/locales/ru/dashboard.json';
import jaDashboard from '../public/locales/ja/dashboard.json';
import swDashboard from '../public/locales/sw/dashboard.json';
import trDashboard from '../public/locales/tr/dashboard.json';
import idDashboard from '../public/locales/id/dashboard.json';
import viDashboard from '../public/locales/vi/dashboard.json';
import nlDashboard from '../public/locales/nl/dashboard.json';
import haDashboard from '../public/locales/ha/dashboard.json';
import yoDashboard from '../public/locales/yo/dashboard.json';
import amDashboard from '../public/locales/am/dashboard.json';
import zuDashboard from '../public/locales/zu/dashboard.json';
import koDashboard from '../public/locales/ko/dashboard.json';

// Import POS namespaces
import enPos from '../public/locales/en/pos.json';
import esPos from '../public/locales/es/pos.json';
import frPos from '../public/locales/fr/pos.json';
import ptPos from '../public/locales/pt/pos.json';
import dePos from '../public/locales/de/pos.json';
import zhPos from '../public/locales/zh/pos.json';
import arPos from '../public/locales/ar/pos.json';
import hiPos from '../public/locales/hi/pos.json';
import ruPos from '../public/locales/ru/pos.json';
import jaPos from '../public/locales/ja/pos.json';
import swPos from '../public/locales/sw/pos.json';
import trPos from '../public/locales/tr/pos.json';
import idPos from '../public/locales/id/pos.json';
import viPos from '../public/locales/vi/pos.json';
import nlPos from '../public/locales/nl/pos.json';
import haPos from '../public/locales/ha/pos.json';
import yoPos from '../public/locales/yo/pos.json';
import amPos from '../public/locales/am/pos.json';
import zuPos from '../public/locales/zu/pos.json';
import koPos from '../public/locales/ko/pos.json';

const resources = {
  en: {
    common: enCommon,
    onboarding: enOnboarding,
    auth: enAuth,
    calendar: enCalendar,
    navigation: enNavigation,
    settings: enSettings,
    profile: enProfile,
    help: enHelp,
    dashboard: enDashboard,
    pos: enPos
  },
  es: {
    common: esCommon,
    onboarding: esOnboarding,
    auth: esAuth,
    calendar: esCalendar,
    navigation: esNavigation,
    settings: esSettings,
    profile: esProfile,
    help: esHelp,
    dashboard: esDashboard,
    pos: esPos
  },
  fr: {
    common: frCommon,
    onboarding: frOnboarding,
    auth: frAuth,
    calendar: frCalendar,
    navigation: frNavigation,
    settings: frSettings,
    profile: frProfile,
    help: frHelp,
    dashboard: frDashboard,
    pos: frPos
  },
  pt: {
    common: ptCommon,
    onboarding: ptOnboarding,
    auth: ptAuth,
    calendar: ptCalendar,
    navigation: ptNavigation,
    settings: ptSettings,
    profile: ptProfile,
    help: ptHelp,
    dashboard: ptDashboard,
    pos: ptPos
  },
  de: {
    common: deCommon,
    onboarding: deOnboarding,
    auth: deAuth,
    calendar: deCalendar,
    navigation: deNavigation,
    settings: deSettings,
    profile: deProfile,
    help: deHelp,
    dashboard: deDashboard,
    pos: dePos
  },
  zh: {
    common: zhCommon,
    onboarding: zhOnboarding,
    auth: zhAuth,
    calendar: zhCalendar,
    navigation: zhNavigation,
    settings: zhSettings,
    profile: zhProfile,
    help: zhHelp,
    dashboard: zhDashboard,
    pos: zhPos
  },
  ar: {
    common: arCommon,
    onboarding: arOnboarding,
    auth: arAuth,
    calendar: arCalendar,
    navigation: arNavigation,
    settings: arSettings,
    profile: arProfile,
    help: arHelp,
    dashboard: arDashboard,
    pos: arPos
  },
  hi: {
    common: hiCommon,
    onboarding: hiOnboarding,
    auth: hiAuth,
    calendar: hiCalendar,
    navigation: hiNavigation,
    settings: hiSettings,
    profile: hiProfile,
    help: hiHelp,
    dashboard: hiDashboard,
    pos: hiPos
  },
  ru: {
    common: ruCommon,
    onboarding: ruOnboarding,
    auth: ruAuth,
    calendar: ruCalendar,
    navigation: ruNavigation,
    settings: ruSettings,
    profile: ruProfile,
    help: ruHelp,
    dashboard: ruDashboard,
    pos: ruPos
  },
  ja: {
    common: jaCommon,
    onboarding: jaOnboarding,
    auth: jaAuth,
    calendar: jaCalendar,
    navigation: jaNavigation,
    settings: jaSettings,
    profile: jaProfile,
    help: jaHelp,
    dashboard: jaDashboard,
    pos: jaPos
  },
  sw: {
    common: swCommon,
    onboarding: swOnboarding,
    auth: swAuth,
    calendar: swCalendar,
    navigation: swNavigation,
    settings: swSettings,
    profile: swProfile,
    help: swHelp,
    dashboard: swDashboard,
    pos: swPos
  },
  tr: {
    common: trCommon,
    onboarding: trOnboarding,
    auth: trAuth,
    calendar: trCalendar,
    navigation: trNavigation,
    settings: trSettings,
    profile: trProfile,
    help: trHelp,
    dashboard: trDashboard,
    pos: trPos
  },
  id: {
    common: idCommon,
    onboarding: idOnboarding,
    auth: idAuth,
    calendar: idCalendar,
    navigation: idNavigation,
    settings: idSettings,
    profile: idProfile,
    help: idHelp,
    dashboard: idDashboard,
    pos: idPos
  },
  vi: {
    common: viCommon,
    onboarding: viOnboarding,
    auth: viAuth,
    calendar: viCalendar,
    navigation: viNavigation,
    settings: viSettings,
    profile: viProfile,
    help: viHelp,
    dashboard: viDashboard,
    pos: viPos
  },
  nl: {
    common: nlCommon,
    onboarding: nlOnboarding,
    auth: nlAuth,
    calendar: nlCalendar,
    navigation: nlNavigation,
    settings: nlSettings,
    profile: nlProfile,
    help: nlHelp,
    dashboard: nlDashboard,
    pos: nlPos
  },
  ha: {
    common: haCommon,
    onboarding: haOnboarding,
    auth: haAuth,
    calendar: haCalendar,
    navigation: haNavigation,
    settings: haSettings,
    profile: haProfile,
    help: haHelp,
    dashboard: haDashboard,
    pos: haPos
  },
  yo: {
    common: yoCommon,
    onboarding: yoOnboarding,
    auth: yoAuth,
    calendar: yoCalendar,
    navigation: yoNavigation,
    settings: yoSettings,
    profile: yoProfile,
    help: yoHelp,
    dashboard: yoDashboard,
    pos: yoPos
  },
  am: {
    common: amCommon,
    onboarding: amOnboarding,
    auth: amAuth,
    calendar: amCalendar,
    navigation: amNavigation,
    settings: amSettings,
    profile: amProfile,
    help: amHelp,
    dashboard: amDashboard,
    pos: amPos
  },
  zu: {
    common: zuCommon,
    onboarding: zuOnboarding,
    auth: zuAuth,
    calendar: zuCalendar,
    navigation: zuNavigation,
    settings: zuSettings,
    profile: zuProfile,
    help: zuHelp,
    dashboard: zuDashboard,
    pos: zuPos
  },
  ko: {
    common: koCommon,
    onboarding: koOnboarding,
    auth: koAuth,
    calendar: koCalendar,
    navigation: koNavigation,
    settings: koSettings,
    profile: koProfile,
    help: koHelp,
    dashboard: koDashboard,
    pos: koPos
  },
  it: {
    common: itCommon,
    navigation: itNavigation,
    onboarding: itOnboarding,
    auth: itAuth,
    // Fallback to English for missing translations
    calendar: enCalendar,
    settings: enSettings,
    profile: enProfile,
    help: enHelp,
    dashboard: enDashboard,
    pos: enPos
  },
  pl: {
    common: plCommon,
    navigation: plNavigation,
    onboarding: plOnboarding,
    auth: plAuth,
    // Fallback to English for missing translations
    calendar: enCalendar,
    settings: enSettings,
    profile: enProfile,
    help: enHelp,
    dashboard: enDashboard,
    pos: enPos
  },
  th: {
    common: thCommon,
    navigation: thNavigation,
    onboarding: thOnboarding,
    auth: thAuth,
    // Fallback to English for missing translations
    calendar: enCalendar,
    settings: enSettings,
    profile: enProfile,
    help: enHelp,
    dashboard: enDashboard,
    pos: enPos
  },
  bn: {
    common: bnCommon,
    navigation: bnNavigation,
    onboarding: bnOnboarding,
    auth: bnAuth,
    // Fallback to English for missing translations
    calendar: enCalendar,
    settings: enSettings,
    profile: enProfile,
    help: enHelp,
    dashboard: enDashboard,
    pos: enPos
  },
  ur: {
    common: urCommon,
    navigation: urNavigation,
    onboarding: urOnboarding,
    auth: urAuth,
    // Fallback to English for missing translations
    calendar: enCalendar,
    settings: enSettings,
    profile: enProfile,
    help: enHelp,
    dashboard: enDashboard,
    pos: enPos
  },
  tl: {
    common: tlCommon,
    navigation: tlNavigation,
    onboarding: tlOnboarding,
    auth: tlAuth,
    // Fallback to English for missing translations
    calendar: enCalendar,
    settings: enSettings,
    profile: enProfile,
    help: enHelp,
    dashboard: enDashboard,
    pos: enPos
  },
  uk: {
    common: ukCommon,
    navigation: ukNavigation,
    onboarding: ukOnboarding,
    auth: ukAuth,
    // Fallback to English for missing translations
    calendar: enCalendar,
    settings: enSettings,
    profile: enProfile,
    help: enHelp,
    dashboard: enDashboard,
    pos: enPos
  },
  fa: {
    common: faCommon,
    navigation: faNavigation,
    onboarding: faOnboarding,
    auth: faAuth,
    // Fallback to English for missing translations
    calendar: enCalendar,
    settings: enSettings,
    profile: enProfile,
    help: enHelp,
    dashboard: enDashboard,
    pos: enPos
  },
  sn: {
    common: snCommon,
    navigation: snNavigation,
    onboarding: snOnboarding,
    auth: snAuth,
    // Fallback to English for missing translations
    calendar: enCalendar,
    settings: enSettings,
    profile: enProfile,
    help: enHelp,
    dashboard: enDashboard,
    pos: enPos
  },
  ig: {
    common: igCommon,
    navigation: igNavigation,
    onboarding: igOnboarding,
    auth: igAuth,
    // Fallback to English for missing translations
    calendar: enCalendar,
    settings: enSettings,
    profile: enProfile,
    help: enHelp,
    dashboard: enDashboard,
    pos: enPos
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
        ns: ['common', 'onboarding', 'auth', 'calendar', 'navigation', 'settings', 'profile', 'help', 'dashboard', 'pos'],
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
        ns: ['common', 'onboarding', 'auth', 'calendar', 'navigation', 'settings', 'profile', 'help', 'dashboard', 'pos'],
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