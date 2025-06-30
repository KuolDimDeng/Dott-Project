import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';

let posthogClient = null;

export function initPostHog() {
  if (typeof window === 'undefined') return null;
  if (posthogClient) return posthogClient;

  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

  if (!posthogKey) {
    console.warn('PostHog key not found. Analytics will be disabled.');
    return null;
  }

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
      if (process.env.NODE_ENV === 'development') {
        posthog.debug();
      }
    }
  });

  return posthogClient;
}

export function identifyUser(user) {
  if (!posthogClient || !user) return;

  posthogClient.identify(user.sub || user.id, {
    email: user.email,
    name: user.name,
    tenant_id: user.tenant_id,
    tenant_name: user.tenant_name,
    subscription_plan: user.subscription_plan,
    onboarding_completed: user.onboarding_completed,
    created_at: user.created_at,
    role: user.role
  });
}

export function resetUser() {
  if (!posthogClient) return;
  posthogClient.reset();
}

export function captureEvent(eventName, properties = {}) {
  if (!posthogClient) return;
  posthogClient.capture(eventName, properties);
}

export function capturePageView(pageName, properties = {}) {
  if (!posthogClient) return;
  posthogClient.capture('$pageview', {
    $current_url: window.location.href,
    page_name: pageName,
    ...properties
  });
}

export { PostHogProvider };