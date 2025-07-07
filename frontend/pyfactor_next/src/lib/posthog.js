import posthog from 'posthog-js';
import { POSTHOG_KEY, POSTHOG_HOST } from '@/config/posthog';

let posthogClient = null;

export async function initPostHog() {
  if (typeof window === 'undefined') {
    console.log('[PostHog] Running on server, skipping initialization');
    return null;
  }
  
  if (posthogClient) {
    console.log('[PostHog] Client already initialized, returning existing instance');
    return posthogClient;
  }

  // Check for cookie consent before initializing analytics
  if (typeof window !== 'undefined') {
    const analyticsConsent = localStorage.getItem('analytics_consent');
    if (analyticsConsent === 'false') {
      console.log('[PostHog] Analytics disabled by user preference');
      return null;
    }
  }

  // Use configuration from config file (which reads from env vars)
  let posthogKey = POSTHOG_KEY;
  let posthogHost = POSTHOG_HOST;

  // Log configuration source
  if (posthogKey) {
    console.log('[PostHog] Configuration loaded from environment variables');
  } else {
    console.log('[PostHog] No PostHog configuration found');
  }

  // Debug: Check all NEXT_PUBLIC env vars
  if (typeof window !== 'undefined') {
    console.log('[PostHog] All NEXT_PUBLIC env vars:', 
      Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_'))
    );
  }

  console.log('[PostHog] Initializing with:', {
    key: posthogKey ? `${posthogKey.substring(0, 10)}...` : 'NOT SET',
    host: posthogHost,
    environment: process.env.NODE_ENV,
    hasKey: !!posthogKey,
    keyLength: posthogKey?.length || 0
  });

  if (!posthogKey) {
    console.warn('[PostHog] NEXT_PUBLIC_POSTHOG_KEY not found. Analytics will be disabled.');
    console.warn('[PostHog] To enable analytics, set NEXT_PUBLIC_POSTHOG_KEY in your deployment environment variables');
    // Return null to disable PostHog gracefully
    return null;
  }

  try {
    posthogClient = posthog.init(posthogKey, {
      api_host: posthogHost,
      capture_pageview: false,
      capture_pageleave: true,
      persistence: 'localStorage',
      autocapture: {
        dom_event_allowlist: ['click', 'submit'],
        element_allowlist: ['button', 'input', 'select', 'textarea', 'a']
      },
      loaded: (posthog) => {
        console.log('[PostHog] Successfully loaded!');
        console.log('[PostHog] Session ID:', posthog.get_session_id());
        console.log('[PostHog] Distinct ID:', posthog.get_distinct_id());
        console.log('[PostHog] Available methods:', Object.keys(posthog).filter(k => typeof posthog[k] === 'function').join(', '));
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[PostHog] Enabling debug mode for development');
          if (typeof posthog.debug === 'function') {
            posthog.debug();
          }
        }
      },
      bootstrap: {
        distinctID: undefined,
        isIdentifiedID: false
      },
      // Additional configuration for better compatibility
      disable_session_recording: false,
      session_recording: {
        maskAllInputs: false,
        maskTextContent: false,
        // Add blob URL support for web workers
        recordCrossOriginIframes: false
      },
      // Opt out of using web workers if they cause issues
      opt_out_useWorker: true
    });

    console.log('[PostHog] Client initialized successfully');
    
    // Add debug helper to window in development
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      window.posthogDebug = {
        client: posthogClient,
        checkConfig: () => {
          console.log('=== PostHog Debug Info ===');
          console.log('API Key:', posthogKey ? `${posthogKey.substring(0, 10)}...` : 'NOT SET');
          console.log('API Host:', posthogHost);
          console.log('Distinct ID:', typeof posthogClient.get_distinct_id === 'function' ? posthogClient.get_distinct_id() : 'Method not available');
          console.log('Session ID:', typeof posthogClient.get_session_id === 'function' ? posthogClient.get_session_id() : 'Method not available');
          console.log('Queue Length:', posthogClient._request_queue?.length || 0);
          console.log('LocalStorage Keys:', Object.keys(localStorage).filter(k => k.includes('posthog')));
          console.log('Is Identified:', typeof posthogClient._isIdentified === 'function' ? posthogClient._isIdentified() : 'Method not available');
          console.log('========================');
        },
        sendTestEvent: () => {
          console.log('Sending test event...');
          posthogClient.capture('debug_test_event', {
            timestamp: new Date().toISOString(),
            random: Math.random()
          });
          console.log('Test event sent! Check PostHog dashboard.');
        },
        forceFlush: () => {
          console.log('Forcing flush...');
          if (typeof posthogClient.flush === 'function') {
            posthogClient.flush();
            console.log('Flush complete!');
          } else {
            console.warn('flush() method not available');
          }
        }
      };
      console.log('[PostHog] Debug helper added to window.posthogDebug');
    }
    
    // Test capture to verify connection
    setTimeout(() => {
      console.log('[PostHog] Sending test event to verify connection...');
      posthogClient.capture('posthog_initialization_test', {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        host: window.location.host
      });
    }, 1000);
    
  } catch (error) {
    console.error('[PostHog] Failed to initialize:', error);
    return null;
  }

  return posthogClient;
}

