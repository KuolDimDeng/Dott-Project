'use client';


import * as React from 'react';
import Image from 'next/image';
import AuthButton from '@/components/AuthButton';
import { useTranslation } from 'react-i18next';
import HeroSlideshow from './HeroSlideshow';

// Fallback image URL - gray placeholder with "Logo" text
const FALLBACK_LOGO = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQwIiBoZWlnaHQ9IjQwIiB2aWV3Qm94PSIwIDAgMTQwIDQwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxNDAiIGhlaWdodD0iNDAiIGZpbGw9IiNGMkYyRjIiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OSIgZm9udC1mYW1pbHk9InN5c3RlbS11aSwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNHB4Ij5Mb2dvPC90ZXh0Pjwvc3ZnPg==';

export default function Hero() {
  const { t } = useTranslation();
  
  return (
    <div id="hero" className="relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary-light/10 blur-3xl"></div>
        <div className="absolute top-1/2 -left-24 w-72 h-72 rounded-full bg-primary-main/5 blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full bg-secondary-light/10 blur-3xl"></div>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto pt-20 pb-16 px-4 sm:pt-28 sm:pb-24 sm:px-6 lg:px-8">
        <div className="text-center">
          
          <div className="text-sm sm:text-base text-gray-600 font-medium tracking-wider mb-8">
            <span className="inline-flex items-center">
              <span className="inline-flex items-center mr-3">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </span>
              <span>SMART BUSINESS MANAGEMENT SOLUTIONS</span>
            </span>
          </div>
          
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-primary-main to-primary-light">
            <span className="relative inline-block mr-2">
              <span className="italic font-normal" style={{ fontFamily: 'Caveat, cursive', fontSize: '1.2em' }}>Your</span>
              <svg 
                className="absolute -bottom-1 left-0 w-full h-3 pointer-events-none" 
                viewBox="0 0 100 12" 
                fill="none"
                preserveAspectRatio="none"
              >
                <path
                  d="M 5,8 Q 25,6 50,7 T 95,8"
                  stroke="#FF6B6B"
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="none"
                  opacity="0.8"
                  strokeDasharray="0"
                >
                  <animate
                    attributeName="strokeDasharray"
                    from="0 100"
                    to="100 0"
                    dur="0.8s"
                    begin="0.5s"
                    fill="freeze"
                  />
                </path>
              </svg>
            </span>
            {' '}
            <span>Global Business Platform</span>
          </h1>
          
          {/* Key Benefits */}
          <div className="mt-12 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-600 max-w-4xl mx-auto">
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center mr-2">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              {t('hero.benefit.free')}
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center mr-2">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              {t('hero.benefit.invoicing')}
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center mr-2">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              {t('hero.benefit.pos')}
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center mr-2">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              {t('hero.benefit.inventory')}
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center mr-2">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              {t('hero.benefit.payroll')}
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center mr-2">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              {t('hero.benefit.tax')}
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center mr-2">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              {t('hero.benefit.insights')}
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center mr-2">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              {t('hero.benefit.mobileMoney')}
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center mr-2">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              {t('hero.benefit.cardPayments')}
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center mr-2">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              {t('hero.benefit.languages')}
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center mr-2">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              {t('hero.benefit.mobilePhone', 'Mobile phone app included')}
            </div>
          </div>
          
          <div className="mt-10">
            <HeroSlideshow />
          </div>
          
          <p className="mt-12 text-xl text-blue-600 max-w-3xl mx-auto leading-relaxed">
            {t('hero.description', 'Dott lets business owners like you create invoices, accept payments online, manage your accounting, and inventory, with barcode scanning—all in one intuitive platform.')}
          </p>
          
          <div className="mt-10">
            <AuthButton theme="orange" />
          </div>
        </div>
      </div>
    </div>
  );
}