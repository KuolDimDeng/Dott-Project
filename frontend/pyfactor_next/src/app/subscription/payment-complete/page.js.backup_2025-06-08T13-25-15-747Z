'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PaymentCompletePage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Processing payment...');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const handlePaymentComplete = async () => {
      try {
        setLoading(true);
        setMessage('Payment successful! Finalizing your account...');
        
        // Set all required cookies and localStorage for completion
        const expiresDate = new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000);
        
        // Mark everything complete immediately for better UX
        document.cookie = `setupCompleted=true; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
        document.cookie = `onboardingStep=complete; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
        document.cookie = `onboardedStatus=COMPLETE; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
        document.cookie = `setupUseRLS=true; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
        document.cookie = `hasSession=true; path=/; expires=${expiresDate.toUTCString()}; samesite=lax`;
        
        // Set localStorage flags
        localStorage.setItem('setupCompleted', 'true');
        localStorage.setItem('setupTimestamp', Date.now().toString());
        localStorage.setItem('onboardingStep', 'complete');
        localStorage.setItem('setupUseRLS', 'true');
        
        // Trigger background setup before redirecting
        const requestId = crypto.randomUUID();
        
        // Fire-and-forget background setup
        fetch('/api/onboarding/background-setup?plan=paid&background=true', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Background-Setup': 'true',
            'X-Request-ID': requestId
          },
          keepalive: true,
          body: JSON.stringify({
            plan: 'paid',
            timestamp: Date.now(),
            requestId,
            paymentComplete: true
          })
        }).catch(() => {
          // Ignore errors - background process
        });
        
        // Prefetch dashboard data
        fetch('/api/dashboard/initial-data?prefetch=true', {
          headers: {
            'x-prefetch': 'true',
            'Cache-Control': 'no-store'
          }
        }).catch(() => {
          // Ignore prefetch errors
        });
        
        // Show success message briefly, then redirect
        setMessage('Payment processed successfully! Redirecting to your dashboard...');
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          window.location.href = '/dashboard?newAccount=true&setupBackground=true';
        }, 1500);
        
      } catch (error) {
        setError('There was an error processing your payment. Please contact support.');
        setLoading(false);
      }
    };
    
    handlePaymentComplete();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Payment Complete
          </h2>
          
          {loading && (
            <div className="mt-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">{message}</p>
            </div>
          )}
          
          {error && (
            <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 