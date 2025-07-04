'use client';

import React, { useState } from 'react';
import { useSessionContext } from '@/providers/SessionProvider';
import { Send, UserPlus, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import StandardSpinner from '@/components/ui/StandardSpinner';

const InviteAFriend = () => {
  const { user } = useSessionContext();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(null); // 'success', 'error', or null

  const defaultMessage = `Hi there!

I've been using Dott for my business management and I think you'd love it too! Dott is an all-in-one platform that helps businesses streamline their operations with:

🏢 Complete Business Management
• Sales, inventory, and customer management
• Invoicing and payment processing
• Financial reporting and analytics
• Tax management and compliance

💼 Professional Features
• Multi-user collaboration with role-based access
• Real-time data synchronization
• Automated workflows and notifications
• Industry-standard security and data protection

📊 Smart Business Insights
• AI-powered analytics and recommendations
• Performance tracking and KPIs
• Custom reports and dashboards
• Growth optimization tools

🚀 Easy to Get Started
• Quick onboarding process
• Intuitive interface designed for business owners
• Comprehensive support and training resources
• Flexible pricing plans for businesses of all sizes

Dott has helped me save hours every week and keep my business organized. I thought you might find it useful for your business too!

You can check it out at: https://dottapps.com

Best regards,
${user?.name || user?.email || 'Your friend'}`;

  useState(() => {
    setMessage(defaultMessage);
  }, [user]);

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
          message: message.trim(),
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
        // Reset message to default
        setMessage(defaultMessage);
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
        <div className="flex items-center mb-4">
          <UserPlus className="h-8 w-8 text-blue-600 mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">Invite a Friend</h1>
        </div>
        <p className="text-gray-600 text-lg">
          Share Dott with your friends and help them streamline their business operations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Invitation Form */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <Mail className="h-5 w-5 text-blue-600 mr-2" />
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

            {/* Message Input */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                Personal Message
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows="12"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Write a personal message to your friend..."
              />
              <p className="text-sm text-gray-500 mt-2">
                You can customize this message or use our default template.
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
                  <CheckCircle className="h-5 w-5 mr-2" />
                ) : (
                  <AlertCircle className="h-5 w-5 mr-2" />
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
                  <Send className="h-4 w-4 mr-2" />
                  Send Invitation
                </>
              )}
            </button>
          </form>
        </div>

        {/* Benefits Preview */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Why Your Friends Will Love Dott
          </h2>

          <div className="space-y-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-md bg-blue-500 text-white">
                  🏢
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Complete Business Management</h3>
                <p className="text-gray-600">
                  All-in-one platform for sales, inventory, customers, invoicing, and financial reporting.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-md bg-green-500 text-white">
                  📊
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Smart Analytics</h3>
                <p className="text-gray-600">
                  AI-powered insights and recommendations to help grow their business.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-md bg-purple-500 text-white">
                  🔒
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Enterprise Security</h3>
                <p className="text-gray-600">
                  Bank-grade security with role-based access controls and data protection.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-md bg-orange-500 text-white">
                  🚀
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Easy Setup</h3>
                <p className="text-gray-600">
                  Quick onboarding process with intuitive interface designed for business owners.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Join thousands of businesses</strong> already using Dott to streamline their operations 
              and grow their revenue. Free trial available!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteAFriend;