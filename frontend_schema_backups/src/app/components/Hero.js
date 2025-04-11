'use client';

import * as React from 'react';
import Image from 'next/image';
import AuthButton from '@/components/AuthButton';
import { useTranslation } from 'react-i18next';

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
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary-main to-primary-light">Manage your business like a pro.</span>
          </h1>
          
          <div className="mt-10 max-w-3xl mx-auto">
            <div className="sm:flex sm:justify-center">
              <div className="relative w-full sm:max-w-sm">
                <Image
                  src="/static/images/Work-Life-Balance-1--Streamline-Brooklyn.png"
                  alt={t('heroImageAlt', 'Business Management Illustration')}
                  width={400}
                  height={280}
                  loading="eager"
                  className="w-full h-auto object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-transparent to-transparent"></div>
              </div>
            </div>
          </div>
          
          <p className="mt-12 text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            {t('heroDescription', 'Global business management with advanced inventory, barcode scanning, and regional payment solutions—all in one intuitive platform for businesses worldwide.')}
          </p>
          
          <div className="mt-10">
            <AuthButton theme="light" />
          </div>
          
          {/* Trusted by logos - with error handling */}
          <div className="mt-10 mb-20">
            <p className="text-sm text-center text-gray-500 mb-6">
              Trusted by leading companies worldwide
            </p>
            <div className="flex flex-wrap justify-center gap-x-10 gap-y-8 max-w-5xl mx-auto">
              {[1, 2, 3, 4].map((num) => (
                <div key={num} className="flex items-center">
                  <img 
                    src={`/static/images/logos/logo${num}.png`} 
                    alt="Company logo" 
                    width={140} 
                    height={40}
                    className="grayscale opacity-70 h-8 w-auto object-contain"
                    onError={(e) => {
                      // Replace with fallback on error
                      e.target.onerror = null; // Prevent infinite loop
                      e.target.src = FALLBACK_LOGO;
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}