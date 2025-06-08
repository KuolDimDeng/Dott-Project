'use client';


export default function Error({ error, reset }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Onboarding Error</h1>
        <p className="text-gray-600 mb-4">
          There was an issue loading the onboarding process.
        </p>
        <div className="space-x-4">
          <button
            onClick={reset}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
          >
            Try Again
          </button>
          <a
            href="/"
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors inline-block"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
} 