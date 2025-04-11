/**
 * Environment helpers for detecting server/client contexts
 * Used across the app for safe code execution in different contexts
 */

/**
 * Check if code is running on server side
 * @returns {boolean} True if running on server
 */
export const isServerSide = () => typeof window === 'undefined';

/**
 * Create a server-safe version of a function
 * Returns the fallback value when running on server
 * @param {Function} fn - Function to make server-safe
 * @param {any} fallbackValue - Value to return on server
 * @returns {Function} Server-safe function
 */
export const makeServerSafe = (fn, fallbackValue = null) => {
  return (...args) => {
    if (isServerSide()) {
      return fallbackValue;
    }
    return fn(...args);
  };
};

/**
 * Get browser user agent safely
 * @returns {string|null} User agent or null on server
 */
export const getUserAgent = () => {
  if (isServerSide()) return null;
  return window.navigator.userAgent;
};

/**
 * Get current environment (development/production)
 * @returns {string} Current environment
 */
export const getEnvironment = () => {
  return process.env.NODE_ENV || 'development';
};

/**
 * Check if in development mode
 * @returns {boolean} True if in development
 */
export const isDevelopment = () => getEnvironment() === 'development';

/**
 * Check if in production mode
 * @returns {boolean} True if in production
 */
export const isProduction = () => getEnvironment() === 'production'; 