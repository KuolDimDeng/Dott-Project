// src/components/CookieBanner.js
'use client';

import React, { useState, useEffect } from 'react';
import NextLink from 'next/link';

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

    // Check if user has already made a cookie choice - with error handling
    try {
      const cookieConsent = localStorage.getItem('cookieConsent');
      if (!cookieConsent) {
        // Wait a short time before showing the banner for better UX
        const timer = setTimeout(() => {
          setOpen(true);
        }, 1000);
        return () => clearTimeout(timer);
      }
    } catch (error) {
      console.error('Error accessing localStorage:', error);
      // Don't show banner if localStorage access fails
    }
  }, []);

  const handleAcceptAll = () => {
    try {
      localStorage.setItem('cookieConsent', 'all');
      setPreferences({
        essential: true,
        functional: true,
        analytics: true,
        marketing: true,
      });
      setOpen(false);
      // Here you would enable all your cookie-setting scripts
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  const handleAcceptSelected = () => {
    try {
      localStorage.setItem('cookieConsent', JSON.stringify(preferences));
      setOpen(false);
      setShowPreferences(false);
      // Here you would enable only the cookie types that were selected
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  const handleRejectAll = () => {
    try {
      localStorage.setItem('cookieConsent', 'essential');
      setPreferences({
        essential: true,
        functional: false,
        analytics: false,
        marketing: false,
      });
      setOpen(false);
      // Here you would disable all non-essential cookies
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  const handlePreferenceChange = (event) => {
    setPreferences({
      ...preferences,
      [event.target.name]: event.target.checked,
    });
  };

  // Don't render anything during SSR or if banner shouldn't be shown
  if (!isMounted || !open) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[99999] w-full rounded-none bg-white p-6 shadow-[0_-4px_10px_rgba(0,0,0,0.1)] sm:rounded-t-lg"
    >
      {!showPreferences ? (
        <>
          <h6 className="mb-2 text-lg font-medium">
            We Value Your Privacy
          </h6>
          <p className="mb-4 text-sm text-gray-700">
            We use cookies to enhance your browsing experience, serve personalized ads or content, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies. Read our{' '}
            <NextLink href="/cookies" className="text-primary-main hover:underline">
              Cookie Policy
            </NextLink>{' '}
            to learn more.
          </p>
          <div
            className="flex flex-col justify-center gap-2 sm:flex-row"
          >
            <button
              className="rounded-md border border-primary-main bg-transparent px-4 py-2 text-sm font-medium text-primary-main hover:bg-primary-main/5"
              onClick={() => setShowPreferences(true)}
            >
              Cookie Settings
            </button>
            <button 
              className="rounded-md border border-primary-main bg-transparent px-4 py-2 text-sm font-medium text-primary-main hover:bg-primary-main/5"
              onClick={handleRejectAll}
            >
              Reject All
            </button>
            <button
              className="rounded-md bg-primary-main px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
              onClick={handleAcceptAll}
            >
              Accept All
            </button>
          </div>
        </>
      ) : (
        <>
          <h6 className="mb-2 text-lg font-medium">
            Cookie Preferences
          </h6>
          <div className="my-4 border-t border-gray-200" />
          
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="mr-2 flex h-5 items-center">
                <input
                  type="checkbox"
                  checked={preferences.essential}
                  disabled={true}
                  className="h-4 w-4 rounded border-gray-300 text-primary-main focus:ring-primary-main disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <label className="font-medium text-gray-700">Essential (Required)</label>
                <p className="text-xs text-gray-500">
                  These cookies are necessary for the website to function and cannot be switched off.
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="mr-2 flex h-5 items-center">
                <input
                  type="checkbox"
                  checked={preferences.functional}
                  onChange={handlePreferenceChange}
                  name="functional"
                  className="h-4 w-4 rounded border-gray-300 text-primary-main focus:ring-primary-main"
                />
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <label className="font-medium text-gray-700">Functional</label>
                <p className="text-xs text-gray-500">
                  These cookies enable personalized features and functionality.
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="mr-2 flex h-5 items-center">
                <input
                  type="checkbox"
                  checked={preferences.analytics}
                  onChange={handlePreferenceChange}
                  name="analytics"
                  className="h-4 w-4 rounded border-gray-300 text-primary-main focus:ring-primary-main"
                />
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <label className="font-medium text-gray-700">Analytics</label>
                <p className="text-xs text-gray-500">
                  These cookies help us understand how visitors interact with our website.
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="mr-2 flex h-5 items-center">
                <input
                  type="checkbox"
                  checked={preferences.marketing}
                  onChange={handlePreferenceChange}
                  name="marketing"
                  className="h-4 w-4 rounded border-gray-300 text-primary-main focus:ring-primary-main"
                />
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <label className="font-medium text-gray-700">Marketing</label>
                <p className="text-xs text-gray-500">
                  These cookies are used to track visitors across websites to display relevant advertisements.
                </p>
              </div>
            </div>
          </div>
          
          <div className="my-4 border-t border-gray-200" />
          
          <div
            className="flex flex-col justify-center gap-2 sm:flex-row"
          >
            <button
              className="rounded-md border border-gray-300 bg-transparent px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              onClick={() => setShowPreferences(false)}
            >
              Back
            </button>
            <button
              className="rounded-md border border-primary-main bg-transparent px-4 py-2 text-sm font-medium text-primary-main hover:bg-primary-main/5"
              onClick={handleRejectAll}
            >
              Reject All
            </button>
            <button
              className="rounded-md bg-primary-main px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
              onClick={handleAcceptSelected}
            >
              Save Preferences
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default CookieBanner;