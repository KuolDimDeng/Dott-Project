'use client';

export default function SessionBridgeError({ error, reset }) {
  console.error('🚨 SessionBridge Error Boundary caught error:', error);
  console.error('🚨 Error stack:', error.stack);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-xl font-bold text-red-600 mb-4">Session Bridge Error</h2>
        <p className="text-gray-600 mb-4">Something went wrong during the authentication process.</p>
        <div className="text-sm text-gray-500 mb-4">
          Error: {error.message}
        </div>
        <button
          onClick={() => window.location.href = '/auth/signin'}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Return to Sign In
        </button>
      </div>
    </div>
  );
}