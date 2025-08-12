'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { I18nextProvider } from 'react-i18next';
import i18nInstance from '@/i18n';

function CookiePolicyContent() {
  const router = useRouter();
  const { t } = useTranslation();
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Check if screen is mobile size
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    // Initial check
    checkIfMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  const SectionTitle = ({ children }) => (
    <h2 className={`font-bold text-blue-700 ${isMobile ? 'text-lg' : 'text-xl'} mt-6 mb-4`}>
      {children}
    </h2>
  );

  const SectionContent = ({ children }) => (
    <p className="mb-4 leading-relaxed text-gray-600">
      {children}
    </p>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6">
      <div className="flex justify-between items-center mt-8">
        <button 
          onClick={() => router.push('/')}
          className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mb-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t('cookiePolicy.navigation.backToHome')}
        </button>
        
        <div 
          onClick={() => router.push('/')} 
          className="cursor-pointer flex items-center"
        >
          <Image
            src="/static/images/PyfactorLandingpage.png"
            alt="Dott Logo"
            width={120}
            height={50}
            style={{ objectFit: 'contain' }}
          />
        </div>
      </div>
      
      <div className="mt-4 mb-12 bg-white rounded-lg shadow-lg p-6 sm:p-10">
        <h1 className={`text-center font-bold ${isMobile ? 'text-2xl' : 'text-3xl'} mb-3`}>
          {t('cookiePolicy.title')}
        </h1>

        <p className="text-center text-gray-600 mb-6">
          {t('cookiePolicy.effectiveDate', { date: new Date().toLocaleDateString() })}
        </p>

        <hr className="my-6 border-t border-gray-200" />

        <SectionContent>
          {t('cookiePolicy.introduction')}
        </SectionContent>

        <SectionTitle>{t('cookiePolicy.sections.whatAreCookies.title')}</SectionTitle>
        <SectionContent>
          {t('cookiePolicy.sections.whatAreCookies.content')}
        </SectionContent>

        <SectionTitle>{t('cookiePolicy.sections.howWeUseCookies.title')}</SectionTitle>
        <SectionContent>
          {t('cookiePolicy.sections.howWeUseCookies.content')}
        </SectionContent>

        <SectionTitle>{t('cookiePolicy.sections.typesOfCookies.title')}</SectionTitle>
        <SectionContent>
          {t('cookiePolicy.sections.typesOfCookies.content')}
        </SectionContent>
        
        <div className="ml-6 mb-4">
          <h3 className="font-semibold mb-2">{t('cookiePolicy.sections.typesOfCookies.essential.title')}</h3>
          <p className="mb-4 text-gray-600">{t('cookiePolicy.sections.typesOfCookies.essential.content')}</p>
          
          <h3 className="font-semibold mb-2">{t('cookiePolicy.sections.typesOfCookies.functional.title')}</h3>
          <p className="mb-4 text-gray-600">{t('cookiePolicy.sections.typesOfCookies.functional.content')}</p>
          
          <h3 className="font-semibold mb-2">{t('cookiePolicy.sections.typesOfCookies.analytics.title')}</h3>
          <p className="mb-4 text-gray-600">{t('cookiePolicy.sections.typesOfCookies.analytics.content')}</p>
          
          <h3 className="font-semibold mb-2">{t('cookiePolicy.sections.typesOfCookies.marketing.title')}</h3>
          <p className="mb-4 text-gray-600">{t('cookiePolicy.sections.typesOfCookies.marketing.content')}</p>
        </div>

        <SectionTitle>{t('cookiePolicy.sections.managingCookies.title')}</SectionTitle>
        <SectionContent>
          {t('cookiePolicy.sections.managingCookies.content')}
        </SectionContent>

        <SectionTitle>{t('cookiePolicy.sections.thirdPartyCookies.title')}</SectionTitle>
        <SectionContent>
          {t('cookiePolicy.sections.thirdPartyCookies.content')}
        </SectionContent>

        <SectionTitle>{t('cookiePolicy.sections.changes.title')}</SectionTitle>
        <SectionContent>
          {t('cookiePolicy.sections.changes.content')}
        </SectionContent>

        <SectionTitle>{t('cookiePolicy.sections.contact.title')}</SectionTitle>
        <SectionContent>
          {t('cookiePolicy.sections.contact.content')}
        </SectionContent>
        
        <div className="pl-4 border-l-4 border-blue-700 mt-4 text-gray-700 italic">
          <address className="not-italic text-sm">
            {t('cookiePolicy.contactInfo.company')}
            <br />
            {t('cookiePolicy.contactInfo.email')}
            <br />
            {t('cookiePolicy.contactInfo.website')}
          </address>
        </div>
      </div>
    </div>
  );
}

const CookiePolicy = () => {
  return (
    <I18nextProvider i18n={i18nInstance}>
      <CookiePolicyContent />
    </I18nextProvider>
  );
};

export default CookiePolicy;