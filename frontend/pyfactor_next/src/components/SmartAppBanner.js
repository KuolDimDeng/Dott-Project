'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

export default function SmartAppBanner() {
  const { t } = useTranslation();
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const userAgent = navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
    const isAndroidDevice = /Android/.test(userAgent);
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                                window.navigator.standalone === true;
    
    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);
    setIsStandalone(isInStandaloneMode);

    // Don't show if already installed or dismissed today
    const dismissedDate = localStorage.getItem('smart-banner-dismissed');
    const today = new Date().toDateString();
    
    if (!isInStandaloneMode && dismissedDate !== today && (isIOSDevice || isAndroidDevice)) {
      // Show immediately on mobile browsers
      setShowBanner(true);
    }
  }, []);

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('smart-banner-dismissed', new Date().toDateString());
  };

  if (!showBanner || isStandalone) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gray-900 text-white p-3 shadow-lg">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-3 flex-1">
          <img 
            src="/static/images/favicon.png" 
            alt="Dott" 
            className="h-12 w-12 rounded-xl"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{t('smartBanner.title', 'Dott: Global Business Platform')}</p>
            <p className="text-xs text-gray-300">
              {isIOS ? t('smartBanner.ios', 'Available on your home screen') : t('smartBanner.android', 'Install for quick access')}
            </p>
          </div>
          <div className="flex-shrink-0">
            {isIOS ? (
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">{t('smartBanner.tap', 'Tap')}</p>
                <div className="flex items-center space-x-1">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 7a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 13a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    <path d="M5 3a1 1 0 000 2h10a1 1 0 100-2H5z" />
                  </svg>
                  <span className="text-xs">{t('smartBanner.then', 'then')}</span>
                  <span className="text-xs font-medium">{t('smartBanner.addToHome', 'Add to Home')}</span>
                </div>
              </div>
            ) : (
              <button className="bg-white text-gray-900 px-4 py-1.5 rounded-md text-sm font-medium hover:bg-gray-100">
                {t('smartBanner.install', 'Install')}
              </button>
            )}
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="ml-3 text-gray-400 hover:text-white"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}