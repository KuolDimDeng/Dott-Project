'use client';

import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import i18n from '@/i18n';

export default function TestTranslationPage() {
  const { t, i18n: i18nInstance } = useTranslation('navigation');
  const [currentLang, setCurrentLang] = useState(i18n.language);
  const [rerenderCount, setRerenderCount] = useState(0);

  useEffect(() => {
    const handleLanguageChange = () => {
      console.log('Language changed to:', i18n.language);
      setCurrentLang(i18n.language);
      setRerenderCount(prev => prev + 1);
    };

    window.addEventListener('languageChange', handleLanguageChange);
    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      window.removeEventListener('languageChange', handleLanguageChange);
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, []);

  const testLanguages = ['en', 'es', 'fr', 'pt', 'zh'];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Translation Test Page</h1>
      
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <p className="mb-2"><strong>Current Language:</strong> {currentLang}</p>
        <p className="mb-2"><strong>i18n.language:</strong> {i18n.language}</p>
        <p className="mb-2"><strong>Rerender Count:</strong> {rerenderCount}</p>
        <p><strong>i18n ready:</strong> {i18n.isInitialized ? 'Yes' : 'No'}</p>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3">Language Switcher</h2>
        <div className="flex gap-2">
          {testLanguages.map(lang => (
            <button
              key={lang}
              onClick={() => {
                console.log('Changing language to:', lang);
                i18n.changeLanguage(lang);
              }}
              className={`px-4 py-2 rounded ${
                currentLang === lang 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3">Status Translations Test</h2>
        <div className="space-y-2">
          <p><strong>status.title:</strong> {t('status.title')}</p>
          <p><strong>status.subtitle:</strong> {t('status.subtitle')}</p>
          <p><strong>status.refresh:</strong> {t('status.refresh')}</p>
          <p><strong>status.overall.operational:</strong> {t('status.overall.operational')}</p>
          <p><strong>status.serviceStatus.title:</strong> {t('status.serviceStatus.title')}</p>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3">Raw Translation Function Test</h2>
        <div className="space-y-2">
          <p>Direct t() call: {t('mainMenu.dashboard')}</p>
          <p>With namespace: {t('navigation:mainMenu.dashboard')}</p>
          <p>Fallback test: {t('nonexistent.key', 'Fallback text')}</p>
        </div>
      </div>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="font-semibold mb-2">Debug Info</h3>
        <pre className="text-xs overflow-auto">
          {JSON.stringify({
            language: i18n.language,
            languages: i18n.languages,
            namespaces: i18n.options.ns,
            defaultNS: i18n.options.defaultNS,
            hasNavigationNamespace: i18n.hasResourceBundle(i18n.language, 'navigation'),
            statusTitleExists: i18n.exists('navigation:status.title')
          }, null, 2)}
        </pre>
      </div>
    </div>
  );
}