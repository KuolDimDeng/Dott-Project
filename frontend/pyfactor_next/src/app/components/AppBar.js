'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { LanguageIcon } from '@/app/components/icons';
import AuthButton from '@/components/AuthButton';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

// Simplified language list
const supportedLanguages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'zh', name: '中文' },
  { code: 'ar', name: 'العربية' }
];

export default function AppBar() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const toggleLanguageMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLanguageChange = (language) => {
    i18n.changeLanguage(language.code);
    localStorage.setItem('userLanguage', language.code);
    setIsMenuOpen(false);
  };

  return (
    <nav className="flex items-center justify-between px-4 sm:px-8 py-2 bg-white shadow-md sticky top-0 left-0 right-0 z-50">
      {/* Logo */}
      <div
        className="flex items-center cursor-pointer"
        onClick={() => router.push('/')}
      >
        <img
          src="/static/images/PyfactorLandingpage.png"
          alt="Dott Logo"
          width={150}
          height={50}
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

      {/* Right Side Controls */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Language Selector */}
        <div className="relative" ref={menuRef}>
          <button
            className="flex items-center space-x-1 px-2 py-1 text-gray-700 hover:text-primary-main transition-colors duration-150"
            onClick={toggleLanguageMenu}
            aria-label="Change language"
          >
            <LanguageIcon className="h-5 w-5" />
            <span className="hidden sm:inline text-sm font-medium">
              {supportedLanguages.find(lang => lang.code === i18n.language)?.name || 'English'}
            </span>
          </button>

          {/* Simple Language Dropdown */}
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
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
        <AuthButton theme="light" />
      </div>
    </nav>
  );
}