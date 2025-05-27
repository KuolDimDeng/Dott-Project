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
      <h2 className="text-4xl font-bold mb-6 text-white">
        {t('auth.signin.welcome', { defaultValue: 'Welcome Back' })}
      </h2>
      <p className="text-xl text-slate-200 mb-8 leading-relaxed">
        {t('auth.signin.description', { defaultValue: 'Access your business dashboard and continue growing your company with our comprehensive tools.' })}
      </p>
      
      {/* Features List */}
      <div className="space-y-5 mb-10">
        {[
          { icon: '📊', text: t('auth.signin.feature1', { defaultValue: 'Real-time business analytics' }) },
          { icon: '🔒', text: t('auth.signin.feature2', { defaultValue: 'Secure data management' }) },
          { icon: '🎯', text: t('auth.signin.feature3', { defaultValue: '24/7 customer support' }) }
        ].map((feature, index) => (
          <div key={index} className="flex items-center space-x-4 group">
            <div className="flex-shrink-0 w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20 group-hover:bg-white/15 transition-all duration-300">
              <span className="text-lg">{feature.icon}</span>
            </div>
            <span className="text-slate-200 font-medium">{feature.text}</span>
          </div>
        ))}
      </div>

      {/* Modern Stats */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <div className="text-3xl font-bold text-white mb-1">10,000+</div>
          <div className="text-slate-300 text-sm font-medium">{t('auth.signin.businesses', { defaultValue: 'Businesses trust us' })}</div>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <div className="text-3xl font-bold text-white mb-1">99.9%</div>
          <div className="text-slate-300 text-sm font-medium">{t('auth.signin.uptime', { defaultValue: 'Uptime guarantee' })}</div>
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
          <Link href="/auth/signup" className="font-medium text-emerald-600 hover:text-emerald-500 transition-colors">
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