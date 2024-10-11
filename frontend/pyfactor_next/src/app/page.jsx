'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Hero from './components/Hero';
import Features from './components/Features';
import Highlights from './components/Highlights';
import Pricing from './components/Pricing';
import FAQ from './components/FAQ';
import Footer from './components/Footer';
import AppAppBar from './components/AppBar';
import { useOnboarding } from '@/app/onboarding/contexts/onboardingContext';

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { checkOnboardingStatus } = useOnboarding();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log("Landing Page - Session status:", status);
    console.log("Landing Page - Session data:", session);

    const handleAuthentication = async () => {
      if (status === 'authenticated') {
        console.log("User is authenticated, checking onboarding status");
        try {
          await checkOnboardingStatus();
          if (session.user.onboardingStatus !== 'complete') {
            console.log("User not fully onboarded, redirecting to onboarding");
            router.push('/onboarding');
          } else {
            console.log("User fully onboarded, redirecting to dashboard");
           router.push('/dashboard');
          }
        } catch (error) {
          console.error("Error checking onboarding status:", error);
          setIsLoading(false);
        }
      } else if (status === 'unauthenticated') {
        console.log("User is not authenticated, showing landing page");
        setIsLoading(false);
      }
    };

    if (status !== 'loading') {
      handleAuthentication();
    }
  }, [status, session, router, checkOnboardingStatus]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <AppAppBar />
      <Hero />
      <Features />
      <Highlights />
      <Pricing />
      <FAQ />
      <Footer />
    </>
  );
}