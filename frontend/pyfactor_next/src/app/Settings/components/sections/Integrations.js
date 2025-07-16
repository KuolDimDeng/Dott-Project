'use client';

import React, { useState } from 'react';
import { 
  ChatBubbleLeftRightIcon,
  CreditCardIcon,
  ShoppingBagIcon,
  BuildingStorefrontIcon,
  CodeBracketIcon,
  PlusCircleIcon
} from '@heroicons/react/24/outline';
import WhatsAppSettings from './WhatsAppSettings';

const Integrations = ({ user, profileData, notifySuccess, notifyError }) => {
  const [activeIntegration, setActiveIntegration] = useState('whatsapp');

  // Integration sections configuration
  const integrationSections = [
    {
      id: 'whatsapp',
      title: 'WhatsApp Business',
      icon: ChatBubbleLeftRightIcon,
      description: 'Customer communication and business invitations',
      component: WhatsAppSettings,
      status: 'active',
      category: 'Communication'
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
  const activeIntegrations = integrationSections.filter(section => section.status === 'active');
  const comingSoonIntegrations = integrationSections.filter(section => section.status === 'coming-soon');

  // Get active integration component
  const activeIntegrationData = integrationSections.find(section => section.id === activeIntegration);
  const ActiveIntegrationComponent = activeIntegrationData?.component;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Active
          </span>
        );
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
                            {getStatusBadge(integration.status)}
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
                              {getStatusBadge(integration.status)}
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
            {ActiveIntegrationComponent ? (
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