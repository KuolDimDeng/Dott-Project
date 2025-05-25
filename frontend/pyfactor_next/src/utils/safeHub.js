/**
 * SafeHub - A wrapper around AWS Amplify Hub that provides safe fallbacks
 * Prevents "Hub is undefined" errors that can crash the application
 */

import { logger } from '@/utils/logger';

// Try to import Hub with fallback
let AmplifyHub = null;
try {
  const amplifyCore = require('aws-amplify');
  AmplifyHub = amplifyCore.Hub;
} catch (error) {
  try {
    // Try alternate import path
    const amplifyUnified = require('@/config/amplifyUnified');
    AmplifyHub = amplifyUnified.Hub;
  } catch (altError) {
    logger.warn('[SafeHub] Hub not available, using safe fallbacks');
  }
}

/**
 * Safe Hub wrapper that provides fallbacks when Hub is not available
 */
export const SafeHub = {
  /**
   * Safely listen to Hub events
   * @param {string} channel - The channel to listen to (e.g., 'auth')
   * @param {function} listener - The listener function
   * @returns {function} Unsubscribe function
   */
  listen: (channel, listener) => {
    try {
      if (AmplifyHub && typeof AmplifyHub.listen === 'function') {
        logger.debug(`[SafeHub] Setting up listener for channel: ${channel}`);
        return AmplifyHub.listen(channel, listener);
      } else {
        logger.warn(`[SafeHub] Hub.listen not available for channel: ${channel}, returning noop unsubscribe`);
        return () => {}; // Return noop unsubscribe function
      }
    } catch (error) {
      logger.error(`[SafeHub] Error setting up listener for channel ${channel}:`, error);
      return () => {}; // Return noop unsubscribe function
    }
  },

  /**
   * Safely dispatch Hub events
   * @param {string} channel - The channel to dispatch to
   * @param {object} payload - The payload to send
   */
  dispatch: (channel, payload) => {
    try {
      if (AmplifyHub && typeof AmplifyHub.dispatch === 'function') {
        logger.debug(`[SafeHub] Dispatching to channel: ${channel}`, payload);
        return AmplifyHub.dispatch(channel, payload);
      } else {
        logger.warn(`[SafeHub] Hub.dispatch not available for channel: ${channel}, ignoring dispatch`);
      }
    } catch (error) {
      logger.error(`[SafeHub] Error dispatching to channel ${channel}:`, error);
    }
  },

  /**
   * Safely remove Hub listeners
   * @param {string} channel - The channel to remove from
   * @param {function} listener - The listener function to remove
   */
  remove: (channel, listener) => {
    try {
      if (AmplifyHub && typeof AmplifyHub.remove === 'function') {
        logger.debug(`[SafeHub] Removing listener from channel: ${channel}`);
        return AmplifyHub.remove(channel, listener);
      } else {
        logger.warn(`[SafeHub] Hub.remove not available for channel: ${channel}, ignoring remove`);
      }
    } catch (error) {
      logger.error(`[SafeHub] Error removing listener from channel ${channel}:`, error);
    }
  }
};

// Also export individual methods for convenience
export const { listen, dispatch, remove } = SafeHub;

export default SafeHub; 