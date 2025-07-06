#!/usr/bin/env node

/**
 * Test script for Google OAuth flow
 * This script helps diagnose and test the Google OAuth authentication flow
 */

console.log('=== Google OAuth Test Script ===');
console.log('');
console.log('To test Google OAuth:');
console.log('1. Start the development server: pnpm dev');
console.log('2. Navigate to http://localhost:3000/auth/signin');
console.log('3. Click "Sign in with Google"');
console.log('4. Watch the console logs for:');
console.log('   - [Auth Login Route] logs in the terminal');
console.log('   - [OAuth Callback] logs in the browser console');
console.log('   - [Auth0 Exchange] logs in the terminal');
console.log('');
console.log('Common issues and fixes:');
console.log('');
console.log('1. "DNS Configuration Issue" error:');
console.log('   - This is now shown as "Service temporarily unavailable"');
console.log('   - Usually indicates backend connectivity issues');
console.log('');
console.log('2. "token_exchange_failed" error:');
console.log('   - Check console for redirect_uri mismatch');
console.log('   - The code now automatically tries both:');
console.log('     - /auth/oauth-callback');
console.log('     - /api/auth/callback');
console.log('');
console.log('3. Google OAuth configuration in Auth0:');
console.log('   - Ensure Google social connection is enabled');
console.log('   - Check allowed callback URLs include both:');
console.log('     - https://dottapps.com/auth/oauth-callback');
console.log('     - https://dottapps.com/api/auth/callback');
console.log('');
console.log('Environment variables needed:');
console.log('- NEXT_PUBLIC_AUTH0_DOMAIN');
console.log('- NEXT_PUBLIC_AUTH0_CLIENT_ID');
console.log('- AUTH0_CLIENT_SECRET');
console.log('- NEXT_PUBLIC_BASE_URL');
console.log('- NEXT_PUBLIC_API_URL');
console.log('');