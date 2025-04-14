import { setCacheValue, removeCacheValue } from '@/utils/appCache';

export const setAuthTokens = (tokens) => {
  // Store tokens in AppCache with 1 hour expiration (3600000ms)
  if (tokens.idToken) {
    setCacheValue('auth_idToken', tokens.idToken, { ttl: 3600000 });
  }
  
  if (tokens.accessToken) {
    setCacheValue('auth_accessToken', tokens.accessToken, { ttl: 3600000 });
  }
  
  if (tokens.refreshToken) {
    // Store refresh token with longer TTL (24 hours)
    setCacheValue('auth_refreshToken', tokens.refreshToken, { ttl: 86400000 });
  }
};

export const clearAuthTokens = () => {
  // Remove auth tokens from AppCache
  removeCacheValue('auth_idToken');
  removeCacheValue('auth_accessToken');
  removeCacheValue('auth_refreshToken');
};