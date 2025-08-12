'use client';

import { CenteredSpinner } from '@/components/ui/StandardSpinner';

/**
 * Unified OAuth loading screen component
 * Used across all OAuth flow pages for consistent experience
 */
export default function OAuthLoadingScreen({ 
  status = 'Processing authentication...', 
  error = null,
  showProgress = false
}) {
  // For error state, show custom error UI
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Authentication Error</h2>
          <p className="text-red-800">{error}</p>
          <p className="text-red-600 text-sm">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  // Use CenteredSpinner for loading state
  return <CenteredSpinner size="large" text={status} showText={true} minHeight="h-screen" />;
}