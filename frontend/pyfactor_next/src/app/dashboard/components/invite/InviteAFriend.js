'use client';

import React, { useState } from 'react';
import { useSessionContext } from '@/providers/SessionProvider';
import { 
  PaperAirplaneIcon,
  UserPlusIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ChatBubbleLeftRightIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';
import StandardSpinner from '@/components/ui/StandardSpinner';

const InviteAFriend = () => {
  const { user } = useSessionContext();
  const [inviteMethod, setInviteMethod] = useState('email'); // 'email' or 'whatsapp'
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(null); // 'success', 'error', or null

  const getDefaultMessage = (isWhatsApp = false) => {
    if (isWhatsApp) {
      return `🚀 *${user?.name || 'A colleague'} has invited you to join Dott!*

Hello! I wanted to personally recommend Dott, a business management platform that has transformed how I run my operations.

Dott brings together everything you need:
• Sales and customer management  
• Inventory tracking and control
• Professional invoicing and payments
• Financial reporting and analytics
• Team collaboration tools

Since implementing Dott, I've reduced administrative work by hours each week while gaining real-time insights into my business performance.

Start your free trial today: https://dottapps.com

Best regards,
${user?.name || user?.email || 'A Dott User'}`;
    }
    
    return `${user?.name || 'A colleague'} has invited you to join Dott!

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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (inviteMethod === 'email' && !email.trim()) {
      setStatus({ type: 'error', message: 'Please enter a valid email address.' });
      return;
    }
    
    if (inviteMethod === 'whatsapp' && !phoneNumber.trim()) {
      setStatus({ type: 'error', message: 'Please enter a valid phone number.' });
      return;
    }

    setIsLoading(true);
    setStatus(null);

    try {
      const endpoint = inviteMethod === 'whatsapp' ? '/api/invite/whatsapp' : '/api/invite/send';
      const message = getDefaultMessage(inviteMethod === 'whatsapp');
      
      const requestBody = {
        message,
        senderName: user?.name || user?.email || 'A Dott User',
        senderEmail: user?.email
      };

      if (inviteMethod === 'email') {
        requestBody.email = email.trim();
      } else {
        requestBody.phoneNumber = phoneNumber.trim();
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (response.ok) {
        const recipient = inviteMethod === 'email' ? email : phoneNumber;
        const method = inviteMethod === 'email' ? 'email' : 'WhatsApp';
        setStatus({ 
          type: 'success', 
          message: `Invitation sent successfully via ${method} to ${recipient}!` 
        });
        setEmail('');
        setPhoneNumber('');
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
          Know a business owner looking to streamline their operations? Share Dott with them!
          <br className="hidden sm:block" />
          Dott helps small businesses automate scheduling, manage customer relationships, and handle payments—all in one simple app. Your connection can save hours of administrative work each week.
        </p>
      </div>

      {/* Invitation Form - Single column, centered */}
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            {inviteMethod === 'whatsapp' ? (
              <ChatBubbleLeftRightIcon className="h-5 w-5 text-green-600 mr-2" />
            ) : (
              <EnvelopeIcon className="h-5 w-5 text-blue-600 mr-2" />
            )}
            Send Invitation
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Method Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Choose invitation method
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setInviteMethod('email')}
                  className={`flex items-center justify-center p-3 border rounded-md transition-colors ${
                    inviteMethod === 'email'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <EnvelopeIcon className="h-4 w-4 mr-2" />
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setInviteMethod('whatsapp')}
                  className={`flex items-center justify-center p-3 border rounded-md transition-colors ${
                    inviteMethod === 'whatsapp'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
                  WhatsApp
                </button>
              </div>
            </div>

            {/* Email Input */}
            {inviteMethod === 'email' && (
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
                  required={inviteMethod === 'email'}
                />
              </div>
            )}

            {/* WhatsApp Phone Input */}
            {inviteMethod === 'whatsapp' && (
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Business Owner's WhatsApp Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="+1234567890"
                  required={inviteMethod === 'whatsapp'}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Include country code (e.g., +1 for US, +44 for UK)
                </p>
              </div>
            )}

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
              className={`w-full flex items-center justify-center px-6 py-3 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 ${
                inviteMethod === 'whatsapp'
                  ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
              }`}
            >
              {isLoading ? (
                <>
                  <StandardSpinner size="small" color="white" className="inline mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  {inviteMethod === 'whatsapp' ? (
                    <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
                  ) : (
                    <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                  )}
                  Send via {inviteMethod === 'whatsapp' ? 'WhatsApp' : 'Email'}
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