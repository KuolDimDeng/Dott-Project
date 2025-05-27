'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

/**
 * Enhanced Auth Layout Component
 * Provides split-screen layout with informational content on left and form on right
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="flex min-h-screen">
        {/* Left Side - Informational Content */}
        <div className="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-blue-600 to-indigo-700 relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
            <svg className="absolute bottom-0 left-0 w-full h-64" viewBox="0 0 400 200" fill="none">
              <path d="M0,200 C100,180 200,160 400,140 L400,200 Z" fill="white" fillOpacity="0.1"/>
            </svg>
          </div>
          
          {/* Content */}
          <div className="relative z-10 flex flex-col justify-center px-12 py-16 text-white">
            {/* Logo */}
            <div className="mb-8">
              <Link href="/" className="inline-block">
                <Image 
                  src="/static/images/PyfactorLandingpage.png" 
                  alt="PyFactor Logo" 
                  width={180} 
                  height={45} 
                  className="h-12 w-auto brightness-0 invert"
                />
              </Link>
            </div>

            {/* Progress Indicator */}
            {showProgress && (
              <div className="mb-8">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-sm font-medium text-blue-200">
                    {t('auth.step', { defaultValue: 'Step' })} {currentStep} {t('auth.of', { defaultValue: 'of' })} {totalSteps}
                  </span>
                </div>
                <div className="w-full bg-blue-500/30 rounded-full h-2">
                  <div 
                    className="bg-white rounded-full h-2 transition-all duration-500 ease-out"
                    style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Dynamic Content */}
            <div className="flex-1">
              {leftContent}
            </div>

            {/* Trust Indicators */}
            <div className="mt-8 pt-8 border-t border-blue-500/30">
              <div className="flex items-center space-x-6 text-sm text-blue-200">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <span>{t('auth.secure', { defaultValue: 'Secure' })}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>{t('auth.trusted', { defaultValue: 'Trusted' })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form Content */}
        <div className="flex-1 lg:w-3/5 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link href="/" className="inline-block">
              <Image 
                src="/static/images/PyfactorLandingpage.png" 
                alt="PyFactor Logo" 
                width={150} 
                height={38} 
                className="h-10 w-auto"
              />
            </Link>
          </div>

          {/* Mobile Progress */}
          {showProgress && (
            <div className="lg:hidden mb-6">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <span className="text-sm font-medium text-gray-600">
                  {t('auth.step', { defaultValue: 'Step' })} {currentStep} {t('auth.of', { defaultValue: 'of' })} {totalSteps}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 rounded-full h-2 transition-all duration-500 ease-out"
                  style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Form Header */}
          <div className="mb-8 text-center lg:text-left">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {title}
            </h1>
            {subtitle && (
              <p className="text-gray-600">
                {subtitle}
              </p>
            )}
          </div>

          {/* Form Content */}
          <div className={`max-w-md mx-auto lg:mx-0 w-full ${className}`}>
            {children}
          </div>

          {/* Mobile Trust Indicators */}
          <div className="lg:hidden mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span>{t('auth.secure', { defaultValue: 'Secure' })}</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>{t('auth.trusted', { defaultValue: 'Trusted' })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;