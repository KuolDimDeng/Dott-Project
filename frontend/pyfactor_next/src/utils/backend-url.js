/**
 * Get the correct backend URL based on environment
 * In production on Render, use the internal service URL to avoid Cloudflare issues
 */
export function getBackendUrl() {
  // If we're in a server-side context on Render
  if (typeof window === 'undefined') {
    // Check if we're running on Render (they set RENDER env var)
    if (process.env.RENDER) {
      // Use internal Render service URL (doesn't go through Cloudflare)
      // Using the internal HTTP address from Render
      return 'http://dott-api-y26w:8000';
    }
  }
  
  // Default to the public API URL
  return process.env.BACKEND_URL || process.env.BACKEND_API_URL || 'https://api.dottapps.com';
}