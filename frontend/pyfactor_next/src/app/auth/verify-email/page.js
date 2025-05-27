'use client';

import React, { useEffect } from 'react';
import VerifyEmailPage from './VerifyEmailPage';
import AuthLayout from '../components/AuthLayout';
import { useTranslation } from 'react-i18next';
import { logger } from '@/utils/logger';

export default function VerifyEmail() {
  const { t } = useTranslation();

  // Initialize app cache when component mounts (client-side only)
  useEffect(() => {
    try {
      // Initialize app cache if it doesn't exist
      if (typeof window !== 'undefined') {
        window.__APP_CACHE = window.__APP_CACHE || {};
        window.__APP_CACHE.tenant = window.__APP_CACHE.tenant || {};
        window.__APP_CACHE.auth = window.__APP_CACHE.auth || {};
        
        // Get tenant ID from app cache or fallback to sessionStorage
        const tenantId = 
          window.__APP_CACHE.tenant.id || 
          window.__APP_CACHE.auth.tenantId || 
          sessionStorage.getItem('tenantId');
        
        if (tenantId) {
          // Store in app cache in multiple locations for backward compatibility
          window.__APP_CACHE.tenant.id = tenantId;
          window.__APP_CACHE.auth.tenantId = tenantId;
          window.__APP_CACHE.tenantId = tenantId; // Legacy location
          
          logger.debug('Stored tenant ID in app cache:', tenantId);
        }
      }
    } catch (error) {
      logger.error('Error initializing app cache:', error);
    }
  }, []);

  const leftContent = (
    <div>
      <h2 className="text-4xl font-bold mb-6">
        {t('auth.verify.title', { defaultValue: 'Verify Your Email' })}
      </h2>
      <p className="text-xl text-blue-100 mb-8 leading-relaxed">
        {t('auth.verify.description', { defaultValue: "We've sent a verification code to your email. Please check your inbox and enter the code below." })}
      </p>
      
      {/* Steps */}
      <div className="space-y-6 mb-8">
        {[
          { step: 1, text: t('auth.verify.step1', { defaultValue: 'Check your email inbox' }) },
          { step: 2, text: t('auth.verify.step2', { defaultValue: 'Find the verification email' }) },
          { step: 3, text: t('auth.verify.step3', { defaultValue: 'Enter the 6-digit code' }) }
        ].map((item) => (
          <div key={item.step} className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold">{item.step}</span>
            </div>
            <p className="text-blue-100 pt-1">{item.text}</p>
          </div>
        ))}
      </div>

      {/* Security Note */}
      <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
        <div className="flex items-center space-x-2 mb-2">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          <span className="text-white font-medium">{t('auth.verify.securityTitle', { defaultValue: 'Why verify?' })}</span>
        </div>
        <p className="text-blue-100 text-sm">
          {t('auth.verify.securityNote', { defaultValue: 'Email verification helps us ensure your account security and prevents unauthorized access.' })}
        </p>
      </div>
    </div>
  );

  return (
    <AuthLayout
      title={t('auth.verify.pageTitle', { defaultValue: 'Check your email' })}
      subtitle={t('auth.verify.pageSubtitle', { defaultValue: "We've sent a verification code to your email address" })}
      leftContent={leftContent}
      showProgress={true}
      currentStep={2}
      totalSteps={5}
    >
      <VerifyEmailPage />
    </AuthLayout>
  );
}