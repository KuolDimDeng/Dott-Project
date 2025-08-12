'use client';

import StandardSpinner from '@/components/ui/StandardSpinner';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoadingContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="bg-white rounded-lg shadow-md p-8 flex flex-col items-center justify-center max-w-md w-full h-[400px]">
        <StandardSpinner size="large" />
        {reason === 'timeout' && (
          <p className="mt-4 text-gray-600 text-center">
            Your session has expired. Redirecting to sign in...
          </p>
        )}
        {!reason && (
          <p className="mt-4 text-gray-600">Loading...</p>
        )}
      </div>
    </div>
  );
}

export default function SignInLoading() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="bg-white rounded-lg shadow-md p-8 flex flex-col items-center justify-center max-w-md w-full h-[400px]">
          <StandardSpinner size="large" />
        </div>
      </div>
    }>
      <LoadingContent />
    </Suspense>
  );
}