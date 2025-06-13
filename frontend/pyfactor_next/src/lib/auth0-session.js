// Re-export commonly used Auth0 functions
export { 
  getSession,
  getAccessToken,
  withApiAuthRequired,
  withPageAuthRequired
} from '@auth0/nextjs-auth0';

// Custom function to check onboarding status
export async function checkOnboardingStatus(req, res) {
  try {
    const session = await getSession(req, res);
    if (!session || !session.user) {
      return { isAuthenticated: false, needsOnboarding: true };
    }

    // Check user metadata for onboarding status
    const userMetadata = session.user.user_metadata || {};
    const onboardingCompleted = userMetadata.onboarding_completed || false;
    
    // Also check app metadata
    const appMetadata = session.user.app_metadata || {};
    const tenantId = appMetadata.tenant_id || userMetadata.tenant_id;

    return {
      isAuthenticated: true,
      needsOnboarding: !onboardingCompleted,
      tenantId,
      user: session.user,
    };
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return { isAuthenticated: false, needsOnboarding: true };
  }
}