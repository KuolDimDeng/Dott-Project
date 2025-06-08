/**
 * SafeHub - A stub for AWS Amplify Hub compatibility
 * Since we're using Auth0 instead of AWS Amplify, this provides safe fallbacks
 */

import { logger } from '@/utils/logger';

/**
 * Safe Hub wrapper that provides fallbacks
 */
export const SafeHub = {
  /**
   * Safely listen to Hub events
   * @param {string} channel - The channel to listen to (e.g., 'auth')
   * @param {function} listener - The listener function
   * @returns {function} Unsubscribe function
   */
  listen: (channel, listener) => {
    logger.debug(`[SafeHub] Hub.listen called for channel: ${channel} (no-op with Auth0)`);
    return () => {}; // Return noop unsubscribe function
  },

  /**
   * Safely dispatch Hub events
   * @param {string} channel - The channel to dispatch to
   * @param {object} event - The event object
   * @param {string} [source='Unknown'] - The source of the event
   */
  dispatch: (channel, event, source = 'Unknown') => {
    logger.debug(`[SafeHub] Hub.dispatch called for channel: ${channel} (no-op with Auth0)`, {
      event,
      source
    });
  },

  /**
   * Safely remove Hub listener
   * @param {string} channel - The channel to remove listener from
   * @param {function} listener - The listener function to remove
   */
  remove: (channel, listener) => {
    logger.debug(`[SafeHub] Hub.remove called for channel: ${channel} (no-op with Auth0)`);
  }
};