/**
 * Circuit Breaker Utility
 * 
 * This utility helps prevent infinite redirect loops and provides
 * emergency circuit breaking functionality across the application.
 */

// Track redirect attempts for different pages
export const REDIRECT_THRESHOLDS = {
  default: 3,
  signin: 3,
  businessInfo: 2,
  dashboard: 3
};

/**
 * Checks if redirects should be blocked based on the configured threshold
 * @param {string} pageKey - The key identifying which page is checking
 * @returns {boolean} - True if redirects should be blocked
 */
export function shouldBlockRedirects(pageKey = 'default') {
  const storageKey = `${pageKey}_redirect_count`;
  const count = parseInt(localStorage.getItem(storageKey) || '0', 10);
  const threshold = REDIRECT_THRESHOLDS[pageKey] || REDIRECT_THRESHOLDS.default;
  
  return count >= threshold;
}

/**
 * Increments the redirect counter for a specific page
 * @param {string} pageKey - The key identifying which page is incrementing
 * @returns {number} - The new count value
 */
export function incrementRedirectCount(pageKey = 'default') {
  const storageKey = `${pageKey}_redirect_count`;
  const currentCount = parseInt(localStorage.getItem(storageKey) || '0', 10);
  const newCount = currentCount + 1;
  
  localStorage.setItem(storageKey, newCount.toString());
  return newCount;
}

/**
 * Resets the redirect counter for a specific page
 * @param {string} pageKey - The key identifying which page to reset
 */
export function resetRedirectCount(pageKey = 'default') {
  const storageKey = `${pageKey}_redirect_count`;
  localStorage.setItem(storageKey, '0');
}

/**
 * Add noredirect parameter to URL to prevent future redirects
 */
export function addNoRedirectParam() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('noredirect')) {
    url.searchParams.set('noredirect', 'true');
    window.history.replaceState({}, '', url.toString());
  }
}

/**
 * Add a noredirect parameter to the provided URL
 * @param {string} urlString - The URL to add the parameter to
 * @returns {string} - The URL with noredirect parameter added
 */
export function addNoRedirectToUrl(urlString) {
  const url = new URL(urlString);
  url.searchParams.set('noredirect', 'true');
  return url.toString();
}

/**
 * Reset all circuit breaker counters
 * Used for troubleshooting or when the user explicitly requests it
 */
export function resetAllCircuitBreakers() {
  // Clear all redirect counters
  Object.keys(REDIRECT_THRESHOLDS).forEach(key => {
    resetRedirectCount(key);
  });
  
  // Clear other related storage items
  localStorage.removeItem('signin_attempts');
  localStorage.removeItem('business_auth_errors');
  localStorage.removeItem('middleware_redirect_counter');
  localStorage.removeItem('preventSigninRedirects');
} 