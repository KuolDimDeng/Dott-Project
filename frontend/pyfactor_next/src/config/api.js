// API Configuration
// This ensures we always use the correct API URL

const getApiUrl = () => {
  // In production, always use api.dottapps.com
  if (typeof window !== 'undefined') {
    // Client-side
    if (window.location.hostname.includes('dottapps.com')) {
      return 'https://api.dottapps.com';
    }
  }
  
  // Use environment variable or default to production API
  return process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
};

export const API_CONFIG = {
  BASE_URL: getApiUrl(),
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

// Log the API URL being used
if (typeof window !== 'undefined') {
  console.log('[API Config] Using API URL:', API_CONFIG.BASE_URL);
}

export default API_CONFIG;
