'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

/**
 * Modern Auth Layout Component
 * Provides split-screen layout with sophisticated design and lighter color palette
 */
const AuthLayout = ({ 
  children, 
  title, 
  subtitle, 
  leftContent, 
  showProgress = false, 
  currentStep = 1, 
  totalSteps = 5,
  className = '' 
}) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-stone-50">
      <div className="flex min-h-screen">
        {/* Left Side - Informational Content */}
        <div className="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-slate-800 via-slate-700 to-gray-800 relative overflow-hidden">
          {/* Modern Background Pattern */}
          <div className="absolute inset-0">
            {/* Subtle geometric pattern */}
            <div className="absolute inset-0 opacity-5">
              <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
                <defs>
                  <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/>
                  </pattern>
                </defs>
                <rect width="100" height="100" fill="url(#grid)" />
              </svg>
            </div>
            
            {/* Elegant gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800/90 via-slate-700/95 to-gray-800/90"></div>
            
            {/* Modern wave pattern */}
            <svg className="absolute bottom-0 left-0 w-full h-32 opacity-10" viewBox="0 0 400 100" fill="none">
              <path d="M0,100 C80,80 160,60 240,70 C320,80 360,90 400,85 L400,100 Z" fill="white"/>
              <path d="M0,100 C100,85 200,75 300,80 C350,82 375,85 400,88 L400,100 Z" fill="white" fillOpacity="0.5"/>
            </svg>
          </div>
          
          {/* Content */}
          <div className="relative z-10 flex flex-col justify-center px-12 py-16 text-white">
            {/* Logo */}
            <div className="mb-8">
              <Link href="/" className="inline-block group">
                <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 transition-all duration-300 group-hover:bg-white/15 group-hover:scale-105">
                  <Image 
                    src="/static/images/PyfactorLandingpage.png" 
                    alt="PyFactor Logo" 
                    width={140} 
                    height={35} 
                    className="h-8 w-auto brightness-0 invert"
                  />
                </div>
              </Link>
            </div>

            {/* Progress Indicator */}
            {showProgress && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-300">
                    {t('auth.step', { defaultValue: 'Step' })} {currentStep} {t('auth.of', { defaultValue: 'of' })} {totalSteps}
                  </span>
                  <span className="text-xs text-slate-400">
                    {Math.round((currentStep / totalSteps) * 100)}% complete
                  </span>
                </div>
                <div className="w-full bg-slate-600/30 rounded-full h-2 backdrop-blur-sm">
                  <div 
                    className="bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full h-2 transition-all duration-700 ease-out shadow-sm"
                    style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Dynamic Content */}
            <div className="flex-1">
              {leftContent}
            </div>

            {/* Modern Trust Indicators */}
            <div className="mt-8 pt-6 border-t border-slate-600/30">
              <div className="flex items-center space-x-8 text-sm">
                <div className="flex items-center space-x-2 text-slate-300">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="font-medium">{t('auth.secure', { defaultValue: 'Bank-level Security' })}</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-300">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="font-medium">{t('auth.trusted', { defaultValue: 'ISO 27001 Certified' })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form Content */}
        <div className="flex-1 lg:w-3/5 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20 bg-white">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link href="/" className="inline-block">
              <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 inline-block">
                <Image 
                  src="/static/images/PyfactorLandingpage.png" 
                  alt="PyFactor Logo" 
                  width={120} 
                  height={30} 
                  className="h-7 w-auto"
                />
              </div>
            </Link>
          </div>

          {/* Mobile Progress */}
          {showProgress && (
            <div className="lg:hidden mb-8">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-600">
                  {t('auth.step', { defaultValue: 'Step' })} {currentStep} {t('auth.of', { defaultValue: 'of' })} {totalSteps}
                </span>
                <span className="text-xs text-slate-500">
                  {Math.round((currentStep / totalSteps) * 100)}% complete
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full h-2 transition-all duration-700 ease-out"
                  style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Form Header */}
          <div className="mb-10 text-center lg:text-left">
            <h1 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-lg text-slate-600 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>

          {/* Form Content */}
          <div className={`max-w-md mx-auto lg:mx-0 w-full ${className}`}>
            {children}
          </div>

          {/* Mobile Trust Indicators */}
          <div className="lg:hidden mt-10 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-center space-x-6 text-sm">
              <div className="flex items-center space-x-2 text-slate-500">
                <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center">
                  <svg className="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="font-medium">{t('auth.secure', { defaultValue: 'Secure' })}</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-500">
                <div className="w-6 h-6 rounded-md bg-cyan-100 flex items-center justify-center">
                  <svg className="w-3 h-3 text-cyan-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="font-medium">{t('auth.trusted', { defaultValue: 'Trusted' })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;