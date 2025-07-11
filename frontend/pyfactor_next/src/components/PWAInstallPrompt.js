'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                                window.navigator.standalone || 
                                document.referrer.includes('android-app://');
    
    setIsIOS(isIOSDevice);
    setIsStandalone(isInStandaloneMode);

    if (!isInStandaloneMode && !localStorage.getItem('pwa-install-dismissed')) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 30000); // Show after 30 seconds

      return () => clearTimeout(timer);
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!localStorage.getItem('pwa-install-dismissed')) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowPrompt(false);
        localStorage.setItem('pwa-installed', 'true');
      }
      
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!showPrompt || isStandalone) {
    return null;
  }

  if (isIOS) {
    return (
      <div className="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-6">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 sm:p-6 max-w-md mx-auto">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <img 
                src="/static/images/icon-192.png" 
                alt="Dott" 
                className="h-12 w-12 rounded-lg"
              />
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-lg font-medium text-gray-900">
                Install Dott Business
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Add Dott to your home screen for quick access and offline capabilities.
              </p>
              <div className="mt-3 text-sm text-gray-600">
                <p>
                  Tap <span className="inline-flex items-center px-1">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 7a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 13a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                      <path d="M5 3a1 1 0 000 2h10a1 1 0 100-2H5z" />
                    </svg>
                  </span> then "Add to Home Screen"
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-6">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 sm:p-6 max-w-md mx-auto">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <img 
              src="/static/images/icon-192.png" 
              alt="Dott" 
              className="h-12 w-12 rounded-lg"
            />
          </div>
          <div className="ml-4 flex-1">
            <h3 className="text-lg font-medium text-gray-900">
              Install Dott Business
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Install our app for a faster experience and offline access.
            </p>
            <div className="mt-4 flex space-x-3">
              <button
                onClick={handleInstallClick}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}