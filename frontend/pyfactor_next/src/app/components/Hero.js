'use client';

import * as React from 'react';
import Image from 'next/image';
import AuthButton from '@/components/AuthButton';
import { useTranslation } from 'react-i18next';
import i18nInstance from '../../i18n'; // Import i18n instance

export default function Hero() {
  const { t } = useTranslation();
  
  // Force re-render when language changes
  const [, setRenderKey] = React.useState(0);
  
  React.useEffect(() => {
    const handleLanguageChange = () => {
      setRenderKey(prev => prev + 1); // Force re-render
    };
    
    window.addEventListener('languageChange', handleLanguageChange);
    return () => {
      window.removeEventListener('languageChange', handleLanguageChange);
    };
  }, []);

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
                  priority
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
            <AuthButton size="large" variant="primary" />
          </div>
          
          <div className="mt-16 max-w-5xl mx-auto">
            <div className="relative rounded-xl overflow-hidden shadow-xl aspect-video">
              <iframe 
                className="absolute inset-0 w-full h-full"
                src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                title={t('heroVideoTitle', 'Dott Software Demo')}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
          
          {/* Trusted by section */}
          <div className="mt-16">
            <p className="text-base font-medium text-gray-500 tracking-wide">
              {t('trustedBy', 'TRUSTED BY INNOVATIVE COMPANIES')}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-8 md:grid-cols-4">
              <div className="flex justify-center grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition duration-300">
                <Image src="/static/images/logos/logo1.png" alt="Company logo" width={140} height={40} />
              </div>
              <div className="flex justify-center grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition duration-300">
                <Image src="/static/images/logos/logo2.png" alt="Company logo" width={140} height={40} />
              </div>
              <div className="flex justify-center grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition duration-300">
                <Image src="/static/images/logos/logo3.png" alt="Company logo" width={140} height={40} />
              </div>
              <div className="flex justify-center grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition duration-300">
                <Image src="/static/images/logos/logo4.png" alt="Company logo" width={140} height={40} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}