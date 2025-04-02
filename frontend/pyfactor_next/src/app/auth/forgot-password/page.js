'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/auth';
import { logger } from '@/utils/logger';

export default function ForgotPassword() {
  const { resetPassword, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    try {
      await resetPassword(email);
      setSuccess(true);
      logger.debug('Password reset code sent successfully');
    } catch (error) {
      logger.error('Failed to send password reset code:', error);
      setError(error.message || 'Failed to send password reset code');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="bg-white shadow-md rounded-lg p-8 flex flex-col items-center max-w-md w-full">
        <h1 className="text-xl font-semibold mb-2">
          Reset Password
        </h1>

        <p className="text-sm text-gray-600 text-center mb-6">
          Enter your email address and we'll send you a code to reset your password.
        </p>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4 w-full border border-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-700 p-4 rounded-md mb-4 w-full border border-green-200">
            Password reset code sent successfully. Please check your email.
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full">
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              className={`w-full px-3 py-2 border ${(isLoading || success) ? 'bg-gray-100' : 'bg-white'} border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
              required
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading || success}
            />
          </div>

          <button
            type="submit"
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 mt-6 mb-4 ${
              isLoading || success ? 'opacity-70 cursor-not-allowed' : 'hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
            }`}
            disabled={isLoading || success}
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : 'Send Reset Code'}
          </button>

          <div className="mt-4 text-center">
            <Link href="/auth/signin" className="text-sm text-indigo-600 hover:text-indigo-500">
              Back to Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
