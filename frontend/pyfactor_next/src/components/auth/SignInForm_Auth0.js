'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { logger } from '@/utils/logger';
import { TextField, Button, CircularProgress, Alert } from '@/components/ui/TailwindComponents';
import { getCurrentUser } from '@/services/userService';
import { getOnboardingStatus } from '@/services/api/onboarding';

export default function SignInForm({ redirectPath, plan }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const router = useRouter();

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        setIsCheckingAuth(true);
        
        // Check if user is authenticated
        const user = await getCurrentUser();
        
        if (user) {
          logger.debug('[SignInForm] User already authenticated:', user.email);
          
          // Check onboarding status
          if (user.needsOnboarding) {
            logger.debug('[SignInForm] User needs onboarding');
            router.push('/onboarding/business-info');
          } else if (user.tenantId) {
            logger.debug('[SignInForm] User has tenant, redirecting to dashboard');
            router.push(`/tenant/${user.tenantId}/dashboard`);
          } else {
            // Fallback - check onboarding status from API
            const status = await getOnboardingStatus();
            handleOnboardingRedirect(status);
          }
        }
      } catch (error) {
        logger.error('[SignInForm] Error checking auth:', error);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuthAndRedirect();
  }, [router]);

  const handleOnboardingRedirect = (status) => {
    if (!status) {
      router.push('/onboarding/business-info');
      return;
    }

    switch (status.current_step) {
      case 'business_info':
        router.push('/onboarding/business-info');
        break;
      case 'subscription':
        router.push('/onboarding/subscription');
        break;
      case 'payment':
        router.push('/onboarding/payment');
        break;
      case 'setup':
        router.push('/onboarding/setup');
        break;
      case 'completed':
        if (status.tenant_id) {
          router.push(`/tenant/${status.tenant_id}/dashboard`);
        } else {
          router.push('/dashboard');
        }
        break;
      default:
        router.push('/onboarding/business-info');
    }
  };

  const handleSignIn = () => {
    setIsLoading(true);
    // Redirect to Auth0 login
    window.location.href = '/api/auth/login';
  };

  const handleSignUp = () => {
    // Store plan in localStorage if provided
    if (plan) {
      localStorage.setItem('selectedPlan', plan);
    }
    // Redirect to Auth0 signup
    window.location.href = '/api/auth/login?screen_hint=signup';
  };

  if (isCheckingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <CircularProgress size={40} />
        <p className="mt-4 text-gray-600">Checking authentication...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to PyFactor</h1>
        <p className="text-gray-600">Sign in to access your account</p>
      </div>

      {error && (
        <Alert severity="error" className="mb-4">
          {error}
        </Alert>
      )}

      <div className="space-y-4">
        {/* Sign In with Auth0 */}
        <Button
          fullWidth
          size="large"
          onClick={handleSignIn}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white py-3"
        >
          {isLoading ? (
            <>
              <CircularProgress size={20} className="mr-2" />
              Redirecting to login...
            </>
          ) : (
            'Sign In with Auth0'
          )}
        </Button>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or</span>
          </div>
        </div>

        {/* Sign Up */}
        <div className="text-center">
          <p className="text-gray-600 mb-2">Don't have an account?</p>
          <Button
            fullWidth
            variant="outlined"
            size="large"
            onClick={handleSignUp}
            disabled={isLoading}
            className="border-blue-600 text-blue-600 hover:bg-blue-50 py-3"
          >
            Sign Up for Free
          </Button>
        </div>

        {/* Additional Options */}
        <div className="mt-6 text-center space-y-2">
          <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:underline">
            Forgot your password?
          </Link>
        </div>
      </div>

      {/* Auth0 Badge */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500">
          Secured by Auth0 • 
          <Link href="/privacy" className="ml-1 text-blue-600 hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>

      {/* Success Message for Testing */}
      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-green-800 text-sm text-center">
          🎉 Auth0 Integration Working! Click "Sign In" to authenticate.
        </p>
      </div>
    </div>
  );
}