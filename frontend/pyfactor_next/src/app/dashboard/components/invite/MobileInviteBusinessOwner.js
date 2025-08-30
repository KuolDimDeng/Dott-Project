'use client';

import React, { useState, useEffect } from 'react';
import { useSessionContext } from '@/providers/SessionProvider';
import { useTranslation } from 'react-i18next';
import { 
  PaperAirplaneIcon,
  UserPlusIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  DevicePhoneMobileIcon,
  ShareIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

const MobileInviteBusinessOwner = () => {
  const { user } = useSessionContext();
  const { t } = useTranslation('navigation');
  const [status, setStatus] = useState(null);
  const [isNativeMobile, setIsNativeMobile] = useState(false);

  useEffect(() => {
    // Check if running on native mobile platform
    setIsNativeMobile(Capacitor.isNativePlatform());
  }, []);

  const getInviteMessage = (platform = 'general') => {
    const senderName = user?.name || t('invite.defaultSender', 'A colleague');
    const userName = user?.name || user?.email || t('invite.defaultUser', 'A Dott User');
    
    const baseMessage = `🚀 ${senderName} has invited you to join Dott: Global Business Platform!

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
${userName}`;

    return baseMessage;
  };

  const handleShare = async (method) => {
    try {
      const message = getInviteMessage(method);
      
      if (isNativeMobile) {
        // Use native share capabilities
        if (method === 'native') {
          // General native share sheet
          await Share.share({
            title: 'Invitation to Join Dott Business Platform',
            text: message,
            url: 'https://dottapps.com',
            dialogTitle: 'Share Dott with Business Owners'
          });
          
          setStatus({ 
            type: 'success', 
            message: 'Invitation shared successfully!' 
          });
        } else if (method === 'whatsapp') {
          // Direct WhatsApp share
          const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
          window.open(whatsappUrl, '_system');
          
          setStatus({ 
            type: 'success', 
            message: 'Opening WhatsApp...' 
          });
        } else if (method === 'sms') {
          // Direct SMS share
          const smsUrl = `sms:?body=${encodeURIComponent(message)}`;
          window.open(smsUrl, '_system');
          
          setStatus({ 
            type: 'success', 
            message: 'Opening Messages...' 
          });
        } else if (method === 'email') {
          // Direct email share
          const subject = encodeURIComponent('Invitation to Join Dott Business Platform');
          const body = encodeURIComponent(message);
          const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
          window.open(mailtoUrl, '_system');
          
          setStatus({ 
            type: 'success', 
            message: 'Opening Email...' 
          });
        }
      } else {
        // Fallback for web/PWA
        if (method === 'whatsapp') {
          const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
          window.open(whatsappUrl, '_blank');
        } else if (method === 'email') {
          const subject = encodeURIComponent('Invitation to Join Dott Business Platform');
          const body = encodeURIComponent(message);
          const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
          window.location.href = mailtoUrl;
        } else if (method === 'sms') {
          // SMS on web - limited support
          const smsUrl = `sms:?body=${encodeURIComponent(message)}`;
          window.location.href = smsUrl;
        } else if (method === 'copy') {
          // Copy to clipboard
          await navigator.clipboard.writeText(message);
          setStatus({ 
            type: 'success', 
            message: 'Message copied to clipboard!' 
          });
        }
      }
    } catch (error) {
      console.error('Error sharing invitation:', error);
      setStatus({ 
        type: 'error', 
        message: 'Failed to share invitation. Please try again.' 
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-6 mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center">
          <UserPlusIcon className="h-6 w-6 text-blue-600 mr-2" />
          {t('invite.title', 'Invite Business Owners')}
        </h1>
        <p className="text-sm text-gray-600 mt-2">
          {t('invite.mobileDescription', 'Share Dott with fellow business owners and help them streamline their operations.')}
        </p>
      </div>

      {/* Share Options */}
      <div className="px-4 space-y-4">
        {/* Native Share Button (Mobile Only) */}
        {isNativeMobile && (
          <button
            onClick={() => handleShare('native')}
            className="w-full bg-blue-600 text-white rounded-lg p-4 flex items-center justify-between shadow-sm hover:bg-blue-700 transition-colors"
          >
            <div className="flex items-center">
              <ShareIcon className="h-6 w-6 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Share via Any App</div>
                <div className="text-xs opacity-90">Choose from all your apps</div>
              </div>
            </div>
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        )}

        {/* WhatsApp */}
        <button
          onClick={() => handleShare('whatsapp')}
          className="w-full bg-green-500 text-white rounded-lg p-4 flex items-center justify-between shadow-sm hover:bg-green-600 transition-colors"
        >
          <div className="flex items-center">
            <ChatBubbleLeftRightIcon className="h-6 w-6 mr-3" />
            <div className="text-left">
              <div className="font-semibold">Share via WhatsApp</div>
              <div className="text-xs opacity-90">Send to contacts or groups</div>
            </div>
          </div>
          <PaperAirplaneIcon className="h-5 w-5" />
        </button>

        {/* SMS */}
        <button
          onClick={() => handleShare('sms')}
          className="w-full bg-purple-600 text-white rounded-lg p-4 flex items-center justify-between shadow-sm hover:bg-purple-700 transition-colors"
        >
          <div className="flex items-center">
            <DevicePhoneMobileIcon className="h-6 w-6 mr-3" />
            <div className="text-left">
              <div className="font-semibold">Share via SMS</div>
              <div className="text-xs opacity-90">Send text message</div>
            </div>
          </div>
          <PaperAirplaneIcon className="h-5 w-5" />
        </button>

        {/* Email */}
        <button
          onClick={() => handleShare('email')}
          className="w-full bg-indigo-600 text-white rounded-lg p-4 flex items-center justify-between shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <div className="flex items-center">
            <EnvelopeIcon className="h-6 w-6 mr-3" />
            <div className="text-left">
              <div className="font-semibold">Share via Email</div>
              <div className="text-xs opacity-90">Send email invitation</div>
            </div>
          </div>
          <PaperAirplaneIcon className="h-5 w-5" />
        </button>

        {/* Copy to Clipboard (Web/PWA fallback) */}
        {!isNativeMobile && (
          <button
            onClick={() => handleShare('copy')}
            className="w-full bg-gray-600 text-white rounded-lg p-4 flex items-center justify-between shadow-sm hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center">
              <ShareIcon className="h-6 w-6 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Copy Message</div>
                <div className="text-xs opacity-90">Copy invitation to clipboard</div>
              </div>
            </div>
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Status Message */}
      {status && (
        <div className="px-4 mt-6">
          <div className={`p-4 rounded-lg flex items-center ${
            status.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {status.type === 'success' ? (
              <CheckCircleIcon className="h-5 w-5 mr-2 flex-shrink-0" />
            ) : (
              <ExclamationCircleIcon className="h-5 w-5 mr-2 flex-shrink-0" />
            )}
            <span className="text-sm">{status.message}</span>
          </div>
        </div>
      )}

      {/* Benefits Section */}
      <div className="px-4 mt-8">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-3">Why Business Owners Love Dott</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>Save hours weekly on administrative tasks</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>All-in-one platform for complete business management</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>Real-time insights and AI-powered analytics</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>Free forever plan to get started</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>Works globally with multi-currency support</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MobileInviteBusinessOwner;