import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';

let posthogClient = null;

export function initPostHog() {
  if (typeof window === 'undefined') {
    console.log('[PostHog] Running on server, skipping initialization');
    return null;
  }
  
  if (posthogClient) {
    console.log('[PostHog] Client already initialized, returning existing instance');
    return posthogClient;
  }

  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

  console.log('[PostHog] Initializing with:', {
    key: posthogKey ? `${posthogKey.substring(0, 10)}...` : 'NOT SET',
    host: posthogHost,
    environment: process.env.NODE_ENV
  });

  if (!posthogKey) {
    console.error('[PostHog] NEXT_PUBLIC_POSTHOG_KEY not found. Analytics will be disabled.');
    console.error('[PostHog] Please set NEXT_PUBLIC_POSTHOG_KEY in your environment variables');
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
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[PostHog] Enabling debug mode for development');
          posthog.debug();
        }
      },
      bootstrap: {
        distinctID: undefined,
        isIdentifiedID: false
      }
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
          console.log('Distinct ID:', posthogClient.get_distinct_id());
          console.log('Session ID:', posthogClient.get_session_id());
          console.log('Queue Length:', posthogClient._request_queue?.length || 0);
          console.log('LocalStorage Keys:', Object.keys(localStorage).filter(k => k.includes('posthog')));
          console.log('Is Identified:', posthogClient._isIdentified());
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
          posthogClient.flush();
          console.log('Flush complete!');
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
    tenant_id: user.tenant_id
  } : 'NO USER');

  if (!posthogClient) {
    console.error('[PostHog] Cannot identify user - PostHog client not initialized');
    return;
  }

  if (!user) {
    console.error('[PostHog] Cannot identify user - user object is null/undefined');
    return;
  }

  const userId = user.sub || user.id;
  const userProperties = {
    email: user.email,
    name: user.name,
    tenant_id: user.tenant_id,
    tenant_name: user.tenant_name,
    subscription_plan: user.subscription_plan,
    onboarding_completed: user.onboarding_completed,
    created_at: user.created_at,
    role: user.role
  };

  console.log('[PostHog] Identifying user:', userId, 'with properties:', userProperties);
  
  try {
    posthogClient.identify(userId, userProperties);
    console.log('[PostHog] User identified successfully');
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

export { PostHogProvider };