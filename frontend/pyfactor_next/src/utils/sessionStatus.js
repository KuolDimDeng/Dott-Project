/**
 * Client-side utility to check onboarding status from non-httpOnly cookie
 */
export function getOnboardingStatus() {
  if (typeof window === 'undefined') return null;
  
  try {
    // Get the onboarding_status cookie
    const cookies = document.cookie.split(';');
    const statusCookie = cookies.find(c => c.trim().startsWith('onboarding_status='));
    
    if (!statusCookie) return null;
    
    const value = statusCookie.split('=')[1];
    const decoded = decodeURIComponent(value);
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Failed to parse onboarding status:', error);
    return null;
  }
}

/**
 * Log current session status for debugging
 */
export function logSessionStatus() {
  const status = getOnboardingStatus();
  console.log('[SessionStatus] Client-side onboarding status:', status);
  
  // Also log all cookies (for debugging)
  if (typeof window !== 'undefined') {
    console.log('[SessionStatus] All cookies:', document.cookie);
  }
  
  return status;
}