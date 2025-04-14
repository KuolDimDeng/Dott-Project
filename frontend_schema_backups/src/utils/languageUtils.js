'use client';

import { logger } from '@/utils/logger';
import { getCacheValue, setCacheValue } from '@/utils/appCache';
import { getLanguagePreference, saveLanguagePreference } from '@/utils/userPreferences';

/**
 * Gets the language parameter from the URL, Cognito attributes, AppCache, or defaults to 'en'
 * @returns {string} The language code (e.g., 'en', 'fr', etc.)
 */
export function getLanguageParam() {
  let langParam;
  try {
    // Try to get from current URL first
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
    langParam = urlParams.get('lng');
    
    // If not found in current URL, check AppCache or use default
    if (!langParam && typeof window !== 'undefined') {
      langParam = getCacheValue('preferredLanguage') || 'en';
      
      // If not in AppCache, try to get from Cognito asynchronously
      // This will update AppCache for future use if found
      getLanguagePreference().then(cognitoLang => {
        if (cognitoLang && cognitoLang !== langParam) {
          setCacheValue('preferredLanguage', cognitoLang);
          logger.debug(`[LanguageUtils] Updated language from Cognito: ${cognitoLang}`);
        }
      }).catch(e => {
        logger.error('[LanguageUtils] Error getting language from Cognito:', e);
      });
    } else if (langParam && typeof window !== 'undefined') {
      // Save the language preference for future use
      setCacheValue('preferredLanguage', langParam);
      
      // Also save to Cognito for persistence across devices
      saveLanguagePreference(langParam).catch(e => {
        logger.error('[LanguageUtils] Error saving language to Cognito:', e);
      });
    } else {
      langParam = 'en';
    }
  } catch (error) {
    // Default to English if there's an error
    langParam = 'en';
    logger.error('[LanguageUtils] Error getting language parameter:', error);
  }
  
  return langParam;
}

/**
 * Appends the language parameter to a URL path
 * @param {string} path - The URL path to append the language parameter to
 * @returns {string} The URL path with the language parameter appended
 */
export function appendLanguageParam(path) {
  const langParam = getLanguageParam();
  return `${path}?lng=${langParam}`;
}

/**
 * Creates a query string with the language parameter
 * @returns {string} The query string with the language parameter (e.g., '?lng=en')
 */
export function getLanguageQueryString() {
  const langParam = getLanguageParam();
  return `?lng=${langParam}`;
}