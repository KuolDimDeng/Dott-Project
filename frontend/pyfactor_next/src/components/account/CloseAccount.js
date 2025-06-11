'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import { closeUserAccount } from '@/utils/authFlowHandler.v2';

export default function CloseAccount({ user }) {
  const router = useRouter();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [error, setError] = useState('');

  const reasons = [
    'Not using the service anymore',
    'Found a better alternative',
    'Too expensive',
    'Privacy concerns',
    'Technical issues',
    'Other'
  ];

  const handleCloseAccount = async () => {
    if (confirmText !== 'DELETE') {
      setError('Please type DELETE to confirm');
      return;
    }

    if (!reason) {
      setError('Please select a reason');
      return;
    }

    try {
      setIsClosing(true);
      setError('');

      logger.info('[CloseAccount] Initiating account closure', {
        userId: user.sub,
        email: user.email,
        reason
      });

      // Close the account
      await closeUserAccount(user.sub, reason, feedback);

      logger.info('[CloseAccount] Account closed successfully');

      // Sign out and redirect
      window.location.href = '/api/auth/logout?returnTo=/goodbye';
      
    } catch (error) {
      logger.error('[CloseAccount] Failed to close account:', error);
      setError('Failed to close account. Please try again or contact support.');
      setIsClosing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Close Account
        </h2>

        {!showConfirmation ? (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Warning: This action cannot be undone
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>Closing your account will:</p>
                    <ul className="list-disc list-inside mt-1">
                      <li>Delete all your data permanently</li>
                      <li>Cancel any active subscriptions</li>
                      <li>Remove access for all team members</li>
                      <li>Delete all business records and reports</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-gray-600">
              We're sorry to see you go. If you're experiencing issues, please consider 
              reaching out to our support team first at support@dottapps.com.
            </p>

            <button
              onClick={() => setShowConfirmation(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Continue with Account Closure
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Reason Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Please tell us why you're leaving (required)
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
              >
                <option value="">Select a reason...</option>
                {reasons.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Feedback */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional feedback (optional)
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Please share any additional feedback to help us improve..."
              />
            </div>

            {/* Confirmation */}
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <label className="block text-sm font-medium text-red-800 mb-2">
                Type DELETE to confirm account closure
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                placeholder="Type DELETE here"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between">
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  setConfirmText('');
                  setError('');
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                disabled={isClosing}
              >
                Cancel
              </button>

              <button
                onClick={handleCloseAccount}
                disabled={isClosing || confirmText !== 'DELETE' || !reason}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isClosing ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Closing Account...
                  </div>
                ) : (
                  'Close My Account'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}