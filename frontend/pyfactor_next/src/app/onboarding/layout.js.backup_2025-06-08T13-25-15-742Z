///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/layout.js
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { logger } from '@/utils/logger';
import { ONBOARDING_STEPS } from '@/config/steps';
import Image from 'next/image';
import StepIcon from './components/StepIcon';
import StepConnector from './components/StepConnector';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useMediaQuery } from '@/hooks/useMediaQuery';

// Define CSS for transition animations
const pageTransitionStyles = `
  @keyframes fadeTransition {
    0% { opacity: 0; transform: translateY(10px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  
  .page-transition {
    animation: fadeTransition 0.4s ease-out;
  }
  
  .progress-bar-transition {
    transition: width 0.5s ease-in-out;
  }
`;

// Simple cookie helper function
const getCookie = (name) => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

// Get current step based on pathname
const getCurrentStep = (pathname) => {
  if (!pathname) return 'business-info';
  
  if (pathname.includes('/business-info')) {
    return 'business-info';
  } else if (pathname.includes('/subscription')) {
    return 'subscription';
  } else if (pathname.includes('/payment')) {
    return 'payment';
  } else if (pathname.includes('/setup')) {
    return 'setup';
  } else if (pathname.includes('/complete')) {
    return 'complete';
  }
  
  return 'business-info'; // Default to first step
};

