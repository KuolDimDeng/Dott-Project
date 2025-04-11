export const setAuthTokens = (tokens) => {
    const config = 'path=/; max-age=3600; secure; samesite=lax';
    
    if (tokens.idToken) {
      document.cookie = `idToken=${tokens.idToken}; ${config}`;
    }
    
    if (tokens.accessToken) {
      document.cookie = `accessToken=${tokens.accessToken}; ${config}`;
    }
    
    if (tokens.refreshToken) {
      document.cookie = `refreshToken=${tokens.refreshToken}; path=/; max-age=86400; secure; samesite=lax`;
    }
  };
  
  export const clearAuthTokens = () => {
    const config = 'path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=lax';
    document.cookie = `idToken=; ${config}`;
    document.cookie = `accessToken=; ${config}`;
    document.cookie = `refreshToken=; ${config}`;
  };