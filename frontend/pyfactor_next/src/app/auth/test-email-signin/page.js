'use client';

import React from 'react';
import EmailPasswordSignIn from '@/components/auth/EmailPasswordSignIn';

/**
 * Test page for email/password authentication
 * Provides comprehensive debugging interface
 */
export default function TestEmailSignIn() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Email/Password Sign In Test
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            This page includes comprehensive debugging for the authentication flow
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <EmailPasswordSignIn />
        </div>
        
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">
            Authentication Flow Steps:
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
            <li>Enter your email and password</li>
            <li>Client validates the form inputs</li>
            <li>Client sends credentials to /api/auth/authenticate</li>
            <li>Server authenticates with Auth0 custom domain (auth.dottapps.com)</li>
            <li>Server receives tokens and user info</li>
            <li>Server creates session and sets cookie</li>
            <li>Client checks onboarding status</li>
            <li>Client redirects to appropriate page</li>
          </ol>
        </div>
        
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-yellow-900 mb-1">
            Test Credentials:
          </h3>
          <p className="text-sm text-yellow-800">
            Use your existing email/password that you previously signed up with.
          </p>
        </div>
      </div>
    </div>
  );
}