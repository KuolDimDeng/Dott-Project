'use client';

import { SessionProvider } from 'next-auth/react';

export default function OnboardingLayout({ children }) {
  return <SessionProvider>{children}</SessionProvider>;
}