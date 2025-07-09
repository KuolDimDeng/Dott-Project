'use client';

import StandardSpinner from '@/components/ui/StandardSpinner';

/**
 * Unified OAuth loading screen component
 * Used across all OAuth flow pages for consistent experience
 */
export default function OAuthLoadingScreen({ 
  status = 'Processing authentication...', 
  error = null,
  showProgress = false
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4 max-w-md">
        <StandardSpinner size="large" />
        <h2 className="text-xl font-semibold text-gray-900">Completing Authentication</h2>
        <p className="text-gray-600">{status}</p>
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">{error}</p>
            <p className="text-red-600 text-xs mt-1">Redirecting to sign in...</p>
          </div>
        )}
        
        {showProgress && (
          <div className="text-sm text-gray-500 space-y-1 mt-6">
            <p>🔄 Processing OAuth callback</p>
            <div className="text-xs text-left bg-gray-100 p-2 rounded">
              <div>✓ Secure token exchange</div>
              <div>✓ Session establishment</div>
              <div>✓ Account verification</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}