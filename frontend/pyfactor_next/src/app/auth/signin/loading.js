'use client';

import StandardSpinner from '@/components/ui/StandardSpinner';

export default function SignInLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="bg-white rounded-lg shadow-md p-8 flex flex-col items-center justify-center max-w-md w-full h-[400px]">
        <StandardSpinner size="large" />
      </div>
    </div>
  );
}