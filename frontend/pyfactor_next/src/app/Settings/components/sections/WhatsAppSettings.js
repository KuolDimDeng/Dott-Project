'use client';

import React, { useState, useEffect } from 'react';
import { useSessionContext } from '@/providers/SessionProvider';
import { getWhatsAppBusinessVisibility } from '@/utils/whatsappCountryDetection';
import { logger } from '@/utils/logger';

const WhatsAppSettings = ({ user, notifySuccess, notifyError }) => {
  const { profileData, refreshSession } = useSessionContext();
  const [loading, setLoading] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappVisibility, setWhatsappVisibility] = useState(null);
  const [countryCode, setCountryCode] = useState(null);

  // Get user's country from profile data
  useEffect(() => {
    if (profileData?.country) {
      const country = profileData.country;
      logger.info(`[WhatsApp Settings] User country: ${country}`);
      setCountryCode(country);
      
      // Get WhatsApp Business visibility settings for this country
      const visibility = getWhatsAppBusinessVisibility(country);
      setWhatsappVisibility(visibility);
      
      logger.info(`[WhatsApp Settings] WhatsApp visibility for ${country}:`, visibility);
    }
  }, [profileData]);

  // Load current WhatsApp preference from profile data
  useEffect(() => {
    if (profileData?.show_whatsapp_commerce !== undefined) {
      setWhatsappEnabled(profileData.show_whatsapp_commerce);
      logger.info(`[WhatsApp Settings] Loaded preference from profile: ${profileData.show_whatsapp_commerce}`);
    } else if (whatsappVisibility) {
      // Set default based on country if no explicit preference
      setWhatsappEnabled(whatsappVisibility.defaultEnabled);
      logger.info(`[WhatsApp Settings] Using country default: ${whatsappVisibility.defaultEnabled}`);
    }
  }, [profileData, whatsappVisibility]);

  const handleToggleWhatsApp = async () => {
    try {
      setLoading(true);
      
      const newValue = !whatsappEnabled;
      
      logger.info(`[WhatsApp Settings] Updating WhatsApp preference to: ${newValue}`);
      
      // Call API to update user preference
      const response = await fetch('/api/users/me/', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': `whatsapp-settings-${Date.now()}`
        },
        body: JSON.stringify({
          show_whatsapp_commerce: newValue
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update WhatsApp preference');
      }
      
      const updatedProfile = await response.json();
      logger.info(`[WhatsApp Settings] API response:`, updatedProfile);
      
      // Update local state
      setWhatsappEnabled(newValue);
      
      // Refresh session to update profile data everywhere
      if (refreshSession) {
        await refreshSession();
      }
      
      // Trigger a custom event to update the main menu immediately
      window.dispatchEvent(new CustomEvent('whatsappPreferenceChanged', {
        detail: { 
          enabled: newValue,
          source: 'settings'
        }
      }));
      
      logger.info(`[WhatsApp Settings] WhatsApp Commerce ${newValue ? 'enabled' : 'disabled'}`);
      
      notifySuccess(
        `WhatsApp Commerce ${newValue ? 'enabled' : 'disabled'} successfully. The menu will update immediately.`
      );
      
    } catch (error) {
      logger.error('[WhatsApp Settings] Error updating WhatsApp setting:', error);
      notifyError(`Failed to update WhatsApp setting: ${error.message}`);
      // Don't revert the UI state since the API call failed - let the user try again
    } finally {
      setLoading(false);
    }
  };

  if (!whatsappVisibility) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-2">WhatsApp Business</h2>
        <p className="text-sm text-gray-600">
          Configure WhatsApp Business integration for your business communications.
        </p>
      </div>

      {/* Country Information */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Regional Settings</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            <span className="font-medium">Country:</span> {countryCode || 'Not specified'}
          </p>
          <p>
            <span className="font-medium">WhatsApp Business Status:</span>{' '}
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              whatsappVisibility.showInMenu 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {whatsappVisibility.badge}
            </span>
          </p>
          <p className="text-xs text-gray-500">
            {whatsappVisibility.reason}
          </p>
        </div>
      </div>

      {/* WhatsApp Commerce Toggle */}
      <div className="flex items-center justify-between py-4 border-b border-gray-200">
        <div className="flex-1 pr-4">
          <h3 className="text-sm font-medium text-gray-900">
            Show WhatsApp Commerce in Menu
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {whatsappVisibility.showInMenu 
              ? 'WhatsApp Business is popular in your region and is shown by default.'
              : 'WhatsApp Business is less common in your region. You can enable it if your customers use WhatsApp.'
            }
          </p>
        </div>
        <div className="flex items-center">
          <button
            type="button"
            disabled={loading}
            onClick={handleToggleWhatsApp}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              whatsappEnabled ? 'bg-blue-600' : 'bg-gray-200'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                whatsappEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* WhatsApp Features */}
      {whatsappEnabled && (
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-3">Available Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <p className="text-sm font-medium text-blue-900">Business Invitations</p>
                <p className="text-xs text-blue-700">Invite other business owners via WhatsApp</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <p className="text-sm font-medium text-blue-900">Customer Communication</p>
                <p className="text-xs text-blue-700">Send invoices and notifications</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <p className="text-sm font-medium text-gray-600">Catalog Sharing</p>
                <p className="text-xs text-gray-500">Coming soon</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <p className="text-sm font-medium text-gray-600">Order Management</p>
                <p className="text-xs text-gray-500">Coming soon</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Additional Information */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Getting Started</h3>
        <div className="text-sm text-gray-600 space-y-2">
          <p>
            WhatsApp Business allows you to communicate with customers and other business owners 
            directly through WhatsApp, which is widely used for business communication globally.
          </p>
          <p>
            To use WhatsApp features, you'll need to have WhatsApp Business installed on your device 
            or access to WhatsApp Web.
          </p>
          {!whatsappVisibility.showInMenu && (
            <p className="text-xs text-yellow-700 bg-yellow-50 rounded p-2 mt-3">
              <strong>Note:</strong> WhatsApp Business is less commonly used for business in your region, 
              but you can still enable it if your customers prefer WhatsApp communication.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatsAppSettings;