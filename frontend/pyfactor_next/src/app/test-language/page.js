'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { detectUserCountry, getLanguageForCountry } from '@/services/countryDetectionService';

export default function TestLanguagePage() {
  const { t, i18n } = useTranslation();
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    async function checkLanguageState() {
      const country = await detectUserCountry();
      const mappedLanguage = getLanguageForCountry(country);
      
      setDebugInfo({
        detectedCountry: country,
        mappedLanguage: mappedLanguage,
        currentLanguage: i18n.language,
        availableLanguages: i18n.languages,
        localStorage: {
          i18nextLng: localStorage.getItem('i18nextLng'),
          userManuallySelectedLanguage: localStorage.getItem('userManuallySelectedLanguage'),
          detected_country: localStorage.getItem('detected_country')
        },
        translations: {
          welcome: t('welcome'),
          features: t('features'),
          pricing: t('pricing')
        }
      });
    }
    
    checkLanguageState();
  }, [i18n.language, t]);

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Language Detection Test</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Debug Information:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
        
        <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Test Translations:</h2>
          <ul className="space-y-2">
            <li><strong>Welcome:</strong> {t('welcome')}</li>
            <li><strong>Features:</strong> {t('features')}</li>
            <li><strong>Pricing:</strong> {t('pricing')}</li>
            <li><strong>Contact:</strong> {t('contact')}</li>
            <li><strong>About:</strong> {t('about')}</li>
          </ul>
        </div>
        
        <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Actions:</h2>
          <div className="space-x-4">
            <button 
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Clear All Storage & Reload
            </button>
            <button 
              onClick={() => {
                i18n.changeLanguage('sw');
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Force Swahili
            </button>
            <button 
              onClick={() => {
                i18n.changeLanguage('en');
              }}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Force English
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}