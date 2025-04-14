// src/components/CookieBanner.js
'use client';

import React, { useState, useEffect } from 'react';
import NextLink from 'next/link';
import { saveUserPreferences, getUserPreference, PREF_KEYS } from '@/utils/userPreferences';
import { getCacheValue, setCacheValue } from '@/utils/appCache';
import { logger } from '@/utils/logger';

/**
 * Cookie consent banner that uses Cognito attributes and AppCache for storage
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
    const checkConsent = async () => {
      // First check AppCache (fast)
      const cachedConsent = getCacheValue(PREF_KEYS.COOKIE_CONSENT);
      if (cachedConsent) {
        // Parse consent from cache
        try {
          const consentData = typeof cachedConsent === 'string' 
            ? JSON.parse(cachedConsent) 
            : cachedConsent;
            
          if (consentData) {
            setPreferences({
              ...preferences,
              ...(consentData.preferences || {})
            });
            return; // Don't show banner
          }
        } catch (e) {
          logger.warn('Error parsing cookie consent data from cache:', e);
        }
      }
      
      // Then try Cognito attributes
      try {
        const cognitoConsent = await getUserPreference(PREF_KEYS.COOKIE_CONSENT);
        if (cognitoConsent) {
          const consentData = JSON.parse(cognitoConsent);
          if (consentData) {
            // Update preferences and cache
            setPreferences({
              ...preferences,
              ...(consentData.preferences || {})
            });
            setCacheValue(PREF_KEYS.COOKIE_CONSENT, cognitoConsent);
            return; // Don't show banner
          }
        }
      } catch (e) {
        logger.warn('Error getting consent from Cognito:', e);
      }
      
      // If we get here, no consent was found - show banner after a delay
      const timer = setTimeout(() => {
        setOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    };
    
    checkConsent();
  }, []);

  const handleAcceptAll = async () => {
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
      
      // Save to AppCache for immediate effect
      setCacheValue(PREF_KEYS.COOKIE_CONSENT, JSON.stringify(consentData));
      
      // Save to Cognito for persistence
      await saveUserPreferences({
        [PREF_KEYS.COOKIE_CONSENT]: JSON.stringify(consentData),
        [PREF_KEYS.ANALYTICS_CONSENT]: 'true',
        [PREF_KEYS.MARKETING_CONSENT]: 'true'
      });
      
      setOpen(false);
    } catch (e) {
      logger.error('Error saving cookie consent:', e);
    }
  };

  const handleSavePreferences = async () => {
    try {
      const consentData = {
        preferences,
        timestamp: new Date().toISOString(),
        accepted: true
      };
      
      // Save to AppCache for immediate effect
      setCacheValue(PREF_KEYS.COOKIE_CONSENT, JSON.stringify(consentData));
      
      // Save to Cognito for persistence
      await saveUserPreferences({
        [PREF_KEYS.COOKIE_CONSENT]: JSON.stringify(consentData),
        [PREF_KEYS.ANALYTICS_CONSENT]: preferences.analytics.toString(),
        [PREF_KEYS.MARKETING_CONSENT]: preferences.marketing.toString()
      });
      
      setOpen(false);
    } catch (e) {
      logger.error('Error saving cookie consent:', e);
    }
  };

  const handleTogglePreference = (key, value) => {
    setPreferences({
      ...preferences,
      [key]: value
    });
  };

  if (!isMounted || !open) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background p-4 shadow-md z-50">
      {/* Banner content */}
    </div>
  );
};

export default CookieBanner;