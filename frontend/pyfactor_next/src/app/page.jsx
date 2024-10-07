'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Hero from './components/Hero';
import Features from './components/Features';
import Highlights from './components/Highlights';
import Pricing from './components/Pricing';
import FAQ from './components/FAQ';
import Footer from './components/Footer';
import AppAppBar from './components/AppBar';

export default function LandingPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (status === 'unauthenticated') {
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

  return null;
}