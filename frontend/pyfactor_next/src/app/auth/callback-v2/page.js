'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CallbackV2() {
  const router = useRouter();
  
  useEffect(() => {
    async function handleCallback() {
      try {
        console.log('[Callback-V2] Checking session status...');
        
        // Check session status using our new endpoint
        const response = await fetch('/api/auth/session-v3', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          console.error('[Callback-V2] Not authenticated, redirecting to signin');
          router.push('/auth/signin?error=auth_failed');
          return;
        }
        
        const data = await response.json();
        console.log('[Callback-V2] Session valid:', {
          authenticated: data.authenticated,
          userId: data.user?.id,
          email: data.user?.email,
          onboardingCompleted: data.user?.onboarding_completed
        });
        
        // Check onboarding status from backend (single source of truth)
        if (!data.user?.onboarding_completed) {
          console.log('[Callback-V2] Onboarding not complete, redirecting to onboarding');
          router.push('/onboarding');
        } else {
          console.log('[Callback-V2] Onboarding complete, redirecting to dashboard');
          // Get tenant ID for dashboard redirect
          const tenantId = data.user?.tenant_id || data.user?.tenantId;
          if (tenantId) {
            router.push(`/${tenantId}/dashboard`);
          } else {
            // Fallback to generic dashboard
            router.push('/dashboard');
          }
        }
        
      } catch (error) {
        console.error('[Callback-V2] Error:', error);
        router.push('/auth/signin?error=unexpected_error');
      }
    }
    
    handleCallback();
  }, [router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <h2 className="text-xl font-semibold text-gray-900">Setting up your account</h2>
        <p className="text-gray-600">Please wait while we prepare your dashboard...</p>
      </div>
    </div>
  );
}