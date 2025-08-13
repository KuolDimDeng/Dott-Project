// API Configuration
// This ensures we always use the correct API URL

const getApiUrl = () => {
  // Check for staging environment first
  if (typeof window !== 'undefined') {
    // Client-side
    if (window.location.hostname === 'staging.dottapps.com' || 
        window.location.hostname.includes('dott-staging')) {
      console.log('[API Config] Staging environment detected, using staging API');
      return process.env.NEXT_PUBLIC_API_URL || 'https://dott-api-staging.onrender.com';
    }
    
    // Production environment
    if (window.location.hostname.includes('dottapps.com') || 
        window.location.hostname.includes('onrender.com')) {
      console.log('[API Config] Production environment detected, using api.dottapps.com');
      return 'https://api.dottapps.com';
    }
  }
  
  // Server-side: check environment variable to determine staging vs production
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT;
  
  // If explicitly set as staging, use staging API
  if (environment === 'staging') {
    console.log('[API Config] Staging environment set, using:', envUrl || 'https://dott-api-staging.onrender.com');
    return envUrl || 'https://dott-api-staging.onrender.com';
  }
  
  // Use environment variable or default to production API
  return envUrl || 'https://api.dottapps.com';
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
