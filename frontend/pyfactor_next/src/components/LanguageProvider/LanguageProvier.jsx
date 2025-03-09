// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/components/LanguageProvider/LanguageProvier.jsx
'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import i18next from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { useCookies } from 'react-cookie';

// Import translation resources for all 15 languages
import enCommon from '../../public/locales/en/common.json';
import esCommon from '../../public/locales/es/common.json';
import frCommon from '../../public/locales/fr/common.json';
import ptCommon from '../../public/locales/pt/common.json';
import deCommon from '../../public/locales/de/common.json';
import zhCommon from '../../public/locales/zh/common.json';
import arCommon from '../../public/locales/ar/common.json';
import hiCommon from '../../public/locales/hi/common.json';
import ruCommon from '../../public/locales/ru/common.json';
import jaCommon from '../../public/locales/ja/common.json';
import swCommon from '../../public/locales/sw/common.json';
import trCommon from '../../public/locales/tr/common.json';
import idCommon from '../../public/locales/id/common.json';
import viCommon from '../../public/locales/vi/common.json';
import nlCommon from '../../public/locales/nl/common.json';
import haCommon from '../../public/locales/ha/common.json';
import yoCommon from '../../public/locales/yo/common.json';
import amCommon from '../../public/locales/am/common.json';
import zuCommon from '../../public/locales/zu/common.json';
import koCommon from '../../public/locales/ko/common.json';

// Import onboarding namespaces
import enOnboarding from '../../public/locales/en/onboarding.json';
import esOnboarding from '../../public/locales/es/onboarding.json';
import frOnboarding from '../../public/locales/fr/onboarding.json';
import ptOnboarding from '../../public/locales/pt/onboarding.json';
import deOnboarding from '../../public/locales/de/onboarding.json';
import zhOnboarding from '../../public/locales/zh/onboarding.json';
import arOnboarding from '../../public/locales/ar/onboarding.json';
import hiOnboarding from '../../public/locales/hi/onboarding.json';
import ruOnboarding from '../../public/locales/ru/onboarding.json';
import jaOnboarding from '../../public/locales/ja/onboarding.json';
import swOnboarding from '../../public/locales/sw/onboarding.json';
import trOnboarding from '../../public/locales/tr/onboarding.json';
import idOnboarding from '../../public/locales/id/onboarding.json';
import viOnboarding from '../../public/locales/vi/onboarding.json';
import nlOnboarding from '../../public/locales/nl/onboarding.json';
import haOnboarding from '../../public/locales/ha/onboarding.json';
import yoOnboarding from '../../public/locales/yo/onboarding.json';
import amOnboarding from '../../public/locales/am/onboarding.json';
import zuOnboarding from '../../public/locales/zu/onboarding.json';
import koOnboarding from '../../public/locales/ko/onboarding.json';

const resources = {
  en: { 
    common: enCommon,
    onboarding: enOnboarding
  },
  es: { 
    common: esCommon,
    onboarding: esOnboarding
  },
  fr: { 
    common: frCommon,
    onboarding: frOnboarding
  },
  pt: { 
    common: ptCommon,
    onboarding: ptOnboarding
  },
  de: { 
    common: deCommon,
    onboarding: deOnboarding
  },
  zh: { 
    common: zhCommon,
    onboarding: zhOnboarding
  },
  ar: { 
    common: arCommon,
    onboarding: arOnboarding
  },
  hi: { 
    common: hiCommon,
    onboarding: hiOnboarding
  },
  ru: { 
    common: ruCommon,
    onboarding: ruOnboarding
  },
  ja: { 
    common: jaCommon,
    onboarding: jaOnboarding
  },
  sw: { 
    common: swCommon,
    onboarding: swOnboarding
  },
  tr: { 
    common: trCommon,
    onboarding: trOnboarding
  },
  id: { 
    common: idCommon,
    onboarding: idOnboarding
  },
  vi: { 
    common: viCommon,
    onboarding: viOnboarding
  },
  nl: { 
    common: nlCommon,
    onboarding: nlOnboarding
  },
  ha: { 
    common: haCommon,
    onboarding: haOnboarding
  },
  yo: { 
    common: yoCommon,
    onboarding: yoOnboarding
  },
  am: { 
    common: amCommon,
    onboarding: amOnboarding
  },
  zu: { 
    common: zuCommon,
    onboarding: zuOnboarding
  },
  ko: { 
    common: koCommon,
    onboarding: koOnboarding
  }
};

i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    ns: ['common', 'onboarding'],
    defaultNS: 'common',
    fallbackLng: 'en',
    detection: {
      order: ['localStorage', 'cookie', 'navigator'],
      caches: ['localStorage', 'cookie'],
    },
    interpolation: {
      escapeValue: false // React already protects from XSS
    }
  });

export function LanguageProvider({ children }) {
  const { i18n } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const [cookies, setCookie] = useCookies(['i18nextLng']);

  useEffect(() => {
    if (i18n.language) {
      setCookie('i18nextLng', i18n.language, { path: '/' });
      
      // Update HTML lang attribute and text direction for RTL languages
      document.documentElement.lang = i18n.language;
      document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    }
  }, [i18n.language, setCookie]);

  return children;
}