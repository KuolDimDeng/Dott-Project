'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import AuthButton from '@/components/AuthButton';

// Public landing page navbar
export default function AppBar() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // List of supported languages
  const supportedLanguages = [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' },
    { code: 'es', name: 'Español' },
    { code: 'de', name: 'Deutsch' },
    { code: 'vi', name: 'Tiếng Việt' },
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
  
  const handleLanguageChange = (language) => {
    i18n.changeLanguage(language.code);
    setIsMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <div
              className="cursor-pointer"
              onClick={() => router.push('/')}
            >
              <img
                src="/static/images/PyfactorLandingpage.png"
                alt="PyFactor Logo"
                width={150}
                height={50}
                className="h-12 w-auto object-contain"
              />
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex md:items-center md:space-x-6">
            <button 
              className="px-3 py-2 text-gray-700 hover:text-blue-600 font-medium transition-colors duration-150"
              onClick={() => router.push('/features')}
            >
              {t('navFeatures', 'Features')}
            </button>
            <button 
              className="px-3 py-2 text-gray-700 hover:text-blue-600 font-medium transition-colors duration-150"
              onClick={() => router.push('/pricing')}
            >
              {t('navPricing', 'Pricing')}
            </button>
            <button 
              className="px-3 py-2 text-gray-700 hover:text-blue-600 font-medium transition-colors duration-150"
              onClick={() => router.push('/about')}
            >
              {t('navAbout', 'About')}
            </button>
            <button 
              className="px-3 py-2 text-gray-700 hover:text-blue-600 font-medium transition-colors duration-150"
              onClick={() => router.push('/contact')}
            >
              {t('navContact', 'Contact')}
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
          <button
            className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100"
            onClick={() => {
              router.push('/features');
              setIsMobileMenuOpen(false);
            }}
          >
            {t('navFeatures', 'Features')}
          </button>
          <button
            className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100"
            onClick={() => {
              router.push('/pricing');
              setIsMobileMenuOpen(false);
            }}
          >
            {t('navPricing', 'Pricing')}
          </button>
          <button
            className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100"
            onClick={() => {
              router.push('/about');
              setIsMobileMenuOpen(false);
            }}
          >
            {t('navAbout', 'About')}
          </button>
          <button
            className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100"
            onClick={() => {
              router.push('/contact');
              setIsMobileMenuOpen(false);
            }}
          >
            {t('navContact', 'Contact')}
          </button>
        </div>
      </div>
    </nav>
  );
}