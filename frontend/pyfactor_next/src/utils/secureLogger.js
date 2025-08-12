/**
 * Secure logging utility - prevents sensitive data exposure
 */

export const secureLog = {
  /**
   * Safely log session information with masked token
   */
  session: (message, sessionId) => {
    if (!sessionId) {
      console.log(`${message}: NO SESSION`);
      return;
    }
    const masked = sessionId.substring(0, 8) + '...' + sessionId.substring(sessionId.length - 4);
    console.log(`${message}: ${masked}`);
  },

  /**
   * Safely log API tokens with masking
   */
  token: (message, token) => {
    if (!token) {
      console.log(`${message}: NO TOKEN`);
      return;
    }
    const masked = token.substring(0, 12) + '...' + token.substring(token.length - 8);
    console.log(`${message}: ${masked}`);
  },

  /**
   * Regular logging for non-sensitive data
   */
  info: (message, data) => {
    console.log(message, data);
  },

  /**
   * Error logging
   */
  error: (message, error) => {
    console.error(message, error);
  }
};
