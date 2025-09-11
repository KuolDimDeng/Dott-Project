'use client';

import React, { useState, useEffect } from 'react';
import { 
  PlusCircleIcon,
  MinusCircleIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  SparklesIcon,
  InformationCircleIcon,
  BeakerIcon
} from '@heroicons/react/24/outline';
import { logger } from '@/utils/logger';

const FeatureModules = ({ user, profileData, isOwner, notifySuccess, notifyError }) => {
  const [loading, setLoading] = useState(false);
  const [features, setFeatures] = useState({
    core: [],
    enabled_modules: [],
    available_modules: [],
    testing_mode: true,
    is_test_account: false
  });
  const [billingDetails, setBillingDetails] = useState(null);
  const [processingFeature, setProcessingFeature] = useState(null);

  useEffect(() => {
    loadFeatureData();
  }, []);

  const loadFeatureData = async () => {
    try {
      setLoading(true);
      
      const [featuresRes, billingRes] = await Promise.all([
        fetch('/api/features/enabled'),
        fetch('/api/features/billing-details')
      ]);

      if (featuresRes.ok) {
        const data = await featuresRes.json();
        setFeatures(data.features || data);
      }

      if (billingRes.ok) {
        const data = await billingRes.json();
        setBillingDetails(data);
      }
    } catch (error) {
      logger.error('[FeatureModules] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFeature = async (featureCode) => {
    if (!isOwner) {
      notifyError('Only the account owner can manage features');
      return;
    }

    try {
      setProcessingFeature(featureCode);
      
      const response = await fetch('/api/features/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ feature_code: featureCode })
      });

      const data = await response.json();
      
      if (data.success) {
        notifySuccess(data.message || 'Feature added successfully');
        await loadFeatureData();
      } else {
        notifyError(data.error || 'Failed to add feature');
      }
    } catch (error) {
      logger.error('[FeatureModules] Error adding feature:', error);
      notifyError('Failed to add feature');
    } finally {
      setProcessingFeature(null);
    }
  };

  const handleRemoveFeature = async (featureCode) => {
    if (!isOwner) {
      notifyError('Only the account owner can manage features');
      return;
    }

    if (!confirm('Are you sure you want to remove this feature? You will receive a prorated credit.')) {
      return;
    }

    try {
      setProcessingFeature(featureCode);
      
      const response = await fetch('/api/features/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ feature_code: featureCode })
      });

      const data = await response.json();
      
      if (data.success) {
        notifySuccess(data.message || 'Feature removed successfully');
        await loadFeatureData();
      } else {
        notifyError(data.error || 'Failed to remove feature');
      }
    } catch (error) {
      logger.error('[FeatureModules] Error removing feature:', error);
      notifyError('Failed to remove feature');
    } finally {
      setProcessingFeature(null);
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'hr': '👥',
      'analytics': '📊',
      'financial': '💰',
      'marketing': '📣',
      'operations': '⚙️',
      'enterprise': '🏢',
      'sales': '🛒'
    };
    return icons[category] || '📦';
  };

  const getCategoryName = (category) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">À La Carte Features</h2>
        <p className="text-sm text-gray-500 mt-1">
          Add or remove features as your business needs change
        </p>
      </div>

      {/* Testing Mode Banner */}
      {features.testing_mode && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <BeakerIcon className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-800">Testing Mode Active</h3>
              <p className="mt-1 text-sm text-yellow-700">
                All features are currently accessible for testing. Pricing shown is for reference only - no charges will be applied yet.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Test Account Banner */}
      {features.is_test_account && (
        <div className="mb-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-start">
            <SparklesIcon className="h-5 w-5 text-purple-600 mr-3 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-purple-800">Test Account</h3>
              <p className="mt-1 text-sm text-purple-700">
                This is a test account with full access to all features without any charges.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Summary */}
      {billingDetails && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-blue-900">Monthly Summary</h3>
              <div className="mt-2 space-y-1">
                <p className="text-sm text-blue-700">
                  Base Plan: <span className="font-medium">{billingDetails.base_plan}</span> - ${billingDetails.base_price}/mo
                </p>
                <p className="text-sm text-blue-700">
                  Feature Modules: <span className="font-medium">${billingDetails.feature_total}/mo</span>
                </p>
                <div className="pt-2 border-t border-blue-200">
                  <p className="text-base font-semibold text-blue-900">
                    Total: ${billingDetails.next_month_total}/mo
                  </p>
                </div>
              </div>
            </div>
            <CurrencyDollarIcon className="h-12 w-12 text-blue-600" />
          </div>
          {billingDetails.is_developing_country && (
            <div className="mt-3 flex items-center text-sm text-green-600">
              <CheckCircleIcon className="h-4 w-4 mr-2" />
              50% developing country discount applied
            </div>
          )}
        </div>
      )}

      {/* Core Features */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Core Features (Free)</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {features.core.map((feature) => (
              <div key={feature} className="flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-sm text-gray-700 capitalize">
                  {feature.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-500">
            * Core features vary by business type ({features.business_type || 'GENERAL'})
          </p>
        </div>
      </div>

      {/* Enabled Modules */}
      {features.enabled_modules.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Active Modules</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.enabled_modules.map((module) => (
              <div key={module.code} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{module.name}</h4>
                    <p className="text-sm text-gray-500 mt-1">${module.price}/month</p>
                  </div>
                  {isOwner && !features.testing_mode && (
                    <button
                      onClick={() => handleRemoveFeature(module.code)}
                      disabled={processingFeature === module.code}
                      className="ml-3 text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      <MinusCircleIcon className="h-6 w-6" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Modules */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Available Modules</h3>
        {features.available_modules.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.available_modules.map((module) => (
              <div key={module.code} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">{getCategoryIcon(module.category)}</span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {getCategoryName(module.category)}
                  </span>
                </div>
                <h4 className="font-medium text-gray-900">{module.name}</h4>
                <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <span className="text-lg font-semibold text-gray-900">${module.price}</span>
                    <span className="text-sm text-gray-500">/month</span>
                    {module.developing_price && module.developing_price < module.price && (
                      <p className="text-xs text-green-600 mt-1">
                        ${module.developing_price}/mo in developing countries
                      </p>
                    )}
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => handleAddFeature(module.code)}
                      disabled={processingFeature === module.code}
                      className="flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {processingFeature === module.code ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <PlusCircleIcon className="h-4 w-4 mr-1" />
                          Add
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500" />
            <p className="mt-2 text-sm text-gray-600">
              All available features are already enabled
            </p>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">How À La Carte Pricing Works:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Add or remove features anytime</li>
              <li>Prorated charges/credits applied immediately</li>
              <li>Pay only for what you use</li>
              <li>Features can work independently or together</li>
              <li>50% discount for developing countries</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeatureModules;