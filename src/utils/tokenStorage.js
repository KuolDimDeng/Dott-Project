/**
 * Token storage utility
 */
export const getStoredTokens = () => {
  try {
    if (typeof window === 'undefined') {
      return { idToken: null, accessToken: null };
    }
    
    // Check APP_CACHE first
    if (window.__APP_CACHE?.auth?.idToken) {
      return {
        idToken: window.__APP_CACHE.auth.idToken,
        accessToken: window.__APP_CACHE.auth.accessToken
      };
    }
    
    // Then check sessionStorage
    const idToken = sessionStorage.getItem('idToken');
    const accessToken = sessionStorage.getItem('accessToken');
    
    return { idToken, accessToken };
  } catch (error) {
    console.warn('[getStoredTokens] Error:', error);
    return { idToken: null, accessToken: null };
  }
};
