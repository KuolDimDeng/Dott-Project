import { 
  getSession as auth0GetSession,
  getAccessToken as auth0GetAccessToken,
  withApiAuthRequired as auth0WithApiAuthRequired,
  withPageAuthRequired as auth0WithPageAuthRequired,
  handleAuth,
  handleLogin,
  handleLogout,
  handleCallback,
  handleProfile
} from '@auth0/nextjs-auth0';

// Export Auth0 functions directly
export const getSession = auth0GetSession;
export const getAccessToken = auth0GetAccessToken;
export const withApiAuthRequired = auth0WithApiAuthRequired;
export const withPageAuthRequired = auth0WithPageAuthRequired;
export { handleAuth, handleLogin, handleLogout, handleCallback, handleProfile };

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