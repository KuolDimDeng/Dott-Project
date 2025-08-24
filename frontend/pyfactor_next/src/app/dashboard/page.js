'use client';

// Dashboard page (Client Component)


import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import PageTitle from '@/components/PageTitle';
import { useSession } from '@/hooks/useSession-v2';

export default function DashboardPage() {
  const { sessionData, loading } = useSession();
  
  return (
    <>
      <PageTitle />
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-green-600">
            🎉 Success!
          </h1>
          <p className="mt-2 text-gray-600">
            Auth0 authentication completed successfully
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="mb-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Welcome{!loading && sessionData?.user?.first_name ? `, ${sessionData.user.first_name}` : ''} to Dott Dashboard!
            </h2>
            
            {!loading && (
              <div className="text-gray-600 mb-6 space-y-2">
                {sessionData?.user?.email && (
                  <p className="text-sm">
                    <span className="font-medium">Email:</span> {sessionData.user.email}
                  </p>
                )}
                {sessionData?.user?.business_name && (
                  <p className="text-sm">
                    <span className="font-medium">Business:</span> {sessionData.user.business_name}
                  </p>
                )}
                {sessionData?.user?.subscription_plan && (
                  <p className="text-sm">
                    <span className="font-medium">Plan:</span> {sessionData.user.subscription_plan.charAt(0).toUpperCase() + sessionData.user.subscription_plan.slice(1)}
                  </p>
                )}
              </div>
            )}
            
            <p className="text-gray-600 mb-6">
              You have successfully authenticated with Auth0. The Cognito → Auth0 migration is working!
            </p>
            
            <div className="space-y-3">
              <Link 
                href="/api/auth/logout"
                className="block w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
              >
                Logout
              </Link>
              
              <Link 
                href="/auth/signin"
                className="block w-full bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}