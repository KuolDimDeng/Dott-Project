'use client';


import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { saveLanguagePreference, getLanguagePreference } from '@/utils/userPreferences';
import { setCacheValue } from '@/utils/appCache';
import AuthButton from '@/components/AuthButton';

// Public landing page navbar
export default function AppBar() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  
  // Debug language state
  useEffect(() => {
    console.log('🌐 AppBar - Current language:', i18n.language);
    console.log('🌐 AppBar - Available languages:', i18n.languages);
  }, [i18n.language]);
  
  // Initialize language from user preferences on component mount
  useEffect(() => {
    async function initializeLanguageFromPreferences() {
      try {
        // Check if user has manually selected a language
        const manuallySelected = localStorage.getItem('i18nextLng');
        const userDidManuallySelect = localStorage.getItem('userManuallySelectedLanguage');
        
        // Only respect the stored language if user actually clicked the language selector
        if (manuallySelected && userDidManuallySelect === 'true') {
          console.log('📌 User has manually selected language:', manuallySelected);
          return; // Don't override manual selection
        }
        
        // Otherwise, try to get from saved preferences
        const savedLanguage = await getLanguagePreference();
        if (savedLanguage && savedLanguage !== i18n.language) {
          const langExists = supportedLanguages.find(lang => lang.code === savedLanguage);
          if (langExists) {
            await i18n.changeLanguage(savedLanguage);
            console.log('✅ Initialized language from user preferences:', savedLanguage);
          }
        }
      } catch (error) {
        console.error('❌ Error initializing language from user preferences:', error);
      }
    }
    
    initializeLanguageFromPreferences();
  }, []);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // List of supported languages
  const supportedLanguages = [
    {
        "code": "en",
        "name": "English",
        "native": "English",
        "flag": "🇺🇸"
    },
    {
        "code": "es",
        "name": "Spanish",
        "native": "Español",
        "flag": "🇪🇸"
    },
    {
        "code": "fr",
        "name": "French",
        "native": "Français",
        "flag": "🇫🇷"
    },
    {
        "code": "pt",
        "name": "Portuguese",
        "native": "Português",
        "flag": "🇵🇹"
    },
    {
        "code": "de",
        "name": "German",
        "native": "Deutsch",
        "flag": "🇩🇪"
    },
    {
        "code": "zh",
        "name": "Chinese",
        "native": "中文",
        "flag": "🇨🇳"
    },
    {
        "code": "ar",
        "name": "Arabic",
        "native": "العربية",
        "flag": "🇸🇦"
    },
    {
        "code": "hi",
        "name": "Hindi",
        "native": "हिन्दी",
        "flag": "🇮🇳"
    },
    {
        "code": "ru",
        "name": "Russian",
        "native": "Русский",
        "flag": "🇷🇺"
    },
    {
        "code": "ja",
        "name": "Japanese",
        "native": "日本語",
        "flag": "🇯🇵"
    },
    {
        "code": "sw",
        "name": "Swahili",
        "native": "Kiswahili",
        "flag": "🇰🇪"
    },
    {
        "code": "tr",
        "name": "Turkish",
        "native": "Türkçe",
        "flag": "🇹🇷"
    },
    {
        "code": "id",
        "name": "Indonesian",
        "native": "Bahasa Indonesia",
        "flag": "🇮🇩"
    },
    {
        "code": "vi",
        "name": "Vietnamese",
        "native": "Tiếng Việt",
        "flag": "🇻🇳"
    },
    {
        "code": "nl",
        "name": "Dutch",
        "native": "Nederlands",
        "flag": "🇳🇱"
    },
    {
        "code": "ha",
        "name": "Hausa",
        "native": "Hausa",
        "flag": "🇳🇬"
    },
    {
        "code": "yo",
        "name": "Yoruba",
        "native": "Yorùbá",
        "flag": "🇳🇬"
    },
    {
        "code": "am",
        "name": "Amharic",
        "native": "አማርኛ",
        "flag": "🇪🇹"
    },
    {
        "code": "zu",
        "name": "Zulu",
        "native": "isiZulu",
        "flag": "🇿🇦"
    },
    {
        "code": "ko",
        "name": "Korean",
        "native": "한국어",
        "flag": "🇰🇷"
    }
];

  // Handle clicks outside of the language menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleLanguageMenu = () => setIsMenuOpen(!isMenuOpen);
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  
  const handleLanguageChange = async (language) => {
    try {
      // Change the language in i18n
      await i18n.changeLanguage(language.code);
      setIsMenuOpen(false);
      
      // Mark that user manually selected a language
      localStorage.setItem('userManuallySelectedLanguage', 'true');
      
      // Save language preference to user preferences
      try {
        await saveLanguagePreference(language.code);
        
        // Also store in AppCache for faster access
        setCacheValue('user_pref_custom:language', language.code);
        
        console.log('✅ Language preference saved to user preferences:', language.code);
      } catch (error) {
        console.error('❌ Failed to save language preference to user preferences:', error);
        // Continue with language change even if saving fails
      }
      
      // Update HTML lang attribute and text direction for RTL languages
      if (typeof document !== 'undefined') {
        document.documentElement.lang = language.code;
        document.documentElement.dir = ['ar', 'he', 'fa', 'ur'].includes(language.code) ? 'rtl' : 'ltr';
        
        // Force re-render by dispatching a custom event
        window.dispatchEvent(new Event('languageChange'));
      }
    } catch (error) {
      console.error('❌ Error changing language:', error);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 md:h-22">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <div
              className="cursor-pointer"
              onClick={() => router.push('/')}
            >
              <img
                src="/static/images/PyfactorLandingpage.png"
                alt="PyFactor Logo"
                width={270}
                height={90}
                className="h-14 md:h-20 w-auto object-contain"
              />
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex md:items-center md:space-x-6">
            <a 
              href="#features"
              className="px-3 py-3 text-gray-700 hover:text-blue-600 font-medium transition-colors duration-150 leading-normal"
            >
              {t('navFeatures', 'Features')}
            </a>
            <a 
              href="#pricing"
              className="px-3 py-3 text-gray-700 hover:text-blue-600 font-medium transition-colors duration-150 leading-normal"
            >
              {t('navPricing', 'Pricing')}
            </a>
            <button 
              className="px-3 py-3 text-gray-700 hover:text-blue-600 font-medium transition-colors duration-150 leading-normal"
              onClick={() => router.push('/about')}
            >
              {t('navAbout', 'About')}
            </button>
            <a 
              href="#contact"
              className="px-3 py-3 text-gray-700 hover:text-blue-600 font-medium transition-colors duration-150 leading-normal"
              onClick={(e) => {
                e.preventDefault();
                const contactSection = document.getElementById('contact');
                if (contactSection) {
                  contactSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              {t('navContact', 'Contact')}
            </a>
            <button 
              className="px-3 py-3 text-gray-700 hover:text-blue-600 font-medium transition-colors duration-150 leading-normal"
              onClick={() => router.push('/status')}
            >
              {t('navStatus', 'Status')}
            </button>
          </div>

          {/* Right Side Controls */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Language Selector */}
            <div className="relative" ref={menuRef}>
              <button
                className="flex items-center space-x-1 px-2 py-1 text-gray-700 hover:text-blue-600 transition-colors duration-150"
                onClick={toggleLanguageMenu}
                aria-label="Change language"
              >
                <svg 
                  className="h-5 w-5" 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                <span className="hidden sm:inline text-sm font-medium">
                  {supportedLanguages.find(lang => lang.code === i18n.language)?.name || 'English'}
                </span>
              </button>

              {/* Language Dropdown */}
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5">
                  {supportedLanguages.map(language => (
                    <button
                      key={language.code}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => handleLanguageChange(language)}
                    >
                      {language.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sign In Button */}
            <button
              onClick={() => router.push('/auth/signin')}
              className="px-4 py-2 text-sm font-semibold text-blue-600 hover:text-blue-700 uppercase tracking-wider rounded-md border border-blue-600 hover:bg-blue-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-opacity-50"
            >
              SIGN IN
            </button>

            {/* Auth Button */}
            <AuthButton />

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                type="button"
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-blue-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                onClick={toggleMobileMenu}
                aria-expanded="false"
              >
                <span className="sr-only">Open main menu</span>
                {/* Icon for menu (three lines) */}
                <svg
                  className={`${isMobileMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                {/* Icon for closing menu (X) */}
                <svg
                  className={`${isMobileMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu, show/hide based on menu state */}
      <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden bg-white shadow-lg`}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <a
            href="#features"
            className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            {t('navFeatures', 'Features')}
          </a>
          <a
            href="#pricing"
            className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            {t('navPricing', 'Pricing')}
          </a>
          <button
            className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100"
            onClick={() => {
              router.push('/about');
              setIsMobileMenuOpen(false);
            }}
          >
            {t('navAbout', 'About')}
          </button>
          <a
            href="#contact"
            className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100"
            onClick={(e) => {
              e.preventDefault();
              const contactSection = document.getElementById('contact');
              if (contactSection) {
                contactSection.scrollIntoView({ behavior: 'smooth' });
              }
              setIsMobileMenuOpen(false);
            }}
          >
            {t('navContact', 'Contact')}
          </a>
          <button
            className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100"
            onClick={() => {
              router.push('/status');
              setIsMobileMenuOpen(false);
            }}
          >
            {t('navStatus', 'Status')}
          </button>
        </div>
      </div>
    </nav>
  );
}