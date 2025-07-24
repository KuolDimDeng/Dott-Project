'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { I18nextProvider } from 'react-i18next';
import i18nInstance from '@/i18n';

const PrivacyPolicyContent = () => {
  const router = useRouter();
  const { t } = useTranslation('privacyPolicy');
  const [fromDashboard, setFromDashboard] = useState(false);
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
    
    // Check for referrer on client side
    if (typeof window !== 'undefined') {
      const referer = document.referrer;
      const isFromDashboard = referer.includes('/dashboard') || sessionStorage.getItem('fromDashboard') === 'true';
      setFromDashboard(isFromDashboard);
      
      // Save the fact that we're in privacy from dashboard
      if (isFromDashboard) {
        sessionStorage.setItem('fromDashboard', 'true');
      }
    }
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);
  
  const handleBackClick = () => {
    try {
      if (fromDashboard) {
        // Clear the fromDashboard flag
        sessionStorage.removeItem('fromDashboard');
        
        // Use direct location navigation which is more reliable for going back to dashboard
        window.location.href = '/dashboard';
      } else {
        // For non-dashboard returns, router.push is fine
        router.push('/');
      }
    } catch (error) {
      console.error("Navigation error:", error);
      // Fallback navigation using direct location method
      window.location.href = fromDashboard ? '/dashboard' : '/';
    }
  };

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

  const privacySections = [
    {
      title: t('sections.scope.title'),
      content: t('sections.scope.content'),
    },
    {
      title: t('sections.personalInfo.title'),
      content: t('sections.personalInfo.content'),
      subsections: [
        {
          title: t('sections.personalInfo.businessInfo.title'),
          content: t('sections.personalInfo.businessInfo.content')
        },
        {
          title: t('sections.personalInfo.individualInfo.title'),
          content: t('sections.personalInfo.individualInfo.content')
        }
      ]
    },
    {
      title: t('sections.categories.title'),
      content: t('sections.categories.content'),
      subsections: [
        {
          title: t('sections.categories.identification.title'),
          content: t('sections.categories.identification.content')
        },
        {
          title: t('sections.categories.financial.title'),
          content: t('sections.categories.financial.content')
        },
        {
          title: t('sections.categories.employee.title'),
          content: t('sections.categories.employee.content')
        },
        {
          title: t('sections.categories.technical.title'),
          content: t('sections.categories.technical.content')
        },
        {
          title: t('sections.categories.customer.title'),
          content: t('sections.categories.customer.content')
        },
        {
          title: t('sections.categories.tax.title'),
          content: t('sections.categories.tax.content')
        }
      ]
    },
    {
      title: t('sections.collection.title'),
      content: t('sections.collection.content'),
      subsections: [
        {
          title: t('sections.collection.direct.title'),
          content: t('sections.collection.direct.content')
        },
        {
          title: t('sections.collection.automated.title'),
          content: t('sections.collection.automated.content')
        },
        {
          title: t('sections.collection.thirdParty.title'),
          content: t('sections.collection.thirdParty.content')
        },
        {
          title: t('sections.collection.financial.title'),
          content: t('sections.collection.financial.content')
        }
      ]
    },
    {
      title: t('sections.usage.title'),
      content: t('sections.usage.content'),
      subsections: [
        {
          title: t('sections.usage.services.title'),
          content: t('sections.usage.services.content')
        },
        {
          title: t('sections.usage.security.title'),
          content: t('sections.usage.security.content')
        },
        {
          title: t('sections.usage.communications.title'),
          content: t('sections.usage.communications.content')
        },
        {
          title: t('sections.usage.compliance.title'),
          content: t('sections.usage.compliance.content')
        },
        {
          title: t('sections.usage.analytics.title'),
          content: t('sections.usage.analytics.content')
        }
      ]
    },
    {
      title: t('sections.sharing.title'),
      content: t('sections.sharing.content'),
      subsections: [
        {
          title: t('sections.sharing.providers.title'),
          content: t('sections.sharing.providers.content')
        },
        {
          title: t('sections.sharing.partners.title'),
          content: t('sections.sharing.partners.content')
        },
        {
          title: t('sections.sharing.authorities.title'),
          content: t('sections.sharing.authorities.content')
        },
        {
          title: t('sections.sharing.transfers.title'),
          content: t('sections.sharing.transfers.content')
        },
        {
          title: t('sections.sharing.consent.title'),
          content: t('sections.sharing.consent.content')
        }
      ]
    },
    {
      title: t('sections.rights.title'),
      content: t('sections.rights.content'),
      subsections: [
        {
          title: t('sections.rights.access.title'),
          content: t('sections.rights.access.content')
        },
        {
          title: t('sections.rights.correction.title'),
          content: t('sections.rights.correction.content')
        },
        {
          title: t('sections.rights.deletion.title'),
          content: t('sections.rights.deletion.content')
        },
        {
          title: t('sections.rights.objection.title'),
          content: t('sections.rights.objection.content')
        },
        {
          title: t('sections.rights.withdraw.title'),
          content: t('sections.rights.withdraw.content')
        },
        {
          title: t('sections.rights.exercise.title'),
          content: t('sections.rights.exercise.content')
        }
      ]
    },
    {
      title: t('sections.security.title'),
      content: t('sections.security.content'),
      subsections: [
        {
          title: t('sections.security.measures.title'),
          content: t('sections.security.measures.content')
        },
        {
          title: t('sections.security.payment.title'),
          content: t('sections.security.payment.content')
        },
        {
          title: t('sections.security.access.title'),
          content: t('sections.security.access.content')
        },
        {
          title: t('sections.security.breach.title'),
          content: t('sections.security.breach.content')
        },
        {
          title: t('sections.security.tax.title'),
          content: t('sections.security.tax.content')
        }
      ]
    },
    {
      title: t('sections.retention.title'),
      content: t('sections.retention.content')
    },
    {
      title: t('sections.transfers.title'),
      content: t('sections.transfers.content')
    },
    {
      title: t('sections.children.title'),
      content: t('sections.children.content')
    },
    {
      title: t('sections.cookies.title'),
      content: t('sections.cookies.content'),
      subsections: [
        {
          title: t('sections.cookies.types.title'),
          content: t('sections.cookies.types.content')
        },
        {
          title: t('sections.cookies.choices.title'),
          content: t('sections.cookies.choices.content')
        }
      ]
    },
    {
      title: t('sections.ai.title'),
      content: t('sections.ai.content'),
      subsections: [
        {
          title: t('sections.ai.features.title'),
          content: t('sections.ai.features.content')
        },
        {
          title: t('sections.ai.advice.title'),
          content: t('sections.ai.advice.content')
        },
        {
          title: t('sections.ai.review.title'),
          content: t('sections.ai.review.content')
        }
      ]
    },
    {
      title: t('sections.changes.title'),
      content: t('sections.changes.content')
    },
    {
      title: t('sections.contact.title'),
      content: t('sections.contact.content')
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6">
      <div className="flex justify-between items-center mt-8">
        <button 
          onClick={handleBackClick}
          className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {fromDashboard ? t('navigation.backToDashboard') : t('navigation.backToHome')}
        </button>
        
        <div 
          onClick={handleBackClick} 
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
        <h1 className={`text-center font-bold ${isMobile ? 'text-2xl' : 'text-3xl'} mb-2`}>
          {t('title')}
        </h1>

        <p className="text-center text-gray-600 mb-8">
          {t('effectiveDate', { date: new Date().toLocaleDateString() })}
        </p>

        <hr className="mb-8 border-t border-gray-200" />

        <p className="mb-6 leading-relaxed text-gray-600">
          {t('introduction')}
        </p>

        <ul className="space-y-6">
          {privacySections.map((section, index) => (
            <li key={index} className="py-4">
              <SectionTitle>{section.title}</SectionTitle>
              <SectionContent>{section.content}</SectionContent>
              
              {section.subsections && section.subsections.map((subsection, subIndex) => (
                <div key={subIndex} className="w-full mb-4">
                  <SubsectionTitle>{subsection.title}</SubsectionTitle>
                  <SectionContent>{subsection.content}</SectionContent>
                </div>
              ))}
              
              {index !== privacySections.length - 1 && <hr className="w-full mt-4 border-t border-gray-200" />}
            </li>
          ))}
        </ul>

        <div className="bg-gray-50 p-6 rounded-md border border-gray-200 mt-8">
          <address className="not-italic text-sm">
            <strong>{t('contactInfo.company')}</strong>
            <br />
            {t('contactInfo.address')}
            <br />
            {t('contactInfo.suite')}
            <br />
            {t('contactInfo.city')}
            <br />
            {t('contactInfo.country')}            
            <br />
            {t('contactInfo.email')}
            <br />
            {t('contactInfo.website')}
          </address>
        </div>
      </div>
    </div>
  );
};

const PrivacyPolicy = () => {
  return (
    <I18nextProvider i18n={i18nInstance}>
      <PrivacyPolicyContent />
    </I18nextProvider>
  );
};

export default PrivacyPolicy;