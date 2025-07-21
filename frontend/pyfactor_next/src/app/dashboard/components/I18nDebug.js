'use client';

import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import i18n from '@/i18n';

export default function I18nDebug() {
  const { t, i18n: hookI18n, ready } = useTranslation('navigation');
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    const updateDebugInfo = () => {
      setDebugInfo({
        currentLanguage: i18n.language,
        hookLanguage: hookI18n.language,
        isInitialized: i18n.isInitialized,
        ready,
        hasNavigationNamespace: i18n.hasResourceBundle(i18n.language, 'navigation'),
        statusTitleExists: i18n.exists('navigation:status.title'),
        testTranslation: t('status.title'),
        rawTranslation: i18n.t('navigation:status.title'),
        availableLanguages: i18n.languages,
        loadedNamespaces: i18n.options.ns,
        resourceKeys: Object.keys(i18n.store.data[i18n.language] || {})
      });
    };

    updateDebugInfo();
    
    // Update on language change
    const handleChange = () => updateDebugInfo();
    i18n.on('languageChanged', handleChange);
    
    return () => {
      i18n.off('languageChanged', handleChange);
    };
  }, [t, hookI18n, ready]);

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-black text-white text-xs rounded shadow-lg max-w-md z-50">
      <h3 className="font-bold mb-2">i18n Debug Info</h3>
      <pre className="overflow-auto max-h-64">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
      <button 
        onClick={() => {
          console.log('Full i18n state:', {
            i18n,
            store: i18n.store,
            data: i18n.store.data,
            options: i18n.options
          });
        }}
        className="mt-2 px-2 py-1 bg-blue-600 rounded text-xs"
      >
        Log Full State
      </button>
    </div>
  );
}