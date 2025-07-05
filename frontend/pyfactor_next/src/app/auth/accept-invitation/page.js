'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

export default function AcceptInvitationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isLoading, setIsLoading] = useState(true);
  const [invitation, setInvitation] = useState(null);
  const [error, setError] = useState(null);
  
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  
  useEffect(() => {
    if (!token || !email) {
      setError('Invalid invitation link');
      setIsLoading(false);
      return;
    }
    
    // Verify invitation token
    verifyInvitation();
  }, [token, email]);
  
  const verifyInvitation = async () => {
    try {
      const response = await fetch('/api/auth/verify-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Invalid invitation');
      }
      
      const invitationData = await response.json();
      setInvitation(invitationData);
      
      // Store invitation details for after Auth0 login
      sessionStorage.setItem('invitation_token', token);
      sessionStorage.setItem('invitation_email', email);
      sessionStorage.setItem('invitation_data', JSON.stringify(invitationData));
      
    } catch (err) {
      console.error('Error verifying invitation:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAcceptInvitation = () => {
    // Redirect to Auth0 password reset/login with the invitation context
    // The user will set their password and then be redirected back
    window.location.href = `/api/auth/login?invitation=${token}&email=${encodeURIComponent(email)}`;
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying invitation...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">Invalid Invitation</h2>
            <p className="mt-2 text-gray-600">{error}</p>
            <div className="mt-6">
              <Link href="/auth/signin" className="text-blue-600 hover:text-blue-700">
                Go to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
            <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          
          <h2 className="mt-4 text-2xl font-bold text-gray-900">
            Welcome to {invitation?.businessName}!
          </h2>
          
          <p className="mt-2 text-gray-600">
            You've been invited to join as a <span className="font-semibold">{invitation?.role}</span>
          </p>
          
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              <strong>Email:</strong> {email}
            </p>
            <p className="text-sm text-gray-700 mt-2">
              <strong>Invited by:</strong> {invitation?.invitedBy}
            </p>
          </div>
          
          <div className="mt-8">
            <button
              onClick={handleAcceptInvitation}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Accept Invitation & Set Password
            </button>
          </div>
          
          <p className="mt-4 text-sm text-gray-500">
            By accepting this invitation, you agree to our{' '}
            <a href="/terms" className="text-blue-600 hover:text-blue-700">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" className="text-blue-600 hover:text-blue-700">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}