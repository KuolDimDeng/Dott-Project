'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function VerifyEmailPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Auth0 handles email verification, redirect to login
    router.push('/api/auth/login');
  }, [router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900">Redirecting to login...</h2>
        <p className="mt-2 text-gray-600">Auth0 handles email verification</p>
      </div>
    </div>
  );
}