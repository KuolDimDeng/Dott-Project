'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SignUpForm from '../components/SignUpForm';
import AuthLayout from '../components/AuthLayout';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { logger } from '@/utils/logger';
import { clearAllAuthData } from '@/utils/authUtils';

export default function SignUp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [isReady, setIsReady] = useState(false);
  
  // Clear any existing auth session on mount
  useEffect(() => {
    const ensureNoExistingSession = async () => {
      try {
        // Check if we need to force a fresh start
        const freshStart = searchParams.get('freshstart') === 'true';
        
        if (freshStart) {
          logger.debug('[SignUpPage] Fresh start requested, ensuring no auth session exists');
          await clearAllAuthData();
        }
        
        setIsReady(true);
      } catch (error) {
        logger.error('[SignUpPage] Error clearing auth session:', error);
        setIsReady(true);
      }
    };
    
    ensureNoExistingSession();
  }, [searchParams]);
  
  if (!isReady) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const leftContent = (
    <div>
      <h2 className="text-4xl font-bold mb-6">
        {t('auth.signup.welcome', { defaultValue: 'Start Your Journey' })}
      </h2>
      <p className="text-xl text-blue-100 mb-8 leading-relaxed">
        {t('auth.signup.description', { defaultValue: 'Join thousands of businesses that trust PyFactor to manage their operations efficiently.' })}
      </p>
      
      {/* Benefits List */}
      <div className="space-y-4 mb-8">
        {[
          { icon: '🚀', text: t('auth.signup.benefit1', { defaultValue: 'Quick setup in minutes' }) },
          { icon: '💼', text: t('auth.signup.benefit2', { defaultValue: 'Professional business tools' }) },
          { icon: '📊', text: t('auth.signup.benefit3', { defaultValue: 'Advanced reporting & analytics' }) },
          { icon: '🔒', text: t('auth.signup.benefit4', { defaultValue: 'Bank-level security' }) }
        ].map((benefit, index) => (
          <div key={index} className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-lg">{benefit.icon}</span>
            </div>
            <span className="text-blue-100">{benefit.text}</span>
          </div>
        ))}
      </div>

      {/* Social Proof */}
      <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
        <div className="flex items-center space-x-2 mb-2">
          <div className="flex -space-x-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-8 h-8 bg-white/30 rounded-full border-2 border-white"></div>
            ))}
          </div>
          <span className="text-white font-medium">+10,000 businesses</span>
        </div>
        <p className="text-blue-100 text-sm">
          "{t('auth.signup.testimonial', { defaultValue: 'PyFactor transformed how we manage our business operations.' })}"
        </p>
      </div>
    </div>
  );
  
  return (
    <AuthLayout
      title={t('auth.signup.title', { defaultValue: 'Create your account' })}
      subtitle={
        <span>
          {t('auth.signup.subtitle', { defaultValue: 'Already have an account?' })}{' '}
          <Link href="/auth/signin" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
            {t('auth.signup.signIn', { defaultValue: 'Sign in here' })}
          </Link>
        </span>
      }
      leftContent={leftContent}
      showProgress={true}
      currentStep={1}
      totalSteps={5}
    >
      <SignUpForm />
    </AuthLayout>
  );
}