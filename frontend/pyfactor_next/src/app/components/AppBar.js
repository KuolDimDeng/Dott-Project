'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { LanguageIcon, KeyboardArrowDownIcon, SearchIcon } from '@/app/components/icons';
import AuthButton from '@/components/AuthButton';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import i18nInstance from '../../i18n';
import { getCurrencyFromLanguage } from '@/utils/currencyUtils';

// Language definitions for the supported languages from i18n config
const supportedLanguages = [
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

// Group languages by region for better organization in the dropdown
const languagesByRegion = {
  popular: supportedLanguages.filter(lang =>
    ['en', 'fr', 'es', 'zh', 'ar', 'hi'].includes(lang.code)
  ),
  european: supportedLanguages.filter(lang =>
    ['en', 'fr', 'es', 'pt', 'de', 'nl', 'ru'].includes(lang.code)
  ),
  middleEastNorthAfrica: supportedLanguages.filter(lang =>
    ['ar', 'tr'].includes(lang.code)
  ),
  subSaharanAfrica: supportedLanguages.filter(lang =>
    ['sw', 'am', 'ha', 'yo', 'zu'].includes(lang.code)
  ),
  southAsia: supportedLanguages.filter(lang =>
    ['hi'].includes(lang.code)
  ),
  eastAsia: supportedLanguages.filter(lang =>
    ['zh', 'ja', 'ko'].includes(lang.code)
  ),
  southeastAsia: supportedLanguages.filter(lang =>
    ['vi', 'id'].includes(lang.code)
  )
};

// Flat list of all languages for search functionality - use the supportedLanguages directly
const allLanguages = supportedLanguages;

// Region names for display
const regionNames = {
  popular: 'Most Popular',
  european: 'European',
  middleEastNorthAfrica: 'Middle East & North Africa',
  subSaharanAfrica: 'Sub-Saharan Africa',
  southAsia: 'South Asia',
  eastAsia: 'East Asia',
  southeastAsia: 'Southeast Asia',
  pacific: 'Pacific',
  latinAmerica: 'Latin America (Indigenous)'
};

export default function AppBar() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(allLanguages.find(lang => lang.code === 'en')); // Default to English
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef(null);

  // Function to detect user's language from browser or geolocation
  useEffect(() => {
    const detectUserLanguage = async () => {
      try {
        // First try to get from localStorage if user has a saved preference
        const savedLang = localStorage.getItem('userLanguage') || localStorage.getItem('i18nextLng');
        if (savedLang) {
          const langObj = allLanguages.find(lang => lang.code === savedLang);
          if (langObj) {
            setCurrentLanguage(langObj);
            i18nInstance.changeLanguage(langObj.code);
            
            // Dispatch currency event for the saved language
            const currencyInfo = getCurrencyFromLanguage(langObj.code);
            dispatchCurrencyEvent(langObj.code, currencyInfo);
            
            // Dispatch language change event
            dispatchLanguageEvent(langObj.code, langObj.name);
            
            return;
          }
        }

        // Get browser language
        const browserLang = navigator.language.split('-')[0];
        const matchedLang = allLanguages.find(lang => lang.code === browserLang);
        
        if (matchedLang) {
          setCurrentLanguage(matchedLang);
          i18nInstance.changeLanguage(matchedLang.code);
          localStorage.setItem('userLanguage', matchedLang.code);
          
          // Dispatch currency event for the detected language
          const currencyInfo = getCurrencyFromLanguage(matchedLang.code);
          dispatchCurrencyEvent(matchedLang.code, currencyInfo);
          
          // Dispatch language change event
          dispatchLanguageEvent(matchedLang.code, matchedLang.name);
        }
      } catch (error) {
        console.error('Error detecting language:', error);
      }
    };

    detectUserLanguage();
    
    // Listen for language changes from other components
    const handleLanguageChange = () => {
      const currentLang = i18nInstance.language;
      const langObj = allLanguages.find(lang => lang.code === currentLang);
      if (langObj && langObj.code !== currentLanguage.code) {
        setCurrentLanguage(langObj);
      }
    };
    
    window.addEventListener('languageChange', handleLanguageChange);
    return () => {
      window.removeEventListener('languageChange', handleLanguageChange);
    };
  }, [currentLanguage.code]);

  useEffect(() => {
    // Click outside to close menu
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLanguageMenuOpen = () => {
    setIsMenuOpen(true);
    setSearchQuery('');
  };

  const handleLanguageMenuClose = () => {
    setIsMenuOpen(false);
  };

  // Helper function to dispatch currency change event
  const dispatchCurrencyEvent = (languageCode, currencyInfo) => {
    const currencyEvent = new CustomEvent('currencyChange', {
      detail: {
        languageCode,
        currencyCode: currencyInfo.code,
        currencySymbol: currencyInfo.symbol
      }
    });
    window.dispatchEvent(currencyEvent);
  };
  
  // Helper function to dispatch language change event
  const dispatchLanguageEvent = (languageCode, languageName) => {
    const languageEvent = new CustomEvent('languageChange', {
      detail: {
        languageCode,
        languageName
      }
    });
    window.dispatchEvent(languageEvent);
  };

  const handleLanguageChange = (language) => {
    setCurrentLanguage(language);
    i18nInstance.changeLanguage(language.code);
    localStorage.setItem('userLanguage', language.code);
    
    // Get currency info for the selected language
    const currencyInfo = getCurrencyFromLanguage(language.code);
    
    // Dispatch a custom event with currency information
    dispatchCurrencyEvent(language.code, currencyInfo);
    
    // Dispatch a language change event to update all components
    dispatchLanguageEvent(language.code, language.name);
    
    handleLanguageMenuClose();
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  // Filter languages based on search query
  const filteredLanguages = searchQuery.trim() 
    ? allLanguages.filter(lang => 
        lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lang.code.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  return (
    <nav className="flex items-center justify-between px-4 sm:px-8 py-2 bg-white shadow-md sticky top-0 left-0 right-0 z-50">
      {/* Logo */}
      <div
        className="flex items-center cursor-pointer"
        onClick={() => router.push('/')}
      >
        <Image
          src="/static/images/PyfactorLandingpage.png"
          alt="Dott Logo"
          width={150}
          height={50}
          priority
          className="h-12 w-auto object-contain"
        />
      </div>

      {/* Navigation Links - Hidden on Mobile */}
      <div className="hidden md:flex space-x-6 items-center">
        <button 
          className="px-3 py-2 text-gray-700 hover:text-primary-main font-medium transition-colors duration-150"
          onClick={() => router.push('/features')}
        >
          {t('navFeatures', 'Features')}
        </button>
        <button 
          className="px-3 py-2 text-gray-700 hover:text-primary-main font-medium transition-colors duration-150"
          onClick={() => router.push('/pricing')}
        >
          {t('navPricing', 'Pricing')}
        </button>
        <button 
          className="px-3 py-2 text-gray-700 hover:text-primary-main font-medium transition-colors duration-150"
          onClick={() => router.push('/about')}
        >
          {t('navAbout', 'About')}
        </button>
        <button 
          className="px-3 py-2 text-gray-700 hover:text-primary-main font-medium transition-colors duration-150"
          onClick={() => router.push('/contact')}
        >
          {t('navContact', 'Contact')}
        </button>
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-4">
        {/* Language Selector */}
        <div className="relative" ref={menuRef}>
          <button
            className="flex items-center justify-center space-x-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors duration-150"
            onClick={handleLanguageMenuOpen}
          >
            <LanguageIcon className="h-4 w-4 text-primary-main" />
            <span className="hidden sm:inline-block">
              {currentLanguage?.name || 'English'}
            </span>
            <KeyboardArrowDownIcon className="h-3.5 w-3.5" />
          </button>
          
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl overflow-hidden z-50 border border-gray-100">
              <div className="p-3">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-primary-light text-sm"
                    placeholder={t('languageSearch', 'Search languages...')}
                    value={searchQuery}
                    onChange={handleSearchChange}
                  />
                </div>
              </div>
              
              <div className="max-h-64 overflow-y-auto p-2">
                {filteredLanguages ? (
                  // Show search results
                  <>
                    {filteredLanguages.length > 0 ? (
                      filteredLanguages.map((lang) => (
                        <button
                          key={lang.code}
                          className={`flex items-center w-full text-left px-4 py-2 text-sm hover:bg-gray-50 rounded-md ${
                            currentLanguage.code === lang.code 
                              ? 'bg-primary-light/10 text-primary-main font-medium' 
                              : 'text-gray-700'
                          }`}
                          onClick={() => handleLanguageChange(lang)}
                        >
                          {lang.name}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-sm text-gray-500">
                        {t('noLanguageResults', 'No languages found')}
                      </div>
                    )}
                  </>
                ) : (
                  // Show languages by region
                  Object.entries(languagesByRegion).map(([region, languages]) => (
                    <div key={region} className="mb-3">
                      <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {regionNames[region]}
                      </div>
                      <div className="mt-1">
                        {languages.map((lang) => (
                          <button
                            key={lang.code}
                            className={`flex items-center w-full text-left px-4 py-2 text-sm hover:bg-gray-50 rounded-md ${
                              currentLanguage.code === lang.code 
                                ? 'bg-primary-light/10 text-primary-main font-medium' 
                                : 'text-gray-700'
                            }`}
                            onClick={() => handleLanguageChange(lang)}
                          >
                            {lang.name}
                          </button>
                        ))}
                      </div>
                      <div className="mx-3 my-1 border-t border-gray-100"></div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Auth Button */}
        <AuthButton variant="primary" size="medium" />
      </div>
    </nav>
  );
}