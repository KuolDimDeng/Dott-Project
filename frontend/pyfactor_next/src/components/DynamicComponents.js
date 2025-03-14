'use client';

import dynamic from 'next/dynamic';

// Dynamically import components to avoid SSR issues
const CookieBanner = dynamic(() => import('@/components/Cookie/CookieBanner'), {
  ssr: false,
});

const CrispChat = dynamic(() => import('@/components/CrispChat/CrispChat'), {
  ssr: false,
});

export default function DynamicComponents({ isAuthenticated = false }) {
  return (
    <>
      <CookieBanner />
      <CrispChat isAuthenticated={isAuthenticated} />
    </>
  );
}