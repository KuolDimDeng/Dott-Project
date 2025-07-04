'use client';

import React, { useState } from 'react';
import { useSessionContext } from '@/providers/SessionProvider';
import { 
  PaperAirplaneIcon,
  UserPlusIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  ExclamationCircleIcon 
} from '@heroicons/react/24/outline';
import StandardSpinner from '@/components/ui/StandardSpinner';

const InviteAFriend = () => {
  const { user } = useSessionContext();
  const [email, setEmail] = useState('');
  // Fixed message - not editable by users
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(null); // 'success', 'error', or null

  const defaultMessage = `Hi there!

I've been using Dott for my business management and I think you'd love it too! It's an all-in-one platform that helps businesses streamline their operations with sales, inventory, customer management, invoicing, and more.

Dott has helped me save hours every week and keep my business organized. I thought you might find it useful for your business too!

You can check it out at: https://dottapps.com

Best regards,
${user?.name || user?.email || 'Your friend'}`;

  // Message is now fixed and doesn't change

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setStatus({ type: 'error', message: 'Please enter a valid email address.' });
      return;
    }

    setIsLoading(true);
    setStatus(null);

    try {
      const response = await fetch('/api/invite/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim(),
          message: defaultMessage,
          senderName: user?.name || user?.email || 'A Dott User',
          senderEmail: user?.email
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setStatus({ 
          type: 'success', 
          message: `Invitation sent successfully to ${email}!` 
        });
        setEmail('');
        // Message is fixed now, no need to reset
      } else {
        setStatus({ 
          type: 'error', 
          message: result.error || 'Failed to send invitation. Please try again.' 
        });
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      setStatus({ 
        type: 'error', 
        message: 'Network error. Please check your connection and try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-black mb-4 flex items-center">
          <UserPlusIcon className="h-6 w-6 text-blue-600 mr-2" />
          Invite a Friend
        </h1>
        <p className="text-gray-600 text-lg">
          Know a business owner who would benefit from using Dott? Share Dott with your network and help them transform their business operations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {/* Invitation Form */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <EnvelopeIcon className="h-5 w-5 text-blue-600 mr-2" />
            Send Invitation
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Friend's Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="friend@example.com"
                required
              />
            </div>

            {/* Message Preview */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invitation Message
              </label>
              <div className="w-full px-4 py-3 border border-gray-200 rounded-md bg-gray-50">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{defaultMessage}</p>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                This message will be sent to your friend.
              </p>
            </div>

            {/* Status Message */}
            {status && (
              <div className={`p-4 rounded-md flex items-center ${
                status.type === 'success' 
                  ? 'bg-green-50 border border-green-200 text-green-800' 
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                {status.type === 'success' ? (
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                ) : (
                  <ExclamationCircleIcon className="h-5 w-5 mr-2" />
                )}
                {status.message}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isLoading ? (
                <>
                  <StandardSpinner size="small" color="white" className="inline mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                  Send Invitation
                </>
              )}
            </button>
          </form>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            How It Works
          </h2>

          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 font-semibold">
                  1
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-base font-medium text-gray-900">Enter Email</h3>
                <p className="text-gray-600 text-sm">
                  Add your friend's email address.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 font-semibold">
                  2
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-base font-medium text-gray-900">Send Invitation</h3>
                <p className="text-gray-600 text-sm">
                  We'll send them an invitation with your recommendation.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 font-semibold">
                  3
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-base font-medium text-gray-900">They Join Dott</h3>
                <p className="text-gray-600 text-sm">
                  Your friend can sign up and start using Dott for their business.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Share Dott</strong> with colleagues and business partners to help them streamline their operations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteAFriend;