'use client';

import { appCache } from @/utils/appCache';


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
        if (!appCache.getAll()) appCache.init();
        if (!appCache.get('tenant')) appCache.set('tenant', {});
        if (!appCache.get('auth')) appCache.set('auth', {});
        
        // Get tenant ID from app cache or fallback to sessionStorage
        const tenantId = 
          appCache.get('tenant.id') || 
          appCache.get('auth.tenantId') || 
          sessionStorage.getItem('tenantId');
        
        if (tenantId) {
          // Store in app cache in multiple locations for backward compatibility
          appCache.set('tenant.id', tenantId);
          appCache.set('auth.tenantId', tenantId);
          appCache.set('tenantId', tenantId); // Legacy location
          
          logger.debug('Stored tenant ID in app cache:', tenantId);
        }
      }
    } catch (error) {
      logger.error('Error initializing app cache:', error);
    }
  }, []);

  const leftContent = (
    <div>
      <h2 className="text-4xl font-bold mb-6 text-white">
        {t('auth.verify.title', { defaultValue: 'Verify Your Email' })}
      </h2>
      <p className="text-xl text-blue-100 mb-8 leading-relaxed">
        {t('auth.verify.description', { defaultValue: "We've sent a verification code to your email. Please check your inbox and enter the code below." })}
      </p>
      
      {/* Steps */}
      <div className="space-y-6 mb-10">
        {[
          { step: 1, text: t('auth.verify.step1', { defaultValue: 'Check your email inbox' }) },
          { step: 2, text: t('auth.verify.step2', { defaultValue: 'Find the verification email' }) },
          { step: 3, text: t('auth.verify.step3', { defaultValue: 'Enter the 6-digit code' }) }
        ].map((item) => (
          <div key={item.step} className="flex items-start space-x-4 group">
            <div className="flex-shrink-0 w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20 group-hover:bg-white/15 transition-all duration-300">
              <span className="text-white font-bold text-sm">{item.step}</span>
            </div>
            <p className="text-blue-100 pt-2 font-medium leading-relaxed">{item.text}</p>
          </div>
        ))}
      </div>

      {/* Modern Security Note */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-white font-semibold">{t('auth.verify.securityTitle', { defaultValue: 'Why verify?' })}</span>
        </div>
        <p className="text-blue-100 text-sm leading-relaxed">
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