/**
 * Example of backend-first authentication flow
 * This shows how to properly check onboarding status from backend
 */

import { checkOnboardingStatus, getRedirectUrl } from './onboardingCheck';

/**
 * Handle post-authentication flow with backend-first approach
 * @param {Object} authResult - Result from authentication
 * @param {Function} router - Next.js router
 */
export async function handlePostAuthFlow(authResult, router) {
    console.log('[AuthFlow] Starting backend-first post-auth flow...');
    
    try {
        // Step 1: Authentication is complete, user is signed in
        console.log('[AuthFlow] User authenticated:', authResult.email);
        
        // Step 2: Check onboarding status from backend (NOT from cookies/session)
        const onboardingStatus = await checkOnboardingStatus();
        
        console.log('[AuthFlow] Backend onboarding status:', {
            needsOnboarding: onboardingStatus.needsOnboarding,
            isComplete: onboardingStatus.isComplete,
            tenantId: onboardingStatus.tenantId
        });
        
        // Step 3: Determine where to redirect based on backend status
        const redirectUrl = getRedirectUrl(onboardingStatus);
        
        console.log('[AuthFlow] Redirecting to:', redirectUrl);
        
        // Step 4: Navigate to appropriate page
        router.push(redirectUrl);
        
        return {
            success: true,
            redirectUrl,
            onboardingStatus
        };
        
    } catch (error) {
        console.error('[AuthFlow] Error in post-auth flow:', error);
        
        // Default to onboarding if there's an error
        router.push('/onboarding');
        
        return {
            success: false,
            error: error.message,
            redirectUrl: '/onboarding'
        };
    }
}

/**
 * Example usage in a sign-in component
 */
export const signInExample = `
// In your sign-in component
import { handlePostAuthFlow } from '@/utils/authFlowBackendFirst';
import { useRouter } from 'next/navigation';

const SignInComponent = () => {
    const router = useRouter();
    
    const handleSignIn = async (credentials) => {
        try {
            // Step 1: Authenticate user
            const authResult = await api.post('/api/auth/authenticate', credentials);
            
            // Step 2: Handle post-auth flow (checks backend for onboarding status)
            await handlePostAuthFlow(authResult.data, router);
            
        } catch (error) {
            console.error('Sign in failed:', error);
        }
    };
    
    return (
        // Your sign-in form
    );
};
`;

/**
 * Example usage in middleware/route protection
 */
export const middlewareExample = `
// In your middleware or protected route
import { checkOnboardingStatus, getRedirectUrl } from '@/utils/onboardingCheck';

export async function checkAccess(request) {
    // Check if user is authenticated
    if (!isAuthenticated) {
        return redirectToSignIn();
    }
    
    // Check onboarding status from backend
    const status = await checkOnboardingStatus();
    
    // If needs onboarding and not on onboarding page, redirect
    if (status.needsOnboarding && !isOnboardingPage(request.url)) {
        return redirect('/onboarding');
    }
    
    // If onboarding complete and on onboarding page, redirect to dashboard
    if (!status.needsOnboarding && isOnboardingPage(request.url)) {
        return redirect(getRedirectUrl(status));
    }
    
    // Allow access
    return next();
}
`;