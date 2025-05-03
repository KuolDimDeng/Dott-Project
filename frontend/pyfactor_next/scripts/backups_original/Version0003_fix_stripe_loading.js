/**
 * @fileoverview
 * Script to fix excessive Stripe API loading and rendering on dashboard
 * Version: 1.0.0
 * 
 * This script:
 * 1. Prevents Stripe from loading until explicitly needed
 * 2. Cleans up any Stripe references that might cause repeated network requests
 * 3. Implements a more efficient lazy-loading approach for Stripe
 */

import { logger } from '@/utils/logger';

/**
 * Cleans up any unused Stripe elements that might be causing excessive loading
 */
function cleanupStripeElements() {
  try {
    // Check for any Stripe iframes and remove them if not needed
    const stripeIframes = document.querySelectorAll('iframe[src*="stripe"]');
    const stripeScripts = document.querySelectorAll('script[src*="stripe"]');
    
    // Only keep stripe elements if we're on a payment page or if the subscription popup is open
    const isPaymentPage = window.location.pathname.includes('/checkout') || 
                           window.location.pathname.includes('/payment') ||
                           window.location.pathname.includes('/subscription');
                           
    const isSubscriptionPopupOpen = !!document.querySelector('.subscription-popup[data-open="true"]');
    
    if (!isPaymentPage && !isSubscriptionPopupOpen) {
      // Log what we're cleaning up
      logger.info(`[StripeLoading] Cleaning up ${stripeIframes.length} Stripe iframes and ${stripeScripts.length} Stripe scripts`);
      
      // Remove iframes
      stripeIframes.forEach(iframe => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
          logger.debug('[StripeLoading] Removed Stripe iframe');
        }
      });
      
      // Remove scripts (except for the main Stripe.js script if it exists)
      stripeScripts.forEach(script => {
        // Don't remove the main Stripe.js script (we'll just disable its loading)
        if (script.src.includes('v3') && script.id === 'stripe-js') {
          // Just mark it as loaded to prevent double loading
          if (!window.Stripe) {
            window.__STRIPE_LOADING_DISABLED = true;
          }
          return;
        }
        
        // Remove other Stripe scripts that might be causing issues
        if (script.parentNode) {
          script.parentNode.removeChild(script);
          logger.debug('[StripeLoading] Removed Stripe script:', script.src);
        }
      });
      
      // Clean up any Stripe objects in memory
      if (window.__STRIPE_DELAYED_LOAD) {
        clearTimeout(window.__STRIPE_DELAYED_LOAD);
        window.__STRIPE_DELAYED_LOAD = null;
      }
    }
  } catch (error) {
    logger.error('[StripeLoading] Error cleaning up Stripe elements:', error);
  }
}

/**
 * Create a patched version of the script loading function for Stripe
 */
function patchStripeLoading() {
  try {
    // Store the original appendChild method
    const originalAppendChild = document.body.appendChild;
    
    // Override appendChild to intercept Stripe script loading
    document.body.appendChild = function(element) {
      // Check if this is a Stripe script
      if (element.tagName === 'SCRIPT' && 
          element.src && 
          element.src.includes('stripe.com')) {
        
        // Check if we're on a page that needs Stripe
        const isPaymentPage = window.location.pathname.includes('/checkout') || 
                             window.location.pathname.includes('/payment') ||
                             window.location.pathname.includes('/subscription');
                             
        const isSubscriptionPopupOpen = !!document.querySelector('.subscription-popup[data-open="true"]');
        
        // Only actually load Stripe if we need it
        if (!isPaymentPage && !isSubscriptionPopupOpen) {
          logger.info('[StripeLoading] Preventing automatic Stripe script loading on non-payment page');
          
          // Create a dummy promise for stripe loading that never loads
          if (!window.Stripe && !window.__STRIPE_DUMMY) {
            window.__STRIPE_DUMMY = true;
            window.__STRIPE_LOADING_DISABLED = true;
          }
          
          // Don't actually append the script
          return element;
        }
      }
      
      // Call the original appendChild for everything else
      return originalAppendChild.call(this, element);
    };
    
    logger.info('[StripeLoading] Patched document.body.appendChild to control Stripe loading');
  } catch (error) {
    logger.error('[StripeLoading] Error patching Stripe loading:', error);
  }
}

/**
 * Add a data-open attribute to subscription popup for better detection
 */
function markSubscriptionPopupState() {
  try {
    // Create a MutationObserver to detect when subscription popups appear
    const observer = new MutationObserver((mutations) => {
      // Look for subscription popups that have appeared
      const subscriptionPopups = document.querySelectorAll('.MuiDialog-root, .headlessui-dialog');
      
      subscriptionPopups.forEach(popup => {
        // Check if this is likely a subscription popup by looking for content
        const isSubscriptionPopup = popup.textContent.includes('Subscription') || 
                                   popup.textContent.includes('subscription') ||
                                   popup.textContent.includes('SUBSCRIPTION') ||
                                   popup.textContent.includes('Plan') ||
                                   popup.textContent.includes('Billing');
                                   
        if (isSubscriptionPopup) {
          // Mark it as a subscription popup
          popup.classList.add('subscription-popup');
          
          // Set open state
          popup.dataset.open = 'true';
          
          logger.debug('[StripeLoading] Marked subscription popup as open');
        }
      });
    });
    
    // Start observing the document for subscription popup appearances
    observer.observe(document.body, { 
      childList: true, 
      subtree: true 
    });
    
    logger.info('[StripeLoading] Set up observer for subscription popup state');
  } catch (error) {
    logger.error('[StripeLoading] Error setting up popup observer:', error);
  }
}

/**
 * Apply all fixes for Stripe loading issues
 */
export function fixStripeLoading() {
  try {
    logger.info('[StripeLoading] Applying fixes for excessive Stripe loading');
    
    // Apply all the fixes
    cleanupStripeElements();
    patchStripeLoading();
    markSubscriptionPopupState();
    
    // Set up periodic cleanup
    const cleanupInterval = setInterval(cleanupStripeElements, 30000);
    
    // Clean up on navigation events
    const handleNavigation = () => {
      setTimeout(cleanupStripeElements, 500);
    };
    
    // Listen for navigation events
    window.addEventListener('popstate', handleNavigation);
    window.addEventListener('pushState', handleNavigation);
    window.addEventListener('replaceState', handleNavigation);
    
    // Also clean up on focus to catch returns to the tab
    window.addEventListener('focus', cleanupStripeElements);
    
    logger.info('[StripeLoading] All Stripe loading fixes applied successfully');
    
    // Return a cleanup function in case we need to undo the changes
    return () => {
      clearInterval(cleanupInterval);
      window.removeEventListener('popstate', handleNavigation);
      window.removeEventListener('pushState', handleNavigation);
      window.removeEventListener('replaceState', handleNavigation);
      window.removeEventListener('focus', cleanupStripeElements);
    };
  } catch (error) {
    logger.error('[StripeLoading] Error applying Stripe loading fixes:', error);
  }
}

// Auto-execute when the script loads
if (typeof window !== 'undefined') {
  // Wait for app to initialize
  window.addEventListener('load', () => {
    // Small delay to ensure the page is fully loaded
    setTimeout(fixStripeLoading, 1000);
  });
}

export default {
  cleanupStripeElements,
  patchStripeLoading,
  markSubscriptionPopupState,
  fixStripeLoading
}; 