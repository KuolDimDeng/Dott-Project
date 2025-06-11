'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function AccountClosedPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const daysRemaining = searchParams.get('days') || '30';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Account Closed
          </h2>
          
          <div className="mt-4 text-sm text-gray-600">
            {email && (
              <p className="mb-2">
                The account for <span className="font-medium">{email}</span> has been closed.
              </p>
            )}
            
            <p className="mb-4">
              This account is currently in a grace period and can be reactivated within the next{' '}
              <span className="font-semibold">{daysRemaining} days</span>.
            </p>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-2">
                Want to reactivate your account?
              </h3>
              <p className="text-sm text-blue-700 mb-3">
                If you closed your account by mistake or have changed your mind, we can help you reactivate it.
              </p>
              <a 
                href="mailto:support@dottapps.com?subject=Account Reactivation Request"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Contact Support
              </a>
            </div>
          </div>
          
          <div className="mt-8">
            <Link
              href="/"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Return to homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}