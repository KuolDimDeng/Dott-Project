/**
 * Get the correct backend URL based on environment
 * In production on Render, use the internal service URL to avoid Cloudflare issues
 * In staging, use staging-specific URLs
 */
export function getBackendUrl() {
  // If we're in a server-side context on Render
  if (typeof window === 'undefined') {
    // Check if we're in staging environment
    if (process.env.STAGING_MODE === 'true' || process.env.NODE_ENV === 'staging') {
      // Use internal staging URL if available
      if (process.env.INTERNAL_BACKEND_URL) {
        return process.env.INTERNAL_BACKEND_URL;
      }
      // Fall back to public staging URL
      return process.env.BACKEND_URL || process.env.BACKEND_API_URL || 'https://dott-api-staging.onrender.com';
    }
    
    // Production: Check if we're running on Render (they set RENDER env var)
    if (process.env.RENDER) {
      // Use internal Render service URL (doesn't go through Cloudflare)
      // Using the internal HTTP address from Render
      return 'http://dott-api-y26w:8000';
    }
  }
  
  // Client-side or fallback
  // Check for staging environment
  if (process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging' || 
      process.env.NODE_ENV === 'staging' || 
      process.env.STAGING_MODE === 'true') {
    return process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'https://dott-api-staging.onrender.com';
  }
  
  // Default to the public API URL for production
  return process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || process.env.BACKEND_API_URL || 'https://api.dottapps.com';
}