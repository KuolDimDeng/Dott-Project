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

  const defaultMessage = `${user?.name || 'A colleague'} has invited you to join Dott!

Hello,

I wanted to personally recommend Dott, a business management platform that has transformed how I run my operations. 

Dott brings together everything you need in one place:
• Sales and customer management
• Inventory tracking and control
• Professional invoicing and payments
• Financial reporting and analytics
• Team collaboration tools

Since implementing Dott, I've reduced administrative work by hours each week while gaining real-time insights into my business performance. The platform delivers enterprise-grade capabilities at a fraction of traditional software costs.

I believe Dott would be particularly valuable for your business operations and growth goals.

Start your free trial today: https://dottapps.com

Best regards,
${user?.name || user?.email || 'A Dott User'}`;

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
          Invite a Business Owner
        </h1>
        <p className="text-gray-600 text-lg">
          Know a business owner who would benefit from using Dott? Share Dott with your network and help them transform their business operations.
        </p>
      </div>

      {/* Invitation Form - Single column, centered */}
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <EnvelopeIcon className="h-5 w-5 text-blue-600 mr-2" />
            Send Invitation
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Business Owner's Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="business@example.com"
                required
              />
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
      </div>
    </div>
  );
};

export default InviteAFriend;