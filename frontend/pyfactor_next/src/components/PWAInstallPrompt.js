'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, ShareIcon, PlusIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                                window.navigator.standalone || 
                                document.referrer.includes('android-app://');
    
    setIsIOS(isIOSDevice);
    setIsStandalone(isInStandaloneMode);

    // Check if user has visited before
    const visitCount = parseInt(localStorage.getItem('pwa-visit-count') || '0');
    localStorage.setItem('pwa-visit-count', (visitCount + 1).toString());

    if (!isInStandaloneMode && !localStorage.getItem('pwa-install-dismissed')) {
      // Show after 3rd visit or after 10 seconds on first visit
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, visitCount > 2 ? 2000 : 10000);

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
    
    // Set a reminder to show again after 7 days
    const remindDate = new Date();
    remindDate.setDate(remindDate.getDate() + 7);
    localStorage.setItem('pwa-install-remind-after', remindDate.toISOString());
  };

  const handleShowInstructions = () => {
    setShowInstructions(true);
  };

  if (!showPrompt || isStandalone) {
    return null;
  }

  if (isIOS) {
    return (
      <>
        <div className="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-6 animate-slide-up">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden max-w-md mx-auto">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img 
                    src="/static/images/icon-192.png" 
                    alt="Dott" 
                    className="h-12 w-12 rounded-xl shadow-lg"
                  />
                  <div className="text-white">
                    <h3 className="text-lg font-semibold">Add to Home Screen</h3>
                    <p className="text-sm text-blue-100">Install for better experience</p>
                  </div>
                </div>
                <button
                  onClick={handleDismiss}
                  className="text-white/80 hover:text-white"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Benefits */}
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <ArrowDownTrayIcon className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-sm text-gray-700">Works Offline</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-700">Faster Loading</span>
                </div>
              </div>
              
              {!showInstructions ? (
                <button
                  onClick={handleShowInstructions}
                  className="w-full bg-blue-600 text-white rounded-xl py-3 font-medium hover:bg-blue-700 transition-colors"
                >
                  Show Me How
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-900">Quick Install Guide:</p>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <ShareIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-sm text-gray-700">
                      Tap the <span className="font-medium">Share</span> button below
                    </p>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <PlusIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-sm text-gray-700">
                      Select <span className="font-medium">"Add to Home Screen"</span>
                    </p>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-700">
                      Tap <span className="font-medium">"Add"</span> to install
                    </p>
                  </div>
                </div>
              )}
              
              <button
                onClick={handleDismiss}
                className="w-full mt-3 text-center text-sm text-gray-500 hover:text-gray-700"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
        
        {/* Visual indicator arrow pointing to Safari controls */}
        {showInstructions && (
          <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 mb-2 animate-bounce">
            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-6 animate-slide-up">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden max-w-md mx-auto">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src="/static/images/icon-192.png" 
                alt="Dott" 
                className="h-12 w-12 rounded-xl shadow-lg"
              />
              <div className="text-white">
                <h3 className="text-lg font-semibold">Install Dott App</h3>
                <p className="text-sm text-green-100">One-tap install</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-white/80 hover:text-white"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Benefits and Install */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <ArrowDownTrayIcon className="w-4 h-4 text-green-600" />
              </div>
              <span className="text-sm text-gray-700">Works Offline</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-sm text-gray-700">Lightning Fast</span>
            </div>
          </div>
          
          <button
            onClick={handleInstallClick}
            className="w-full bg-green-600 text-white rounded-xl py-3 font-medium hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            <span>Install Now</span>
          </button>
          
          <button
            onClick={handleDismiss}
            className="w-full mt-3 text-center text-sm text-gray-500 hover:text-gray-700"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}