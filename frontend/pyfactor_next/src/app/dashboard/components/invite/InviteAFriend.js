'use client';

import React, { useState, useEffect } from 'react';
import { useSessionContext } from '@/providers/SessionProvider';
import { useTranslation } from 'react-i18next';
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
  const { t, i18n } = useTranslation('navigation');
  const [inviteMethod, setInviteMethod] = useState('email'); // 'email' or 'whatsapp'
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(null); // 'success', 'error', or null
  const [, forceUpdate] = useState({});

  // Listen for language changes and force re-render
  useEffect(() => {
    const handleLanguageChange = (lng) => {
      console.log('InviteAFriend: Language changed to', lng);
      forceUpdate({});
    };

    // Listen to both i18n and window events
    i18n.on('languageChanged', handleLanguageChange);
    window.addEventListener('languageChange', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
      window.removeEventListener('languageChange', handleLanguageChange);
    };
  }, [i18n]);

  const getDefaultMessage = (isWhatsApp = false) => {
    const senderName = user?.name || t('invite.defaultSender', 'A colleague');
    const userName = user?.name || user?.email || t('invite.defaultUser', 'A Dott User');
    
    if (isWhatsApp) {
      return t('invite.whatsappMessage', {
        senderName,
        userName,
        defaultValue: `🚀 *{{senderName}} has invited you to join Dott: Global Business Platform!*

Hello! I wanted to personally recommend Dott, a business management platform that has transformed how I run my operations.

Dott brings together everything you need:
• Sales and customer management  
• Inventory tracking and control
• Professional invoicing and payments
• Financial reporting and analytics
• Team collaboration tools
• AI Business insights and analytics
• Geofencing and location tracking
• Real-time business intelligence

Since implementing Dott, I've reduced administrative work by hours each week while gaining real-time insights into my business performance.

Get started for free forever today: https://dottapps.com

Best regards,
{{userName}}`
      });
    }
    
    return t('invite.emailMessage', {
      senderName,
      userName,
      defaultValue: `{{senderName}} has invited you to join Dott: Global Business Platform!

Hello,

I wanted to personally recommend Dott, a business management platform that has transformed how I run my operations. 

Dott brings together everything you need in one place:
• Sales and customer management
• Inventory tracking and control
• Professional invoicing and payments
• Financial reporting and analytics
• Team collaboration tools
• AI Business insights and analytics
• Geofencing and location tracking
• Real-time business intelligence

Since implementing Dott, I've reduced administrative work by hours each week while gaining real-time insights into my business performance. The platform delivers enterprise-grade capabilities at a fraction of traditional software costs.

I believe Dott would be particularly valuable for your business operations and growth goals.

Get started for free forever today: https://dottapps.com

Best regards,
{{userName}}`
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (inviteMethod === 'email' && !email.trim()) {
      setStatus({ type: 'error', message: t('invite.emailValidationError', 'Please enter a valid email address.') });
      return;
    }
    
    if (inviteMethod === 'whatsapp' && !phoneNumber.trim()) {
      setStatus({ type: 'error', message: t('invite.phoneValidationError', 'Please enter a valid phone number.') });
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
          message: t('invite.successMessage', { method, recipient, defaultValue: `Invitation sent successfully via {{method}} to {{recipient}}!` })
        });
        setEmail('');
        setPhoneNumber('');
      } else {
        setStatus({ 
          type: 'error', 
          message: result.error || t('invite.errorMessage', 'Failed to send invitation. Please try again.')
        });
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      setStatus({ 
        type: 'error', 
        message: t('invite.networkError', 'Network error. Please check your connection and try again.')
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
          {t('invite.title', 'Invite a Business Owner')}
        </h1>
        <p className="text-gray-600 text-lg">
          {t('invite.description1', 'Know a business owner looking to streamline their operations? Share Dott with them!')}
          <br className="hidden sm:block" />
          {t('invite.description2', 'Dott helps businesses automate scheduling, manage customer relationships, and handle payments—all in one simple app. Your connection can save hours of administrative work each week.')}
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
            {t('invite.formTitle', 'Send Invitation')}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Method Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t('invite.methodLabel', 'Choose invitation method')}
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
                  {t('invite.emailButton', 'Email')}
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
                  {t('invite.whatsappButton', 'WhatsApp')}
                </button>
              </div>
            </div>


            {/* Email Input */}
            {inviteMethod === 'email' && (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('invite.emailLabel', "Business Owner's Email Address")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('invite.emailPlaceholder', 'business@example.com')}
                  required={inviteMethod === 'email'}
                />
              </div>
            )}

            {/* WhatsApp Phone Input */}
            {inviteMethod === 'whatsapp' && (
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('invite.phoneLabel', "Business Owner's WhatsApp Number")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder={t('invite.phonePlaceholder', '+1234567890')}
                  required={inviteMethod === 'whatsapp'}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('invite.phoneHelperText', 'Include country code (e.g., +1 for US, +44 for UK)')}
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
                  {t('invite.sendingText', 'Sending...')}
                </>
              ) : (
                <>
                  {inviteMethod === 'whatsapp' ? (
                    <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
                  ) : (
                    <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                  )}
                  {inviteMethod === 'whatsapp' ? t('invite.sendWhatsappButton', 'Send via WhatsApp') : t('invite.sendEmailButton', 'Send via Email')}
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