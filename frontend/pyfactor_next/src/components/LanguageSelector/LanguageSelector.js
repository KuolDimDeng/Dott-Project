'use client';

// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/components/LanguageSelector/LanguageSelector.js

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { saveLanguagePreference, getLanguagePreference } from '@/utils/userPreferences';

// Language data with native names (all 20 supported languages)
const languages = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'es', name: 'Spanish', native: 'Español' },
  { code: 'fr', name: 'French', native: 'Français' },
  { code: 'de', name: 'German', native: 'Deutsch' },
  { code: 'pt', name: 'Portuguese', native: 'Português' },
  { code: 'nl', name: 'Dutch', native: 'Nederlands' },
  { code: 'ru', name: 'Russian', native: 'Русский' },
  { code: 'zh', name: 'Chinese', native: '中文' },
  { code: 'ja', name: 'Japanese', native: '日本語' },
  { code: 'ko', name: 'Korean', native: '한국어' },
  { code: 'ar', name: 'Arabic', native: 'العربية' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia' },
  { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt' },
  { code: 'tr', name: 'Turkish', native: 'Türkçe' },
  { code: 'sw', name: 'Swahili', native: 'Kiswahili' },
  { code: 'ha', name: 'Hausa', native: 'Hausa' },
  { code: 'am', name: 'Amharic', native: 'አማርኛ' },
  { code: 'yo', name: 'Yoruba', native: 'Yorùbá' },
  { code: 'zu', name: 'Zulu', native: 'isiZulu' },
];

export default function LanguageSelector() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentLang, setCurrentLang] = useState(() => {
    return languages.find(lang => lang.code === i18n.language) || languages[0];
  });
  
  const dropdownRef = useRef(null);
  
  // Initialize language from Cognito on mount
  useEffect(() => {
    async function initializeLanguage() {
      try {
        const langCode = await getLanguagePreference();
        if (langCode && langCode !== i18n.language) {
          const lang = languages.find(l => l.code === langCode);
          if (lang) {
            i18n.changeLanguage(langCode);
            setCurrentLang(lang);
          }
        }
      } catch (error) {
        console.error('Error initializing language from Cognito:', error);
      }
    }
    
    initializeLanguage();
  }, []);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Handle language change
  const changeLanguage = async (lang) => {
    i18n.changeLanguage(lang.code);
    setCurrentLang(lang);
    setIsOpen(false);
    setSearchTerm('');
    
    // Dispatch an event for other components that need to know about language changes
    window.dispatchEvent(new CustomEvent('languageChange', { detail: { language: lang.code } }));
    
    // Save preference to Cognito
    try {
      await saveLanguagePreference(lang.code);
    } catch (e) {
      console.error('Failed to save language preference to Cognito:', e);
    }
  };
  
  // Filter languages based on search term
  const filteredLanguages = languages.filter(lang => 
    lang.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    lang.native.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Language selector button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 focus:outline-none"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="hidden md:inline">{currentLang.native}</span>
        <svg
          className={`h-5 w-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50">
          <div className="p-2">
            {/* Search input */}
            <div className="relative mb-2">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-primary-light focus:border-primary-light sm:text-sm"
                placeholder={t('language.search', 'Search languages...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Language list */}
            <div className="max-h-60 overflow-y-auto">
              {filteredLanguages.length > 0 ? (
                <ul className="py-1">
                  {filteredLanguages.map((lang) => (
                    <li key={lang.code}>
                      <button
                        onClick={() => changeLanguage(lang)}
                        className={`flex items-center w-full px-4 py-2 text-sm focus:outline-none ${
                          currentLang.code === lang.code
                            ? 'bg-primary-light/10 text-primary-main dark:bg-primary-dark/20 dark:text-primary-light'
                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <span>{lang.native}</span>
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({lang.name})</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="py-2 px-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                  {t('language.noResults', 'No languages found')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}