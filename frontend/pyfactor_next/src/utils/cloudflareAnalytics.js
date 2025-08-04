// Safe loader for Cloudflare analytics that handles errors gracefully
export function loadCloudflareAnalytics() {
  if (typeof window === 'undefined') return;
  
  try {
    // Only load in production
    if (process.env.NODE_ENV !== 'production') return;
    
    // Check if already loaded
    if (window.__cfBeaconLoaded) return;
    
    // Create script element without integrity check
    const script = document.createElement('script');
    script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    script.defer = true;
    script.setAttribute('data-cf-beacon', '{"token": "YOUR_TOKEN_HERE"}');
    
    // Handle load errors gracefully
    script.onerror = (error) => {
      console.warn('[Cloudflare Analytics] Failed to load beacon:', error);
    };
    
    script.onload = () => {
      window.__cfBeaconLoaded = true;
    };
    
    // Append to body
    document.body.appendChild(script);
  } catch (error) {
    console.warn('[Cloudflare Analytics] Error loading script:', error);
  }
}
