'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BusinessInfoStep from './steps/BusinessInfoStep';
import SubscriptionStep from './steps/SubscriptionStep';
import SetupCompleteStep from './steps/SetupCompleteStep';
import { sessionManager } from '@/utils/sessionManager';
import { logger } from '@/utils/logger';

export default function SimplifiedOnboardingForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState('business_info');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    businessName: '',
    businessType: '',
    industry: '',
    country: 'US',
    subscriptionPlan: 'free'
  });

  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log('[SimplifiedOnboardingForm] Checking session...');
        
        // Check for session
        const localSession = sessionManager.getSession();
        const accessToken = sessionManager.getAccessToken();
        
        console.log('[SimplifiedOnboardingForm] Session check:', {
          hasLocalSession: !!localSession,
          hasAccessToken: !!accessToken
        });
        
        if (!localSession && !accessToken) {
          console.log('[SimplifiedOnboardingForm] No session found, redirecting to login');
          router.push('/auth/email-signin');
          return;
        }

        // Get profile data
        const profileResponse = await fetch('/api/auth/profile', {
          headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}
        });

        if (profileResponse.ok) {
          const profile = await profileResponse.json();
          console.log('[SimplifiedOnboardingForm] Profile data:', {
            email: profile?.email,
            currentStep: profile?.currentStep,
            onboardingCompleted: profile?.onboardingCompleted,
            tenantId: profile?.tenantId
          });
          
          if (profile.onboardingCompleted && profile.tenantId) {
            console.log('[SimplifiedOnboardingForm] Onboarding already completed, redirecting');
            router.push(`/tenant/${profile.tenantId}/dashboard`);
            return;
          }
          
          // Set current step from profile
          if (profile.currentStep) {
            setCurrentStep(profile.currentStep);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('[SimplifiedOnboardingForm] Error checking session:', error);
        setError('Failed to load session data');
        setLoading(false);
      }
    };

    checkSession();
  }, [router]);

  const handleBusinessInfoComplete = async (data) => {
    console.log('[SimplifiedOnboardingForm] Business info completed:', data);
    setFormData(prev => ({ ...prev, ...data }));
    setCurrentStep('subscription');
  };

  const handleSubscriptionComplete = async (data) => {
    console.log('[SimplifiedOnboardingForm] Subscription selected:', data);
    setFormData(prev => ({ ...prev, ...data }));
    
    try {
      setLoading(true);
      
      // Get session info
      const session = sessionManager.getSession();
      const accessToken = sessionManager.getAccessToken();
      
      console.log('[SimplifiedOnboardingForm] Completing onboarding with data:', {
        ...formData,
        ...data
      });
      
      // Complete onboarding
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({
          ...formData,
          ...data,
          email: session?.user?.email
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete onboarding');
      }

      const result = await response.json();
      console.log('[SimplifiedOnboardingForm] Onboarding complete:', result);
      
      if (result.tenantId) {
        // Update local session
        if (session) {
          session.user.tenantId = result.tenantId;
          session.user.onboardingCompleted = true;
          session.user.needsOnboarding = false;
          sessionManager.saveSession(session);
        }
        
        setCurrentStep('complete');
        
        // Redirect after a short delay
        setTimeout(() => {
          router.push(`/tenant/${result.tenantId}/dashboard`);
        }, 2000);
      }
    } catch (error) {
      console.error('[SimplifiedOnboardingForm] Error completing onboarding:', error);
      setError(error.message || 'Failed to complete onboarding');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => router.push('/auth/email-signin')}
            className="mt-4 text-blue-600 hover:underline"
          >
            Return to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {currentStep === 'business_info' && (
        <BusinessInfoStep 
          onComplete={handleBusinessInfoComplete}
          initialData={formData}
        />
      )}
      
      {currentStep === 'subscription' && (
        <SubscriptionStep 
          onComplete={handleSubscriptionComplete}
          onBack={() => setCurrentStep('business_info')}
          initialData={formData}
        />
      )}
      
      {currentStep === 'complete' && (
        <SetupCompleteStep 
          businessName={formData.businessName}
          subscriptionPlan={formData.subscriptionPlan}
        />
      )}
    </div>
  );
}