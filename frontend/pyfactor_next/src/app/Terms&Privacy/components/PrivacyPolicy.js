'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { I18nextProvider } from 'react-i18next';
import i18nInstance from '@/i18n';

const PrivacyPolicyContent = () => {
  const router = useRouter();
  const { t } = useTranslation();
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
      title: t('privacyPolicy.sections.scope.title'),
      content: t('privacyPolicy.sections.scope.content'),
    },
    {
      title: t('privacyPolicy.sections.personalInfo.title'),
      content: t('privacyPolicy.sections.personalInfo.content'),
      subsections: [
        {
          title: t('privacyPolicy.sections.personalInfo.businessInfo.title'),
          content: t('privacyPolicy.sections.personalInfo.businessInfo.content')
        },
        {
          title: t('privacyPolicy.sections.personalInfo.individualInfo.title'),
          content: t('privacyPolicy.sections.personalInfo.individualInfo.content')
        }
      ]
    },
    {
      title: t('privacyPolicy.sections.categories.title'),
      content: t('privacyPolicy.sections.categories.content'),
      subsections: [
        {
          title: t('privacyPolicy.sections.categories.identification.title'),
          content: t('privacyPolicy.sections.categories.identification.content')
        },
        {
          title: t('privacyPolicy.sections.categories.financial.title'),
          content: t('privacyPolicy.sections.categories.financial.content')
        },
        {
          title: t('privacyPolicy.sections.categories.employee.title'),
          content: t('privacyPolicy.sections.categories.employee.content')
        },
        {
          title: t('privacyPolicy.sections.categories.technical.title'),
          content: t('privacyPolicy.sections.categories.technical.content')
        },
        {
          title: t('privacyPolicy.sections.categories.customer.title'),
          content: t('privacyPolicy.sections.categories.customer.content')
        },
        {
          title: t('privacyPolicy.sections.categories.tax.title'),
          content: t('privacyPolicy.sections.categories.tax.content')
        }
      ]
    },
    {
      title: t('privacyPolicy.sections.collection.title'),
      content: t('privacyPolicy.sections.collection.content'),
      subsections: [
        {
          title: t('privacyPolicy.sections.collection.direct.title'),
          content: t('privacyPolicy.sections.collection.direct.content')
        },
        {
          title: t('privacyPolicy.sections.collection.automated.title'),
          content: t('privacyPolicy.sections.collection.automated.content')
        },
        {
          title: t('privacyPolicy.sections.collection.thirdParty.title'),
          content: t('privacyPolicy.sections.collection.thirdParty.content')
        },
        {
          title: t('privacyPolicy.sections.collection.financial.title'),
          content: t('privacyPolicy.sections.collection.financial.content')
        }
      ]
    },
    {
      title: t('privacyPolicy.sections.usage.title'),
      content: t('privacyPolicy.sections.usage.content'),
      subsections: [
        {
          title: t('privacyPolicy.sections.usage.services.title'),
          content: t('privacyPolicy.sections.usage.services.content')
        },
        {
          title: t('privacyPolicy.sections.usage.security.title'),
          content: t('privacyPolicy.sections.usage.security.content')
        },
        {
          title: t('privacyPolicy.sections.usage.communications.title'),
          content: t('privacyPolicy.sections.usage.communications.content')
        },
        {
          title: t('privacyPolicy.sections.usage.compliance.title'),
          content: t('privacyPolicy.sections.usage.compliance.content')
        },
        {
          title: t('privacyPolicy.sections.usage.analytics.title'),
          content: t('privacyPolicy.sections.usage.analytics.content')
        }
      ]
    },
    {
      title: t('privacyPolicy.sections.sharing.title'),
      content: t('privacyPolicy.sections.sharing.content'),
      subsections: [
        {
          title: t('privacyPolicy.sections.sharing.providers.title'),
          content: t('privacyPolicy.sections.sharing.providers.content')
        },
        {
          title: t('privacyPolicy.sections.sharing.partners.title'),
          content: t('privacyPolicy.sections.sharing.partners.content')
        },
        {
          title: t('privacyPolicy.sections.sharing.authorities.title'),
          content: t('privacyPolicy.sections.sharing.authorities.content')
        },
        {
          title: t('privacyPolicy.sections.sharing.transfers.title'),
          content: t('privacyPolicy.sections.sharing.transfers.content')
        },
        {
          title: t('privacyPolicy.sections.sharing.consent.title'),
          content: t('privacyPolicy.sections.sharing.consent.content')
        }
      ]
    },
    {
      title: t('privacyPolicy.sections.rights.title'),
      content: t('privacyPolicy.sections.rights.content'),
      subsections: [
        {
          title: t('privacyPolicy.sections.rights.access.title'),
          content: t('privacyPolicy.sections.rights.access.content')
        },
        {
          title: t('privacyPolicy.sections.rights.correction.title'),
          content: t('privacyPolicy.sections.rights.correction.content')
        },
        {
          title: t('privacyPolicy.sections.rights.deletion.title'),
          content: t('privacyPolicy.sections.rights.deletion.content')
        },
        {
          title: t('privacyPolicy.sections.rights.objection.title'),
          content: t('privacyPolicy.sections.rights.objection.content')
        },
        {
          title: t('privacyPolicy.sections.rights.withdraw.title'),
          content: t('privacyPolicy.sections.rights.withdraw.content')
        },
        {
          title: t('privacyPolicy.sections.rights.exercise.title'),
          content: t('privacyPolicy.sections.rights.exercise.content')
        }
      ]
    },
    {
      title: t('privacyPolicy.sections.security.title'),
      content: t('privacyPolicy.sections.security.content'),
      subsections: [
        {
          title: t('privacyPolicy.sections.security.measures.title'),
          content: t('privacyPolicy.sections.security.measures.content')
        },
        {
          title: t('privacyPolicy.sections.security.payment.title'),
          content: t('privacyPolicy.sections.security.payment.content')
        },
        {
          title: t('privacyPolicy.sections.security.access.title'),
          content: t('privacyPolicy.sections.security.access.content')
        },
        {
          title: t('privacyPolicy.sections.security.breach.title'),
          content: t('privacyPolicy.sections.security.breach.content')
        },
        {
          title: t('privacyPolicy.sections.security.tax.title'),
          content: t('privacyPolicy.sections.security.tax.content')
        }
      ]
    },
    {
      title: t('privacyPolicy.sections.retention.title'),
      content: t('privacyPolicy.sections.retention.content')
    },
    {
      title: t('privacyPolicy.sections.transfers.title'),
      content: t('privacyPolicy.sections.transfers.content')
    },
    {
      title: t('privacyPolicy.sections.children.title'),
      content: t('privacyPolicy.sections.children.content')
    },
    {
      title: t('privacyPolicy.sections.cookies.title'),
      content: t('privacyPolicy.sections.cookies.content'),
      subsections: [
        {
          title: t('privacyPolicy.sections.cookies.types.title'),
          content: t('privacyPolicy.sections.cookies.types.content')
        },
        {
          title: t('privacyPolicy.sections.cookies.choices.title'),
          content: t('privacyPolicy.sections.cookies.choices.content')
        }
      ]
    },
    {
      title: t('privacyPolicy.sections.ai.title'),
      content: t('privacyPolicy.sections.ai.content'),
      subsections: [
        {
          title: t('privacyPolicy.sections.ai.features.title'),
          content: t('privacyPolicy.sections.ai.features.content')
        },
        {
          title: t('privacyPolicy.sections.ai.advice.title'),
          content: t('privacyPolicy.sections.ai.advice.content')
        },
        {
          title: t('privacyPolicy.sections.ai.review.title'),
          content: t('privacyPolicy.sections.ai.review.content')
        }
      ]
    },
    {
      title: t('privacyPolicy.sections.changes.title'),
      content: t('privacyPolicy.sections.changes.content')
    },
    {
      title: t('privacyPolicy.sections.contact.title'),
      content: t('privacyPolicy.sections.contact.content')
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
          {fromDashboard ? t('privacyPolicy.navigation.backToDashboard') : t('privacyPolicy.navigation.backToHome')}
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
          {t('privacyPolicy.title')}
        </h1>

        <p className="text-center text-gray-600 mb-8">
          {t('privacyPolicy.effectiveDate', { date: new Date().toLocaleDateString() })}
        </p>

        <hr className="mb-8 border-t border-gray-200" />

        <p className="mb-6 leading-relaxed text-gray-600">
          {t('privacyPolicy.introduction')}
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
            <strong>{t('privacyPolicy.contactInfo.company')}</strong>
            <br />
            {t('privacyPolicy.contactInfo.address')}
            <br />
            {t('privacyPolicy.contactInfo.suite')}
            <br />
            {t('privacyPolicy.contactInfo.city')}
            <br />
            {t('privacyPolicy.contactInfo.country')}            
            <br />
            {t('privacyPolicy.contactInfo.email')}
            <br />
            {t('privacyPolicy.contactInfo.website')}
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