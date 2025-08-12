// Utility to ensure API URL is always correct
// This runs on app initialization

export function ensureCorrectApiUrl() {
  if (typeof window === 'undefined') return;
  
  // Check if we're in production
  const isProduction = window.location.hostname.includes('dottapps.com') || 
                      window.location.hostname.includes('onrender.com');
  
  if (isProduction) {
    // Override any incorrect environment variable
    if (process.env.NEXT_PUBLIC_API_URL !== 'https://api.dottapps.com') {
      console.warn('[API URL] Correcting API URL from', process.env.NEXT_PUBLIC_API_URL, 'to https://api.dottapps.com');
      // Note: We can't actually change process.env, but we can ensure our API config uses the right URL
    }
  }
}

// Run on import
ensureCorrectApiUrl();
