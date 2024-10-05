'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import React from 'react';
import DashboardContent from './DashboardContent';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && !session.user.isOnboarded) {
      router.push('/onboarding/step1');
    }
  }, [session, status, router]);

  if (status === 'loading') return <div>Loading...</div>;
  if (!session) return null;

  return (
    <div>
      <DashboardContent token={session.accessToken} />
    </div>
  );
}