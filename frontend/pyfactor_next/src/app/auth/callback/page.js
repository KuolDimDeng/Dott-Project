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
        
        // Get session from our API route
        const sessionResponse = await fetch('/api/auth/profile');
        
        if (!sessionResponse.ok) {
          throw new Error(`Session API returned ${sessionResponse.status}`);
        }
        
        const sessionData = await sessionResponse.json();
        
        if (!sessionData) {
          throw new Error('No user session found');
        }
        
        setUser(sessionData);
        
        console.log('[Auth0Callback] Processing Auth0 callback for user:', {
          email: sessionData.email,
          sub: sessionData.sub
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
          const userResponse = await fetch('/api/user/current', {
            headers: {
              'Authorization': `Bearer ${accessToken || 'session-token'}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (userResponse.ok) {
            backendUser = await userResponse.json();
            console.log('[Auth0Callback] Backend user data:', backendUser);
          } else {
            throw new Error(`Backend API returned ${userResponse.status}`);
          }
        } catch (error) {
          console.log('[Auth0Callback] Backend user fetch failed, treating as new user:', error);
          // If backend fails, treat as new user
          backendUser = {
            email: sessionData.email,
            sub: sessionData.sub,
            needsOnboarding: true,
            tenantId: null,
            onboardingCompleted: false,
            isNewUser: true
          };
        }
        
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
        
        // 1. NEW USER - No tenant or needs onboarding
        if (backendUser.needsOnboarding || !backendUser.tenantId || !backendUser.onboardingCompleted || backendUser.isNewUser) {
          setStatus('Setting up your account...');
          console.log('[Auth0Callback] New user detected, redirecting to onboarding');
          
          setTimeout(() => {
            router.push('/onboarding/business-info');
          }, 1500);
          return;
        }
        
        // 2. RETURNING USER WITH INCOMPLETE ONBOARDING
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
        
        // 3. EXISTING USER (COMPLETE) - Go to tenant dashboard
        if (backendUser.tenantId && backendUser.onboardingCompleted) {
          setStatus('Loading your dashboard...');
          console.log('[Auth0Callback] Complete user, redirecting to tenant dashboard');
          
          setTimeout(() => {
            router.push(`/tenant/${backendUser.tenantId}/dashboard`);
          }, 1500);
          return;
        }
        
        // 4. Fallback: Something went wrong, go to generic dashboard
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