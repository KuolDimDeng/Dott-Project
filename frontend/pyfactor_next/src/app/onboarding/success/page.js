import Link from 'next/link';

export const metadata = {
  title: 'Setup Complete - Onboarding',
  description: 'Your account has been successfully set up',
};

export default function SuccessPage() {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="text-center">
        <div className="mb-6">
          <svg
            className="mx-auto h-16 w-16 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="24"
              cy="24"
              r="20"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="4"
              d="M14 24l8 8 16-16"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Setup Complete!
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Your account has been successfully set up and is ready to use.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
