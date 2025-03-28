'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../../i18n';

// Language options with native names
const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'pt', name: 'Português' },
  { code: 'de', name: 'Deutsch' },
  { code: 'zh', name: '中文' },
  { code: 'ar', name: 'العربية' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'ru', name: 'Русский' },
  { code: 'ja', name: '日本語' },
  { code: 'sw', name: 'Kiswahili' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'ha', name: 'Hausa' },
  { code: 'yo', name: 'Yorùbá' },
  { code: 'am', name: 'አማርኛ' },
  { code: 'zu', name: 'isiZulu' },
  { code: 'ko', name: '한국어' }
];

export default function DashboardLanguageSelector() {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(
    languages.find(lang => lang.code === i18n.language) || languages[0]
  );
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef(null);

  // Update current language when i18n language changes
  useEffect(() => {
    const langObj = languages.find(lang => lang.code === i18n.language);
    if (langObj && langObj.code !== currentLanguage.code) {
      setCurrentLanguage(langObj);
    }
  }, [i18n.language, currentLanguage.code]);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuRef]);

  const handleLanguageMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
    setSearchQuery('');
  };

  const handleLanguageChange = (language) => {
    setCurrentLanguage(language);
    i18n.changeLanguage(language.code);
    setIsMenuOpen(false);
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  // Filter languages based on search query
  const filteredLanguages = searchQuery.trim() 
    ? languages.filter(lang => 
        lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lang.code.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : languages;

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="flex items-center text-white hover:bg-white/10 rounded-md px-2 py-1 min-w-[120px]"
        onClick={handleLanguageMenuToggle}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
        </svg>
        <span className="hidden sm:inline">{currentLanguage.name}</span>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isMenuOpen && (
        <div className="absolute right-0 mt-2 w-52 bg-white rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
          <div className="p-2">
            <div className="relative">
              <input
                type="text"
                placeholder={t('searchLanguages', 'Search languages...')}
                className="w-full p-2 pl-8 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={searchQuery}
                onChange={handleSearchChange}
              />
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-4 w-4 text-gray-500 absolute left-2.5 top-3" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          <div className="py-1">
            {filteredLanguages.map((language) => (
              <button 
                key={language.code} 
                onClick={() => handleLanguageChange(language)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 ${
                  currentLanguage.code === language.code ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                }`}
              >
                {language.name}
              </button>
            ))}
            
            {filteredLanguages.length === 0 && (
              <div className="px-4 py-2 text-sm text-gray-500">
                {t('noLanguagesFound', 'No languages found')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}