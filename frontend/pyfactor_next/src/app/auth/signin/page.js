'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { logger } from '@/utils/logger';
import SignInForm from '@/components/auth/SignInForm';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { CircularProgress } from '@/components/ui/TailwindComponents';

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation();
  const [mode, setMode] = useState('signin');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    // Simple session check without redirect logic
    const fetchAuthStatus = async () => {
      try {
        // Check if coming from onboarding to remember the path
        const fromParam = searchParams.get('from');
        const stepParam = searchParams.get('step');
        
        if (fromParam === 'onboarding' || fromParam === 'business-info') {
          // Store the return path for after successful login
          localStorage.setItem('returnToOnboarding', 'true');
          // Store the specific step if available
          if (stepParam) {
            localStorage.setItem('onboardingStep', stepParam);
          } else {
            localStorage.setItem('onboardingStep', 'business-info');
          }
          
          // Set cookies for server-side access
          document.cookie = `returnToOnboarding=true;path=/;max-age=${60*60*24}`;
          document.cookie = `onboardingStep=${stepParam || 'business-info'};path=/;max-age=${60*60*24}`;
          
          logger.debug('[SignIn] Stored onboarding return path:', { step: stepParam || 'business-info' });
        }
        
        // Development mode - mock auth status
        if (process.env.NODE_ENV === 'development') {
          // Simulate not authenticated in development for testing login flow
          logger.debug('[SignIn] Development mode: showing login form');
          setIsLoading(false);
          return;
        }
        
        try {
          // Adding cache: 'no-store' to prevent cached responses
          const res = await fetch('/api/me', {
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
            cache: 'no-store'
          });
          
          if (res.ok) {
            const data = await res.json();
            if (data.user) {
              // Check if we need to return to onboarding
              const returnToOnboarding = localStorage.getItem('returnToOnboarding') === 'true';
              const onboardingStep = localStorage.getItem('onboardingStep') || 'business-info';
              
              if (returnToOnboarding) {
                // Clear the return flag
                localStorage.removeItem('returnToOnboarding');
                
                logger.debug('[SignIn] Redirecting back to onboarding step:', onboardingStep);
                router.push(`/onboarding/${onboardingStep}?from=signin&ts=${Date.now()}`);
                return;
              }
              
              // Otherwise, redirect to dashboard
              router.push('/dashboard');
              return;
            }
          }
        } catch (apiError) {
          logger.error('[SignIn] API error when checking auth status:', apiError);
          // Continue to show login form
        }
        
        // If we reach here, user is not authenticated - show the login form
        setIsLoading(false);
      } catch (err) {
        // On error, show the login form
        logger.error('[SignIn] Error checking auth status:', err);
        setIsLoading(false);
      }
    };
    
    fetchAuthStatus();
  }, [router, searchParams]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <CircularProgress size="xl" />
        <p className="mt-4 text-center text-gray-600">Loading your account...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 md:flex-row">
      {/* Top link to home (visible on all devices) */}
      <div className="absolute left-4 top-4 z-10">
        <Link href="/" className="flex items-center">
          <Image src="/static/images/Pyfactor.png" alt="Dott Logo" width={32} height={32} className="mr-2" />
          <span className="text-lg font-semibold">Dott</span>
        </Link>
      </div>
      
      {/* Left side - Sign in form */}
      <div className="flex w-full flex-col items-center justify-center px-4 py-12 md:w-1/2 md:px-10">
        {/* Sign in form */}
        <div className="w-full max-w-md">
          <div className="rounded-lg bg-white px-8 py-10 shadow-sm">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
              <p className="mt-2 text-sm text-gray-600">Sign in to access your account</p>
            </div>
            
            <SignInForm 
              mode={mode}
              setMode={setMode}
              code={code}
              setCode={setCode}
              email={email}
              setEmail={setEmail}
            />
            
            <div className="mt-6 border-t border-gray-200 pt-4">
              <div className="flex items-center justify-center">
                <span className="text-sm text-gray-500">Forgot your password?</span>
                <Link 
                  href="/auth/forgot-password" 
                  className="ml-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  Reset it here
                </Link>
              </div>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-700">
              Don't have an account yet?{' '}
              <Link href="/auth/signup" className="font-semibold text-blue-600 hover:text-blue-800">
                Sign up for free
              </Link>
            </p>
          </div>
        </div>
      </div>
      
      {/* Right side - Business benefits */}
      <div className="hidden md:flex md:w-5/12 md:flex-col md:justify-center md:px-8 md:py-12 lg:px-10">
        <div className="mx-auto max-w-md">
          <div className="mb-10">
            <h2 className="mb-4 text-2xl font-bold text-gray-800">Why Businesses Trust Dott</h2>
            <p className="text-base font-light leading-relaxed text-gray-600">
              Global business management software with advanced inventory, barcode scanning, and regional payment solutions—all in one intuitive platform.
            </p>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-start">
              <div className="mr-4 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
                <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="mb-1 text-lg font-medium text-gray-900">Secure Platform</h3>
                <p className="text-gray-600">Enterprise-grade security for your sensitive business data with bank-level encryption.</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="mr-4 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
                <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="mb-1 text-lg font-medium text-gray-900">Multi-Currency Support</h3>
                <p className="text-gray-600">Operate seamlessly across 100+ countries with automatic currency conversion and local tax compliance.</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="mr-4 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
                <svg className="h-5 w-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="mb-1 text-lg font-medium text-gray-900">Inventory Management</h3>
                <p className="text-gray-600">Real-time inventory tracking with barcode scanning capabilities to optimize your stock levels.</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="mr-4 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-purple-100">
                <svg className="h-5 w-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="mb-1 text-lg font-medium text-gray-900">Global Support</h3>
                <p className="text-gray-600">24/7 customer service in multiple languages with dedicated account managers for premium plans.</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="mr-4 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100">
                <svg className="h-5 w-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm2-3a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4-1a1 1 0 10-2 0v6a1 1 0 102 0V8z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="mb-1 text-lg font-medium text-gray-900">Advanced Analytics</h3>
                <p className="text-gray-600">Data-driven insights to help you make smarter business decisions and optimize operations.</p>
              </div>
            </div>
          </div>
          
          <div className="mt-10 flex">
            <div className="rounded-md bg-gray-100 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Trusted by 10,000+ businesses worldwide</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
