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
    <h2 className={`font-bold text-blue-700 ${isMobile ? 'text-lg' : 'text-xl'} mt-8 mb-4`}>
      {children}
    </h2>
  );

  const SectionContent = ({ children }) => (
    <p className="mb-6 leading-relaxed text-gray-600">
      {children}
    </p>
  );
  
  const SubsectionTitle = ({ children }) => (
    <h3 className={`font-bold text-gray-800 mt-4 mb-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
      {children}
    </h3>
  );

  const cookieSections = [
    {
      title: t('cookiePolicy.sections.whatAreCookies.title'),
      content: t('cookiePolicy.sections.whatAreCookies.content'),
    },
    {
      title: t('cookiePolicy.sections.howWeUseCookies.title'),
      content: t('cookiePolicy.sections.howWeUseCookies.content'),
      subsections: [
        {
          title: t('cookiePolicy.sections.howWeUseCookies.essential.title'),
          content: t('cookiePolicy.sections.howWeUseCookies.essential.content')
        },
        {
          title: t('cookiePolicy.sections.howWeUseCookies.functional.title'),
          content: t('cookiePolicy.sections.howWeUseCookies.functional.content')
        },
        {
          title: t('cookiePolicy.sections.howWeUseCookies.analytics.title'),
          content: t('cookiePolicy.sections.howWeUseCookies.analytics.content')
        },
        {
          title: t('cookiePolicy.sections.howWeUseCookies.marketing.title'),
          content: t('cookiePolicy.sections.howWeUseCookies.marketing.content')
        }
      ]
    },
    {
      title: t('cookiePolicy.sections.specificCookies.title'),
      content: t('cookiePolicy.sections.specificCookies.content'),
      subsections: [
        {
          title: t('cookiePolicy.sections.specificCookies.session.title'),
          content: t('cookiePolicy.sections.specificCookies.session.content')
        },
        {
          title: t('cookiePolicy.sections.specificCookies.persistent.title'),
          content: t('cookiePolicy.sections.specificCookies.persistent.content')
        },
        {
          title: t('cookiePolicy.sections.specificCookies.thirdParty.title'),
          content: t('cookiePolicy.sections.specificCookies.thirdParty.content')
        }
      ]
    },
    {
      title: t('cookiePolicy.sections.cookieDuration.title'),
      content: t('cookiePolicy.sections.cookieDuration.content'),
    },
    {
      title: t('cookiePolicy.sections.managingCookies.title'),
      content: t('cookiePolicy.sections.managingCookies.content'),
      subsections: [
        {
          title: t('cookiePolicy.sections.managingCookies.browserSettings.title'),
          content: t('cookiePolicy.sections.managingCookies.browserSettings.content')
        },
        {
          title: t('cookiePolicy.sections.managingCookies.preferenceTool.title'),
          content: t('cookiePolicy.sections.managingCookies.preferenceTool.content')
        },
        {
          title: t('cookiePolicy.sections.managingCookies.impact.title'),
          content: t('cookiePolicy.sections.managingCookies.impact.content')
        }
      ]
    },
    {
      title: t('cookiePolicy.sections.updates.title'),
      content: t('cookiePolicy.sections.updates.content'),
    },
    {
      title: t('cookiePolicy.sections.contactUs.title'),
      content: t('cookiePolicy.sections.contactUs.content'),
    },
  ];

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
          {t('cookiePolicy.backToHome')}
        </button>
        
        <div 
          onClick={() => router.push('/')} 
          className="cursor-pointer flex items-center"
        >
          <Image
            src="/static/images/PyfactorLandingpage.png"
            alt="Pyfactor Logo"
            width={120}
            height={50}
            style={{ objectFit: 'contain' }}
          />
        </div>
      </div>
      
      <div className="mt-4 mb-12 bg-white rounded-lg shadow-lg p-6 sm:p-10">
        <h1 className={`text-center font-bold ${isMobile ? 'text-2xl' : 'text-3xl'} mb-2`}>
          {t('cookiePolicy.title')}
        </h1>

        <p className="text-center text-gray-600 mb-8">
          {t('cookiePolicy.effectiveDate', { date: '7/24/2025' })}
        </p>

        <hr className="mb-8 border-t border-gray-200" />

        <p className="mb-6 leading-relaxed text-gray-600">
          {t('cookiePolicy.introduction')}
        </p>

        <ul className="space-y-6">
          {cookieSections.map((section, index) => (
            <li key={index} className="py-4">
              <SectionTitle>{section.title}</SectionTitle>
              <SectionContent>{section.content}</SectionContent>
              
              {section.subsections && section.subsections.map((subsection, subIndex) => (
                <div key={subIndex} className="w-full mb-4">
                  <SubsectionTitle>{subsection.title}</SubsectionTitle>
                  <SectionContent>{subsection.content}</SectionContent>
                </div>
              ))}
              
              {index !== cookieSections.length - 1 && <hr className="w-full mt-4 border-t border-gray-200" />}
            </li>
          ))}
        </ul>

        <div className="bg-gray-50 p-6 rounded-md border border-gray-200 mt-8">
          <address className="not-italic text-sm">
            <strong>{t('cookiePolicy.companyName')}</strong>
            <br />
            {t('cookiePolicy.address.street')}
            <br />
            {t('cookiePolicy.address.suite')}
            <br />
            {t('cookiePolicy.address.city')}
            <br />
            {t('cookiePolicy.address.country')}            
            <br />
            {t('cookiePolicy.email')}: support@dottapps.com
            <br />
            {t('cookiePolicy.website')}: www.dottapps.com
          </address>
        </div>
      </div>
    </div>
  );
}

export default function CookiePolicy() {
  return (
    <I18nextProvider i18n={i18nInstance}>
      <CookiePolicyContent />
    </I18nextProvider>
  );
}