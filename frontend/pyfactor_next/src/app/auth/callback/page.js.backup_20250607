'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Auth0CallbackPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState('Completing authentication...');
  const [redirectHandled, setRedirectHandled] = useState(false);

  useEffect(() => {
    const handleCallback = async () => {
      // Prevent multiple redirects
      if (redirectHandled) {
        return;
      }

      try {
        setStatus('Verifying authentication...');
        
        // Get session from our session API route (returns { user, accessToken, idToken })
        const sessionResponse = await fetch('/api/auth/session');
        
        if (!sessionResponse.ok) {
          throw new Error(`Session API returned ${sessionResponse.status}`);
        }
        
        const sessionData = await sessionResponse.json();
        
        if (!sessionData || !sessionData.user) {
          throw new Error('No user session found');
        }
        
        setUser(sessionData);
        
        console.log('[Auth0Callback] Authentication successful, session data:', {
          hasUser: !!sessionData.user,
          hasAccessToken: !!sessionData.accessToken,
          email: sessionData.user?.email
        });
        
        setStatus('Loading your profile...');
        
        // Get access token for backend API calls
        const tokenResponse = await fetch('/api/auth/access-token');
        let accessToken = null;
        
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          accessToken = tokenData.access_token;
        }
        
        // Get complete user profile from backend
        let backendUser;
        try {
          setStatus('Setting up your account...');
          console.log('[Auth0Callback] Creating user in Django backend');
          
          const createUserResponse = await fetch('/api/user/create-auth0-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (createUserResponse.ok) {
            const createUserData = await createUserResponse.json();
            console.log('[Auth0Callback] User creation result:', {
              success: createUserData.success,
              tenantId: createUserData.tenant_id,
              currentStep: createUserData.current_step,
              isExistingUser: createUserData.isExistingUser
            });
            
            backendUser = {
              email: sessionData.user.email,
              sub: sessionData.user.sub,
              name: sessionData.user.name,
              picture: sessionData.user.picture,
              tenantId: createUserData.tenant_id,
              needsOnboarding: createUserData.needs_onboarding !== false,
              onboardingCompleted: createUserData.onboardingCompleted || !createUserData.needs_onboarding,
              currentStep: createUserData.current_step || 'business_info',
              isNewUser: createUserData.success ? !createUserData.isExistingUser : false
            };
            
            console.log('[Auth0Callback] Updated backend user with Django data:', backendUser);
          } else {
            console.warn('[Auth0Callback] User creation failed, checking if user exists');
            
            // Try to get existing user data from the response
            try {
              const errorData = await createUserResponse.json();
              if (errorData.fallback && errorData.tenant_id) {
                console.log('[Auth0Callback] Using fallback tenant ID:', errorData.tenant_id);
                backendUser = {
                  email: sessionData.user.email,
                  sub: sessionData.user.sub,
                  name: sessionData.user.name,
                  picture: sessionData.user.picture,
                  tenantId: errorData.tenant_id,
                  needsOnboarding: true,
                  onboardingCompleted: false,
                  currentStep: 'business_info',
                  isNewUser: !errorData.isExistingUser
                };
              }
            } catch (parseError) {
              console.error('[Auth0Callback] Error parsing create user response:', parseError);
            }
          }
        } catch (createUserError) {
          console.error('[Auth0Callback] Error creating user in backend:', createUserError);
          // Continue with default values
        }
        
        // If we still don't have backend user data, try the original endpoint
        if (!backendUser || !backendUser.tenantId) {
          try {
            const userResponse = await fetch('/api/user/current', {
              headers: {
                'Authorization': `Bearer ${accessToken || 'session-token'}`,
                'Content-Type': 'application/json',
              },
            });
            
            if (userResponse.ok) {
              const existingUser = await userResponse.json();
              console.log('[Auth0Callback] Found existing user data:', existingUser);
              
              backendUser = {
                email: existingUser.email || sessionData.user.email,
                sub: existingUser.sub || sessionData.user.sub,
                name: existingUser.name || sessionData.user.name,
                picture: existingUser.picture || sessionData.user.picture,
                tenantId: existingUser.tenant_id || existingUser.tenantId,
                needsOnboarding: existingUser.needs_onboarding !== false,
                onboardingCompleted: existingUser.onboarding_completed || false,
                currentStep: existingUser.current_step || 'business_info',
                isNewUser: !existingUser.tenant_id
              };
            }
          } catch (error) {
            console.log('[Auth0Callback] Backend user fetch failed:', error);
          }
        }
        
        // Final fallback if we still don't have backend user data
        if (!backendUser) {
          console.log('[Auth0Callback] Using fallback user data');
          backendUser = {
            email: sessionData.user.email,
            sub: sessionData.user.sub,
            name: sessionData.user.name,
            picture: sessionData.user.picture,
            needsOnboarding: true,
            tenantId: null,
            onboardingCompleted: false,
            currentStep: 'business_info',
            isNewUser: true
          };
        }
        
        console.log('[Auth0Callback] Backend user data:', backendUser);
        
        console.log('[Auth0Callback] User profile loaded:', {
          email: backendUser.email,
          needsOnboarding: backendUser.needsOnboarding,
          onboardingCompleted: backendUser.onboardingCompleted,
          tenantId: backendUser.tenantId,
          isNewUser: backendUser.isNewUser
        });
        
        // Mark redirect as handled to prevent loops
        setRedirectHandled(true);
        
        // 🎯 Smart Routing Logic Implementation
        
        // 1. Check latest onboarding status from profile API (most reliable source)
        let latestOnboardingStatus = null;
        try {
          setStatus('Checking onboarding status...');
          const profileResponse = await fetch('/api/auth/profile');
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            console.log('[Auth0Callback] Latest profile data:', {
              needsOnboarding: profileData.needsOnboarding,
              onboardingCompleted: profileData.onboardingCompleted,
              currentStep: profileData.currentStep
            });
            
            latestOnboardingStatus = {
              needsOnboarding: profileData.needsOnboarding,
              onboardingCompleted: profileData.onboardingCompleted,
              currentStep: profileData.currentStep
            };
            
            // Update backend user with latest status
            if (latestOnboardingStatus.onboardingCompleted === true) {
              backendUser.onboardingCompleted = true;
              backendUser.needsOnboarding = false;
            }
          }
        } catch (profileError) {
          console.warn('[Auth0Callback] Could not fetch latest profile:', profileError);
        }
        
        // 2. COMPLETED USER - Go directly to dashboard
        if (backendUser.tenantId && (backendUser.onboardingCompleted || (latestOnboardingStatus && latestOnboardingStatus.onboardingCompleted))) {
          setStatus('Loading your dashboard...');
          console.log('[Auth0Callback] User has completed onboarding, redirecting to tenant dashboard');
          
          setTimeout(() => {
            router.push(`/tenant/${backendUser.tenantId}/dashboard`);
          }, 1500);
          return;
        }
        
        // **ENHANCED: Check if this is an existing user with completed onboarding**
        if (backendUser.tenantId && !backendUser.isNewUser && (latestOnboardingStatus?.needsOnboarding === false || latestOnboardingStatus?.onboardingCompleted === true)) {
          setStatus('Welcome back! Loading your dashboard...');
          console.log('[Auth0Callback] Existing user with completed onboarding, redirecting to tenant dashboard');
          
          setTimeout(() => {
            router.push(`/tenant/${backendUser.tenantId}/dashboard`);
          }, 1500);
          return;
        }
        
        // 3. NEW USER - No tenant or needs onboarding  
        if (backendUser.isNewUser || backendUser.needsOnboarding || !backendUser.tenantId) {
          setStatus('Setting up your account...');
          console.log('[Auth0Callback] New user detected, redirecting to onboarding');
          
          setTimeout(() => {
            router.push('/onboarding/business-info');
          }, 1500);
          return;
        }
        
        // 4. RETURNING USER WITH INCOMPLETE ONBOARDING
        if (backendUser.tenantId && !backendUser.onboardingCompleted) {
          try {
            setStatus('Checking your setup progress...');
            
            const onboardingResponse = await fetch(`/api/onboarding/status?tenantId=${backendUser.tenantId}`, {
              headers: {
                'Authorization': `Bearer ${accessToken || 'session-token'}`,
                'Content-Type': 'application/json',
              },
            });
            
            if (onboardingResponse.ok) {
              const onboardingStatus = await onboardingResponse.json();
              
              if (onboardingStatus && onboardingStatus.status !== 'completed') {
                setStatus('Resuming your setup...');
                const currentStep = onboardingStatus.currentStep || 'business_info';
                
                const stepRoutes = {
                  business_info: '/onboarding/business-info',
                  subscription: '/onboarding/subscription', 
                  payment: '/onboarding/payment',
                  setup: '/onboarding/setup',
                  completed: `/tenant/${backendUser.tenantId}/dashboard`
                };
                
                const resumeRoute = stepRoutes[currentStep] || '/onboarding/business-info';
                console.log('[Auth0Callback] Resuming onboarding at step:', currentStep, 'route:', resumeRoute);
                
                setTimeout(() => {
                  router.push(resumeRoute);
                }, 1500);
                return;
              }
            }
          } catch (error) {
            console.warn('[Auth0Callback] Could not check onboarding status:', error);
            // Fallback to business info if onboarding status check fails
            setTimeout(() => {
              router.push('/onboarding/business-info');
            }, 1500);
            return;
          }
        }
        
        // 5. Fallback: Something went wrong, go to generic dashboard
        setStatus('Loading dashboard...');
        console.warn('[Auth0Callback] Fallback routing to generic dashboard');
        
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
        
      } catch (error) {
        console.error('[Auth0Callback] Error in callback handler:', error);
        setError(error.message || 'Authentication failed');
        setIsLoading(false);
        
        // Delay redirect to show error
        setTimeout(() => {
          router.push('/auth/signin?error=callback_failed');
        }, 3000);
      } finally {
        setIsLoading(false);
      }
    };

    handleCallback();
  }, [router, redirectHandled]);

  // Show loading while processing
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
        <h2 className="text-xl font-semibold text-gray-900">Authenticating...</h2>
        <p className="text-gray-600">{status}</p>
        
        {user && (
          <div className="text-sm text-gray-600 mt-4">
            <p>Welcome back, {user.name || user.email}!</p>
          </div>
        )}
        
        {error ? (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">{error}</p>
            <p className="text-red-600 text-xs mt-1">Redirecting to sign in...</p>
          </div>
        ) : (
          <div className="text-sm text-gray-500 space-y-1 mt-6">
            <p>🎯 Smart routing in progress...</p>
            <div className="text-xs text-left bg-gray-100 p-2 rounded max-w-xs mx-auto">
              <div>✓ New User → /onboarding/business-info</div>
              <div>✓ Incomplete → Resume at current step</div>
              <div>✓ Complete → /tenant/[id]/dashboard</div>
              <div>✓ Fallback → /dashboard</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}