#!/usr/bin/env node

// Test script to verify PostHog environment variables

console.log('=== PostHog Environment Test ===');
console.log('');

// Check environment variables
const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

console.log('NEXT_PUBLIC_POSTHOG_KEY:', posthogKey ? `${posthogKey.substring(0, 10)}... (${posthogKey.length} chars)` : 'NOT SET');
console.log('NEXT_PUBLIC_POSTHOG_HOST:', posthogHost || 'NOT SET');
console.log('');

// Show all NEXT_PUBLIC_ variables
console.log('All NEXT_PUBLIC_ variables:');
Object.keys(process.env)
  .filter(key => key.startsWith('NEXT_PUBLIC_'))
  .forEach(key => {
    const value = process.env[key];
    console.log(`  ${key}: ${value ? 'SET' : 'NOT SET'}`);
  });

console.log('');
console.log('=== End Test ===');