export function identifyUser(user) {
  console.log('[PostHog] identifyUser called with:', user ? {
    id: user.sub || user.id,
    email: user.email,
    name: user.name,
    tenant_id: user.tenant_id || user.tenantId
  } : 'NO USER');

  if (!posthogClient) {
    console.error('[PostHog] Cannot identify user - PostHog client not initialized');
    return;
  }

  if (!user) {
    console.error('[PostHog] Cannot identify user - user object is null/undefined');
    return;
  }

  // Extract user ID - prefer sub, then id, then email
  const userId = user.sub || user.id || user.email;
  
  // Build complete name from various sources
  const firstName = user.firstName || user.first_name || user.given_name || '';
  const lastName = user.lastName || user.last_name || user.family_name || '';
  const fullName = user.name || `${firstName} ${lastName}`.trim() || user.email?.split('@')[0] || 'User';
  
  const userProperties = {
    email: user.email,
    name: fullName,
    first_name: firstName,
    last_name: lastName,
    tenant_id: user.tenant_id || user.tenantId,
    tenant_name: user.tenant_name || user.tenantName || user.businessName || user.business_name,
    subscription_plan: user.subscription_plan || user.subscriptionPlan,
    onboarding_completed: user.onboarding_completed || user.onboardingCompleted || !user.needsOnboarding,
    created_at: user.created_at || user.createdAt,
    role: user.role || 'USER',
    business_name: user.businessName || user.business_name,
    user_id: userId
  };

  // Filter out undefined/null/empty values
  Object.keys(userProperties).forEach(key => {
    if (userProperties[key] === undefined || userProperties[key] === null || userProperties[key] === '') {
      delete userProperties[key];
    }
  });

  console.log('[PostHog] Identifying user:', userId, 'with properties:', userProperties);
  
  try {
    // Reset any previous identification to ensure clean state
    posthogClient.reset(false); // false = don't generate new anonymous ID
    
    // Identify the user
    posthogClient.identify(userId, userProperties);
    console.log('[PostHog] User identified successfully');
    
    // Set super properties that persist across all events
    posthogClient.register({
      user_email: user.email,
      user_name: fullName,
      user_role: user.role || 'USER',
      tenant_id: user.tenant_id || user.tenantId
    });
    
    // Force capture an event to ensure identification is sent immediately
    posthogClient.capture('$identify', {
      ...userProperties,
      identification_source: 'auth_flow',
      timestamp: new Date().toISOString()
    });
    
    // Try to send events immediately
    // Note: flush() may not be available in all PostHog versions
    if (typeof posthogClient.flush === 'function') {
      try {
        posthogClient.flush();
      } catch (flushError) {
        console.warn('[PostHog] flush() failed:', flushError);
      }
    } else if (typeof posthogClient._send_request === 'function') {
      // Alternative method for older versions
      try {
        posthogClient._send_request();
      } catch (sendError) {
        console.warn('[PostHog] _send_request() failed:', sendError);
      }
    } else {
      // Events will be sent on next batch interval
      console.log('[PostHog] Events queued for batch sending');
    }
  } catch (error) {
    console.error('[PostHog] Failed to identify user:', error);
  }
}

export function resetUser() {
  console.log('[PostHog] resetUser called');
  
  if (!posthogClient) {
    console.error('[PostHog] Cannot reset user - PostHog client not initialized');
    return;
  }
  
  try {
    posthogClient.reset();
    console.log('[PostHog] User reset successfully');
  } catch (error) {
    console.error('[PostHog] Failed to reset user:', error);
  }
}

export function captureEvent(eventName, properties = {}) {
  console.log('[PostHog] captureEvent called:', eventName, properties);
  
  if (!posthogClient) {
    console.error('[PostHog] Cannot capture event - PostHog client not initialized');
    return;
  }
  
  try {
    posthogClient.capture(eventName, properties);
    console.log('[PostHog] Event captured successfully:', eventName);
  } catch (error) {
    console.error('[PostHog] Failed to capture event:', eventName, error);
  }
}

export function capturePageView(pageName, properties = {}) {
  console.log('[PostHog] capturePageView called:', pageName, properties);
  
  if (!posthogClient) {
    console.error('[PostHog] Cannot capture pageview - PostHog client not initialized');
    return;
  }
  
  const pageViewData = {
    $current_url: window.location.href,
    page_name: pageName,
    ...properties
  };
  
  console.log('[PostHog] Capturing pageview with data:', pageViewData);
  
  try {
    posthogClient.capture('$pageview', pageViewData);
    console.log('[PostHog] Pageview captured successfully');
  } catch (error) {
    console.error('[PostHog] Failed to capture pageview:', error);
  }
}

// PostHogProvider is exported from components/PostHogWrapper.js instead