export default function OnboardingLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [currentStep, setCurrentStep] = useState('');
  const [fadeIn, setFadeIn] = useState(false);

  // Check for circuit breaker parameters
  const noRedirect = searchParams.get('noredirect') === 'true';
  const noLoop = searchParams.get('noloop') === 'true';
  const fromParam = searchParams.get('from');

  // Format onboarding steps for stepper
  const steps = useMemo(() => {
    return Object.entries(ONBOARDING_STEPS)
      .filter(([key]) => key !== 'complete')
      .map(([key, config]) => ({
        key,
        label: config.title,
        description: config.description,
        step: config.step
      }))
      .sort((a, b) => a.step - b.step);
  }, []);

  // Auth0 session check function
  const checkAuth0Session = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const user = await response.json();
        logger.debug('[OnboardingLayout] Auth0 session valid for user:', user.email);
        return true;
      }
      return false;
    } catch (error) {
      logger.debug('[OnboardingLayout] Auth0 session check failed:', error);
      return false;
    }
  };

  useEffect(() => {
    // Set current step based on pathname
    setCurrentStep(getCurrentStep(pathname));
    
    // Trigger fade-in animation when content changes
    setFadeIn(false);
    setTimeout(() => setFadeIn(true), 50);
  }, [pathname]);

  useEffect(() => {
    const checkAuth = async () => {
      // Check if the route should be treated as public (all onboarding routes are public)
      if (pathname.startsWith('/onboarding')) {
        logger.debug('[OnboardingLayout] Onboarding route is public, allowing access');
        setIsLoading(false);
        return;
      }
      
      // Skip any checks if circuit breaker parameters are present
      if (noRedirect || noLoop) {
        logger.debug('[OnboardingLayout] Circuit breaker active, skipping navigation checks');
        setIsLoading(false);
        return;
      }
      
      // Skip redirect checks if coming from a known source to prevent loops
      if (fromParam === 'middleware' || fromParam === 'signin') {
        logger.debug('[OnboardingLayout] Request from known source, skipping navigation checks');
        setIsLoading(false);
        return;
      }

      // Development mode bypass
      if (process.env.NODE_ENV === 'development') {
        const bypassAuth = localStorage.getItem('bypassAuthValidation') === 'true';
        const authSuccess = localStorage.getItem('authSuccess') === 'true';
        
        if (bypassAuth && authSuccess) {
          logger.debug('[OnboardingLayout] Development mode: auth validation bypassed');
          setIsLoading(false);
          return;
        }
      }

      // For Auth0, just check if user is authenticated but don't block onboarding
      const isAuthenticated = await checkAuth0Session();
      if (isAuthenticated) {
        logger.debug('[OnboardingLayout] User authenticated with Auth0');
      } else {
        logger.debug('[OnboardingLayout] User not authenticated but allowing onboarding access');
      }

      // Prefetch next step for faster transitions
      const activeStepIndex = steps.findIndex(step => step.key === currentStep);
      if (activeStepIndex >= 0 && activeStepIndex < steps.length - 1) {
        const nextStep = steps[activeStepIndex + 1];
        try {
          router.prefetch(`/onboarding/${nextStep.key}`);
        } catch (err) {
          // Silently fail prefetch errors
        }
      }

      setIsLoading(false);
    };

    checkAuth();
  }, [currentStep, noRedirect, noLoop, fromParam, router, steps, pathname]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Calculate active step index
  const activeStepIndex = steps.findIndex(step => step.key === currentStep);
  
  // Calculate progress percentage
  const progressPercentage = Math.round(((activeStepIndex + 1) / steps.length) * 100);

  // Helper to get progress text
  const getProgressText = () => {
    return `Step ${activeStepIndex + 1} of ${steps.length}`;
  };

  // Get content for the sidebar
  const getSidebarContent = () => {
    switch(currentStep) {
      case 'business-info':
        return {
          title: "Let's set up your business profile",
          subtitle: "Tell us about your business to customize your experience"
        };
      case 'subscription':
        return {
          title: "Choose the right plan for your needs",
          subtitle: "Select the subscription that works best for your business"
        };
      case 'payment':
        return {
          title: "Complete your payment",
          subtitle: "Secure payment to activate your subscription"
        };
      case 'setup':
        return {
          title: "Setting up your account",
          subtitle: "We're preparing everything for you"
        };
      default:
        return {
          title: "Welcome to Pyfactor",
          subtitle: "Let's get started with your onboarding"
        };
    }
  };

  const sidebarContent = getSidebarContent();

  return (
    <>
      {/* Add transition styles */}
      <style jsx global>{pageTransitionStyles}</style>
      
      <div className="flex flex-col min-h-screen md:flex-row bg-gray-50">
        
        {/* Brand sidebar - only visible on tablet and above */}
        <div className="hidden md:flex md:w-5/12 lg:w-4/12 xl:w-5/12 bg-gradient-to-b from-blue-600 to-blue-800 text-white flex-col">
          <div className="p-8 lg:p-12 flex flex-col h-full">
            {/* Logo */}
            <div className="mb-12">
              <Image
                src="/static/images/Pyfactor.png"
                alt="Pyfactor Logo"
                width={150}
                height={50}
                className="h-12 w-auto"
                onError={(e) => {
                  e.target.src = '/static/images/PyfactorLandingpage.png';
                }}
              />
            </div>
            
            {/* Step counter and content */}
            <div className="mt-auto flex-grow flex flex-col justify-center">
              <div className="text-sm font-medium text-blue-200 mb-3">{getProgressText()}</div>
              <h1 className="text-3xl lg:text-4xl font-bold mb-4">{sidebarContent.title}</h1>
              <p className="text-xl text-blue-100">{sidebarContent.subtitle}</p>
              
              {/* Enhanced progress indicator */}
              <div className="mt-8 mb-8">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                      {getProgressText()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold inline-block text-blue-200">
                      {progressPercentage}%
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-700">
                  <div 
                    style={{ width: `${progressPercentage}%` }} 
                    className="progress-bar-transition shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-300"
                  ></div>
                </div>
              </div>
              
              {/* Testimonial */}
              <div className="mt-8 bg-blue-700 bg-opacity-50 p-6 rounded-lg border border-blue-400 border-opacity-20">
                <p className="italic text-blue-100 mb-4">
                  "Pyfactor streamlined our accounting processes and saved us countless hours. The onboarding was simple and the team was incredibly helpful."
                </p>
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-blue-400 flex items-center justify-center text-blue-800 font-bold mr-3">
                    JS
                  </div>
                  <div>
                    <p className="font-medium">Jane Smith</p>
                    <p className="text-sm text-blue-200">CEO, Smith Consulting</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex flex-col flex-1 relative">
          {/* Mobile header */}
          <div className="md:hidden bg-white border-b px-4 py-4">
            <div className="flex items-center justify-between">
              <Image
                src="/static/images/Pyfactor.png"
                alt="Pyfactor Logo"
                width={120}
                height={40}
                className="h-8 w-auto"
                onError={(e) => {
                  e.target.src = '/static/images/PyfactorLandingpage.png';
                }}
              />
              <div className="text-sm text-gray-600">{getProgressText()}</div>
            </div>
            <div className="mt-3">
              <div className="overflow-hidden h-2 bg-gray-200 rounded">
                <div 
                  style={{ width: `${progressPercentage}%` }} 
                  className="progress-bar-transition h-full bg-blue-600"
                ></div>
              </div>
            </div>
          </div>

          {/* Steps indicator - hidden on mobile, shown on tablet+ */}
          <div className="hidden md:block bg-white border-b">
            <div className="flex justify-center p-8">
              <div className="flex items-center space-x-8">
                {steps.map((step, index) => (
                  <React.Fragment key={step.key}>
                    <StepIcon 
                      step={step} 
                      isActive={step.key === currentStep} 
                      isCompleted={index < activeStepIndex}
                      isMobile={isMobile}
                    />
                    {index < steps.length - 1 && (
                      <StepConnector 
                        isCompleted={index < activeStepIndex}
                        isMobile={isMobile}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className={`flex-1 ${fadeIn ? 'page-transition' : ''}`}>
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
