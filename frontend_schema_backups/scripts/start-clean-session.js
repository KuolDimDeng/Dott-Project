/**
 * Script to provide instructions for starting a clean session
 * with the circuit breaker enabled.
 */

// For browser console use
function startCleanSession() {
  console.log('Starting clean session...');

  // Clear localStorage
  try {
    localStorage.clear();
    console.log('✅ localStorage cleared');
  } catch (err) {
    console.error('❌ Failed to clear localStorage:', err);
  }

  // Clear sessionStorage
  try {
    sessionStorage.clear();
    console.log('✅ sessionStorage cleared');
  } catch (err) {
    console.error('❌ Failed to clear sessionStorage:', err);
  }

  // Clear cookies
  try {
    document.cookie.split(';').forEach(cookie => {
      const [name] = cookie.trim().split('=');
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; samesite=lax`;
    });
    console.log('✅ Cookies cleared');
  } catch (err) {
    console.error('❌ Failed to clear cookies:', err);
  }

  // Navigate to sign-in with circuit breaker
  try {
    const signInUrl = new URL('/auth/signin', window.location.origin);
    signInUrl.searchParams.set('noloop', 'true');
    console.log(`✅ Navigating to: ${signInUrl.toString()}`);
    window.location.href = signInUrl.toString();
  } catch (err) {
    console.error('❌ Failed to navigate:', err);
    console.log('Please manually navigate to: /auth/signin?noloop=true');
  }

  return 'Starting clean session...';
}

// Console output
console.log(`
========================================
🛑 CLEAN SESSION STARTER 🛑
========================================

To start a clean session:

1. Open your browser developer tools (F12 or Cmd+Opt+I)
2. Go to the Console tab
3. Copy and paste this function:

startCleanSession();

4. Press Enter to execute

This will:
- Clear localStorage, sessionStorage, and cookies
- Navigate to the sign-in page with the circuit breaker enabled

Or, manually navigate to:
http://localhost:3000/auth/signin?noloop=true

After signing in, use these URLs for navigation:
- Business Info: http://localhost:3000/onboarding/business-info?noloop=true
- Subscription: http://localhost:3000/onboarding/subscription?noloop=true
- Dashboard: http://localhost:3000/dashboard?noloop=true

========================================
`);

// If in Node.js environment
if (typeof window === 'undefined') {
  console.log('Run your development server with:');
  console.log('  ./reset-and-run.sh');
  console.log('Then open http://localhost:3000/auth/signin?noloop=true in your browser');
} 