'use client';

import React, { useState, useEffect } from 'react';
import { 
  ChatBubbleLeftRightIcon,
  CreditCardIcon,
  ShoppingBagIcon,
  BuildingStorefrontIcon,
  CodeBracketIcon,
  PlusCircleIcon
} from '@heroicons/react/24/outline';
import WhatsAppSettings from './WhatsAppSettings';
import { getWhatsAppBusinessVisibility } from '@/utils/whatsappCountryDetection';
import { logger } from '@/utils/logger';

const Integrations = ({ user, profileData, notifySuccess, notifyError }) => {
  const [activeIntegration, setActiveIntegration] = useState('whatsapp');
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappVisibility, setWhatsappVisibility] = useState(null);
  const [loading, setLoading] = useState(false);

  // Get user's country and WhatsApp preference from profile data
  useEffect(() => {
    if (profileData?.country) {
      const country = profileData.country;
      logger.info(`[Integrations] User country: ${country}`);
      
      // Get WhatsApp Business visibility settings for this country
      const visibility = getWhatsAppBusinessVisibility(country);
      setWhatsappVisibility(visibility);
      
      logger.info(`[Integrations] WhatsApp visibility for ${country}:`, visibility);
    }
  }, [profileData]);

  // Load current WhatsApp preference from profile data
  useEffect(() => {
    if (profileData?.show_whatsapp_commerce !== undefined) {
      setWhatsappEnabled(profileData.show_whatsapp_commerce);
      logger.info(`[Integrations] Loaded preference from profile: ${profileData.show_whatsapp_commerce}`);
    } else if (whatsappVisibility) {
      // Set default based on country if no explicit preference
      setWhatsappEnabled(whatsappVisibility.defaultEnabled);
      logger.info(`[Integrations] Using country default: ${whatsappVisibility.defaultEnabled}`);
    }
  }, [profileData, whatsappVisibility]);

  // Handle WhatsApp toggle
  const handleWhatsAppToggle = async () => {
    try {
      setLoading(true);
      
      const newValue = !whatsappEnabled;
      
      logger.info(`[Integrations] Updating WhatsApp preference to: ${newValue}`);
      
      // Call API to update user preference
      const response = await fetch('/api/users/me/', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': `integrations-whatsapp-${Date.now()}`
        },
        body: JSON.stringify({
          show_whatsapp_commerce: newValue
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update WhatsApp preference');
      }
      
      // Update local state
      setWhatsappEnabled(newValue);
      
      // Trigger a custom event to update the main menu immediately
      window.dispatchEvent(new CustomEvent('whatsappPreferenceChanged', {
        detail: { 
          enabled: newValue,
          source: 'integrations'
        }
      }));
      
      logger.info(`[Integrations] WhatsApp Business ${newValue ? 'enabled' : 'disabled'}`);
      
      notifySuccess(
        `WhatsApp Business integration ${newValue ? 'enabled' : 'disabled'} successfully. The menu will update immediately.`
      );
      
    } catch (error) {
      logger.error('[Integrations] Error updating WhatsApp setting:', error);
      notifyError(`Failed to update WhatsApp integration: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Integration sections configuration
  const integrationSections = [
    {
      id: 'whatsapp',
      title: 'WhatsApp Business',
      icon: ChatBubbleLeftRightIcon,
      description: 'Customer communication and business invitations',
      component: null, // We'll handle this specially
      status: 'configurable',
      category: 'Communication',
      enabled: whatsappEnabled,
      countryDefault: whatsappVisibility?.defaultEnabled || false,
      countryStatus: whatsappVisibility?.status || 'available'
    },
    {
      id: 'stripe',
      title: 'Stripe',
      icon: CreditCardIcon,
      description: 'Payment processing and financial services',
      component: null, // Future implementation
      status: 'coming-soon',
      category: 'Payments'
    },
    {
      id: 'shopify',
      title: 'Shopify',
      icon: ShoppingBagIcon,
      description: 'E-commerce platform integration',
      component: null, // Future implementation
      status: 'coming-soon',
      category: 'E-commerce'
    },
    {
      id: 'quickbooks',
      title: 'QuickBooks',
      icon: BuildingStorefrontIcon,
      description: 'Accounting and bookkeeping synchronization',
      component: null, // Future implementation
      status: 'coming-soon',
      category: 'Accounting'
    }
  ];

  // Filter active integrations
  const activeIntegrations = integrationSections.filter(section => 
    section.status === 'active' || section.status === 'configurable'
  );
  const comingSoonIntegrations = integrationSections.filter(section => section.status === 'coming-soon');

  // Get active integration component
  const activeIntegrationData = integrationSections.find(section => section.id === activeIntegration);
  const ActiveIntegrationComponent = activeIntegrationData?.component;

  const getStatusBadge = (status, enabled = false) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Active
          </span>
        );
      case 'configurable':
        return enabled 
          ? <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Enabled</span>
          : <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Disabled</span>;
      case 'coming-soon':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Coming Soon
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white shadow-sm">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
              <p className="mt-1 text-sm text-gray-500">
                Connect third-party services to enhance your business operations
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <CodeBracketIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-500">
                {activeIntegrations.length} active integration{activeIntegrations.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        <div className="flex">
          {/* Sidebar */}
          <div className="w-80 border-r border-gray-200 bg-gray-50">
            <div className="p-4">
              {/* Active Integrations */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Active Integrations</h3>
                <div className="space-y-2">
                  {activeIntegrations.map((integration) => {
                    const Icon = integration.icon;
                    return (
                      <button
                        key={integration.id}
                        onClick={() => setActiveIntegration(integration.id)}
                        className={`w-full flex items-center p-3 rounded-lg text-left transition-colors ${
                          activeIntegration === integration.id
                            ? 'bg-blue-50 border-blue-200 text-blue-900'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        } border`}
                      >
                        <Icon className="h-5 w-5 mr-3 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium truncate">
                              {integration.title}
                            </p>
                            {getStatusBadge(integration.status, integration.enabled)}
                          </div>
                          <p className="text-xs text-gray-500 truncate mt-1">
                            {integration.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Coming Soon Integrations */}
              {comingSoonIntegrations.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Coming Soon</h3>
                  <div className="space-y-2">
                    {comingSoonIntegrations.map((integration) => {
                      const Icon = integration.icon;
                      return (
                        <div
                          key={integration.id}
                          className="w-full flex items-center p-3 rounded-lg border border-gray-200 bg-white opacity-60 cursor-not-allowed"
                        >
                          <Icon className="h-5 w-5 mr-3 flex-shrink-0 text-gray-400" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-gray-500 truncate">
                                {integration.title}
                              </p>
                              {getStatusBadge(integration.status, integration.enabled)}
                            </div>
                            <p className="text-xs text-gray-400 truncate mt-1">
                              {integration.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Request Integration */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <PlusCircleIcon className="h-5 w-5 text-blue-600 mr-2" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Need an Integration?</h4>
                    <p className="text-xs text-blue-700 mt-1">
                      Contact our support team to request new integrations
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {activeIntegration === 'whatsapp' ? (
              <div className="p-6">
                <div className="max-w-2xl">
                  <div className="flex items-center mb-6">
                    <ChatBubbleLeftRightIcon className="h-8 w-8 text-green-600 mr-3" />
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">WhatsApp Business</h2>
                      <p className="text-sm text-gray-500">Customer communication and business invitations</p>
                    </div>
                  </div>

                  {/* Country-based information */}
                  {whatsappVisibility && (
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <div className={`w-2 h-2 rounded-full mt-2 ${
                            whatsappVisibility.status === 'popular' ? 'bg-green-500' : 
                            whatsappVisibility.status === 'new' ? 'bg-blue-500' : 'bg-gray-400'
                          }`} />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-blue-900">
                            WhatsApp Business in {profileData?.country || 'your country'}
                          </h3>
                          <p className="text-sm text-blue-700 mt-1">
                            {whatsappVisibility.status === 'popular' && 
                              'WhatsApp Business is widely used for customer communication in your country.'}
                            {whatsappVisibility.status === 'new' && 
                              'WhatsApp Business is gaining popularity for business communication in your country.'}
                            {whatsappVisibility.status === 'available' && 
                              'WhatsApp Business is available in your country but less commonly used for business.'}
                          </p>
                          <p className="text-xs text-blue-600 mt-2">
                            Default setting: {whatsappVisibility.defaultEnabled ? 'Enabled' : 'Disabled'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Integration Toggle */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">Integration Status</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {whatsappEnabled 
                            ? 'WhatsApp Business is enabled and will appear in your main menu'
                            : 'WhatsApp Business is disabled and hidden from your main menu'
                          }
                        </p>
                      </div>
                      <button
                        onClick={handleWhatsAppToggle}
                        disabled={loading}
                        className={`
                          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                          ${whatsappEnabled ? 'bg-blue-600' : 'bg-gray-200'}
                          ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        <span
                          className={`
                            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
                            transition duration-200 ease-in-out
                            ${whatsappEnabled ? 'translate-x-5' : 'translate-x-0'}
                          `}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Integration Details */}
                  {whatsappEnabled && (
                    <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-green-900 mb-3">Integration Features</h4>
                      <ul className="text-sm text-green-700 space-y-2">
                        <li className="flex items-center">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2" />
                          WhatsApp Business menu item in main navigation
                        </li>
                        <li className="flex items-center">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2" />
                          Send business invitations via WhatsApp
                        </li>
                        <li className="flex items-center">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2" />
                          Customer communication features
                        </li>
                        <li className="flex items-center">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2" />
                          Integration with business workflows
                        </li>
                      </ul>
                    </div>
                  )}

                  {/* Additional Settings */}
                  {whatsappEnabled && (
                    <div className="mt-6">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Additional Settings</h4>
                      <div className="text-sm text-gray-600">
                        <p>For detailed WhatsApp Business configuration, the settings have been integrated into this simplified interface.</p>
                        <p className="mt-2">The integration will automatically appear in your main menu when enabled.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : ActiveIntegrationComponent ? (
              <ActiveIntegrationComponent
                user={user}
                profileData={profileData}
                notifySuccess={notifySuccess}
                notifyError={notifyError}
              />
            ) : (
              <div className="p-6">
                <div className="text-center py-12">
                  <CodeBracketIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Integration Not Available
                  </h3>
                  <p className="text-gray-500">
                    This integration is coming soon. Check back later for updates.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Integrations;