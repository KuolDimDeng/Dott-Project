'use client';

import React from 'react';
import SignInForm from '../components/SignInForm';
import AuthLayout from '../components/AuthLayout';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

export default function SignInPage() {
  const { t } = useTranslation();

  // Add this function to clear all app cache on sign-in
  const clearAllAppCache = () => {
    if (typeof window === 'undefined' || !window.__APP_CACHE) return;
    
    // Log the cache clearing
    console.debug('[SignIn] Clearing all app cache to prevent data leakage');
    
    try {
      // Clear all categories
      Object.keys(window.__APP_CACHE).forEach(category => {
        window.__APP_CACHE[category] = {};
      });
      
      // Specifically ensure tenant data is cleared
      window.__APP_CACHE.tenant = {};
      window.__APP_CACHE.tenants = {};
      
      console.debug('[SignIn] App cache cleared successfully');
    } catch (error) {
      console.warn('[SignIn] Error clearing app cache:', error);
    }
  };

  const leftContent = (
    <div>
      <h2 className="text-4xl font-bold mb-6">
        {t('auth.signin.welcome', { defaultValue: 'Welcome Back' })}
      </h2>
      <p className="text-xl text-blue-100 mb-8 leading-relaxed">
        {t('auth.signin.description', { defaultValue: 'Access your business dashboard and continue growing your company with our comprehensive tools.' })}
      </p>
      
      {/* Features List */}
      <div className="space-y-4 mb-8">
        {[
          t('auth.signin.feature1', { defaultValue: 'Real-time business analytics' }),
          t('auth.signin.feature2', { defaultValue: 'Secure data management' }),
          t('auth.signin.feature3', { defaultValue: '24/7 customer support' })
        ].map((feature, index) => (
          <div key={index} className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-blue-100">{feature}</span>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="text-3xl font-bold text-white">10,000+</div>
          <div className="text-blue-200 text-sm">{t('auth.signin.businesses', { defaultValue: 'Businesses trust us' })}</div>
        </div>
        <div>
          <div className="text-3xl font-bold text-white">99.9%</div>
          <div className="text-blue-200 text-sm">{t('auth.signin.uptime', { defaultValue: 'Uptime guarantee' })}</div>
        </div>
      </div>
    </div>
  );

  return (
    <AuthLayout
      title={t('auth.signin.title', { defaultValue: 'Sign in to your account' })}
      subtitle={
        <span>
          {t('auth.signin.subtitle', { defaultValue: "Don't have an account?" })}{' '}
          <Link href="/auth/signup" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
            {t('auth.signin.createAccount', { defaultValue: 'Create one here' })}
          </Link>
        </span>
      }
      leftContent={leftContent}
      showProgress={false}
    >
      <SignInForm onClearCache={clearAllAppCache} />
    </AuthLayout>
  );
}