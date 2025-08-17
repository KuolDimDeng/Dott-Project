// Stripe configuration with fallback for Render deployments
// This handles the case where NEXT_PUBLIC vars aren't available at build time

function getStripeKey() {
  // Try to get from build-time env first
  let key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  
  // If not available and we're in the browser, try runtime config
  if (!key && typeof window !== 'undefined') {
    // Check if it's available in runtime config (for Render deployments)
    if (window.__RUNTIME_CONFIG__ && window.__RUNTIME_CONFIG__.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      key = window.__RUNTIME_CONFIG__.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    }
  }
  
  // Log for debugging (remove in production)
  if (typeof window !== 'undefined' && !key) {
    console.warn('[Stripe Config] No Stripe publishable key found');
  }
  
  return key || '';
}

export const STRIPE_PUBLISHABLE_KEY = getStripeKey();

// Export a function to check if Stripe is properly configured
export function isStripeConfigured() {
  return !!STRIPE_PUBLISHABLE_KEY && STRIPE_PUBLISHABLE_KEY.length > 0;
}

// Export function to get key type
export function getStripeKeyType() {
  if (!STRIPE_PUBLISHABLE_KEY) return 'NONE';
  if (STRIPE_PUBLISHABLE_KEY.startsWith('pk_test')) return 'TEST';
  if (STRIPE_PUBLISHABLE_KEY.startsWith('pk_live')) return 'LIVE';
  return 'UNKNOWN';
}