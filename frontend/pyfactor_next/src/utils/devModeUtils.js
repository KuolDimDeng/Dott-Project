/**
 * Dev Mode Utils
 * Helper utilities to connect development mode components with the dashboard
 */

/**
 * Check if we are running in development mode
 * @returns {boolean} True if in development mode
 */
export const isDevMode = () => {
  return false; // Always return false to disable development mode
};

/**
 * Get the current user information for dev mode
 * This can be used by the AppBar to show the current user
 * @returns {Object} User object with name and other properties
 */
export const getDevModeUser = () => {
  if (!isDevMode()) return null;
  
  const userName = localStorage.getItem('dev-user-name') || 'Dev User';
  const tenantId = localStorage.getItem('dev-tenant-id');
  const tenantName = localStorage.getItem('dev-tenant-name');
  const subscriptionPlan = localStorage.getItem('dev-subscription-plan') || 'basic';
  
  return {
    name: userName,
    email: `${userName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
    tenant: {
      id: tenantId,
      name: tenantName
    },
    subscription: {
      plan: subscriptionPlan,
      status: 'active',
      trialEnds: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }
  };
};

/**
 * Get the current subscription plan information for dev mode
 * @returns {Object} Subscription plan details
 */
export const getDevSubscriptionPlan = () => {
  if (!isDevMode()) return null;
  
  const planId = localStorage.getItem('dev-subscription-plan') || sessionStorage.getItem('subscription-plan') || 'basic';
  
  const plans = {
    free: {
      name: 'Free Plan',
      price: 0,
      features: ['Basic features', 'Limited storage', '1 user'],
      limits: {
        users: 1,
        storage: '100MB',
        products: 10
      }
    },
    professional: {
      name: 'Professional',
      price: 29.99,
      features: ['All free features', '10GB storage', '10 users', '24/7 support'],
      limits: {
        users: 10,
        storage: '10GB',
        products: 1000
      }
    },
    enterprise: {
      name: 'Enterprise',
      price: 99.99,
      features: ['All professional features', 'Unlimited storage', 'Unlimited users', 'Dedicated support'],
      limits: {
        users: 'Unlimited',
        storage: 'Unlimited',
        products: 'Unlimited'
      }
    }
  };
  
  return plans[planId] || plans.basic;
};

/**
 * Set up listeners for dev mode events
 * Call this function in your AppBar or other components to listen for dev mode changes
 * @param {Function} onUserChange - Callback when user info changes
 * @param {Function} onPlanChange - Callback when subscription plan changes
 */
export const setupDevModeListeners = (onUserChange, onPlanChange) => {
  if (typeof window === 'undefined' || process.env.NODE_ENV === 'production') return;
  
  // Listen for plan changes
  const handlePlanChange = (event) => {
    const { plan } = event.detail;
    if (onPlanChange) onPlanChange(plan);
  };
  
  window.addEventListener('dev-plan-changed', handlePlanChange);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('dev-plan-changed', handlePlanChange);
  };
}; 