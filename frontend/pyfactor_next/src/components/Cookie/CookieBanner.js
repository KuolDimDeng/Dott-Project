'use client';

import React, { useState, useEffect } from 'react';
import NextLink from 'next/link';

/**
 * Cookie consent banner using localStorage for storage
 */
const CookieBanner = () => {
  const [open, setOpen] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true, // Essential cookies cannot be disabled
    functional: true,
    analytics: true,
    marketing: false,
  });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    // Check if user has already made a cookie choice
    const checkConsent = () => {
      if (typeof window === 'undefined') return;
      
      try {
        const consentData = localStorage.getItem('cookie_consent');
        if (consentData) {
          const parsed = JSON.parse(consentData);
          if (parsed && parsed.accepted) {
            setPreferences({
              ...preferences,
              ...(parsed.preferences || {})
            });
            return; // Don't show banner
          }
        }
      } catch (e) {
        console.warn('Error parsing cookie consent data:', e);
      }
      
      // If we get here, no consent was found - show banner after a delay
      const timer = setTimeout(() => {
        setOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    };
    
    checkConsent();
  }, []);

  const handleAcceptAll = () => {
    try {
      const consentData = {
        preferences: {
          essential: true,
          functional: true,
          analytics: true,
          marketing: true,
        },
        timestamp: new Date().toISOString(),
        accepted: true
      };
      
      localStorage.setItem('cookie_consent', JSON.stringify(consentData));
      localStorage.setItem('analytics_consent', 'true');
      localStorage.setItem('marketing_consent', 'true');
      
      setOpen(false);
    } catch (e) {
      console.error('Error saving cookie consent:', e);
    }
  };

  const handleSavePreferences = () => {
    try {
      const consentData = {
        preferences,
        timestamp: new Date().toISOString(),
        accepted: true
      };
      
      localStorage.setItem('cookie_consent', JSON.stringify(consentData));
      localStorage.setItem('analytics_consent', preferences.analytics.toString());
      localStorage.setItem('marketing_consent', preferences.marketing.toString());
      
      setOpen(false);
    } catch (e) {
      console.error('Error saving cookie consent:', e);
    }
  };

  const handleTogglePreference = (key, value) => {
    setPreferences({
      ...preferences,
      [key]: value
    });
  };

  const handleRejectAll = () => {
    try {
      const consentData = {
        preferences: {
          essential: true, // Can't disable essential
          functional: false,
          analytics: false,
          marketing: false,
        },
        timestamp: new Date().toISOString(),
        accepted: true
      };
      
      localStorage.setItem('cookie_consent', JSON.stringify(consentData));
      localStorage.setItem('analytics_consent', 'false');
      localStorage.setItem('marketing_consent', 'false');
      
      setOpen(false);
    } catch (e) {
      console.error('Error saving cookie consent:', e);
    }
  };

  if (!isMounted || !open) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="max-w-7xl mx-auto p-4">
        {!showPreferences ? (
          // Main banner
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <h3 className="font-semibold text-gray-900">Cookie Notice</h3>
              </div>
              <p className="text-sm text-gray-600">
                We use cookies to enhance your experience, analyze usage, and provide essential functionality. 
                By continuing to use our site, you consent to our use of cookies.{' '}
                <NextLink href="/Terms&Privacy/CookiePolicy" className="text-blue-600 hover:underline">
                  Learn more
                </NextLink>
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <button
                onClick={() => setShowPreferences(true)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Customize
              </button>
              <button
                onClick={handleRejectAll}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Reject All
              </button>
              <button
                onClick={handleAcceptAll}
                className="px-6 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                Accept All
              </button>
            </div>
          </div>
        ) : (
          // Preferences panel
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Cookie Preferences</h3>
              <button
                onClick={() => setShowPreferences(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              {/* Essential Cookies */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Essential Cookies</h4>
                  <p className="text-sm text-gray-600">Required for basic site functionality and security</p>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferences.essential}
                    disabled
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-500">Always On</span>
                </div>
              </div>
              
              {/* Functional Cookies */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Functional Cookies</h4>
                  <p className="text-sm text-gray-600">Remember your preferences and settings</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.functional}
                    onChange={(e) => handleTogglePreference('functional', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              {/* Analytics Cookies */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Analytics Cookies</h4>
                  <p className="text-sm text-gray-600">Help us understand how you use our site</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={(e) => handleTogglePreference('analytics', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              {/* Marketing Cookies */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Marketing Cookies</h4>
                  <p className="text-sm text-gray-600">Used to show you relevant advertisements</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.marketing}
                    onChange={(e) => handleTogglePreference('marketing', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={handleSavePreferences}
                className="px-6 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                Save Preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CookieBanner;