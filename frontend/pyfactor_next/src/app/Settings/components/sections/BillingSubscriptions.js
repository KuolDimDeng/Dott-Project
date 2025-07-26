'use client';

import React, { useState, useEffect } from 'react';
import { 
  CreditCardIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  ClockIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { useStripe } from '@/hooks/useStripe';
import { logger } from '@/utils/logger';

const BillingSubscriptions = ({ user, profileData, isOwner, notifySuccess, notifyError }) => {
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [billingHistory, setBillingHistory] = useState([]);
  const { createCheckoutSession, createPortalSession, loading: stripeLoading } = useStripe();

  const plans = [
    {
      id: 'basic',
      name: 'Basic',
      price: 0,
      priceId: null,
      features: [
        '1 User',
        '3GB Storage',
        'Basic Reports',
        'Email Support',
        'Mobile Access'
      ],
      limitations: [
        'No Team Collaboration',
        'Limited API Access',
        'Basic Analytics Only'
      ]
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 35,
      priceId: process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID,
      yearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_YEARLY_PRICE_ID,
      features: [
        'Up to 10 Users',
        '50GB Storage',
        'Advanced Reports',
        'Priority Support',
        'API Access',
        'Custom Integrations',
        'Advanced Analytics',
        'Audit Trail'
      ],
      popular: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 95,
      priceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID,
      yearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_YEARLY_PRICE_ID,
      features: [
        'Unlimited Users',
        '500GB Storage',
        'Custom Reports',
        'Dedicated Support',
        'Full API Access',
        'White Label Option',
        'Advanced Security',
        'SLA Guarantee',
        'Custom Training'
      ]
    }
  ];

  useEffect(() => {
    if (isOwner) {
      loadSubscriptionData();
    }
  }, [isOwner]);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);
      
      const [subResponse, historyResponse] = await Promise.all([
        fetch('/api/user/subscription'),
        fetch('/api/billing/history')
      ]);

      if (subResponse.ok) {
        const data = await subResponse.json();
        setSubscription(data);
      }

      if (historyResponse.ok) {
        const data = await historyResponse.json();
        setBillingHistory(data.invoices || []);
      }
    } catch (error) {
      logger.error('[BillingSubscriptions] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (priceId) => {
    try {
      await createCheckoutSession(priceId);
    } catch (error) {
      notifyError('Failed to start checkout process');
    }
  };

  const handleManageBilling = async () => {
    try {
      await createPortalSession();
    } catch (error) {
      notifyError('Failed to open billing portal');
    }
  };

  const getCurrentPlan = () => {
    if (!subscription || subscription.status === 'trialing' || subscription.status === 'canceled') {
      return plans[0];
    }
    
    return plans.find(plan => 
      plan.priceId === subscription.priceId || 
      plan.yearlyPriceId === subscription.priceId
    ) || plans[0];
  };

  const currentPlan = getCurrentPlan();

  if (!isOwner) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Access Restricted</h3>
              <p className="mt-1 text-sm text-yellow-700">
                Only the account owner can manage billing and subscriptions.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Billing & Subscriptions</h2>
        <p className="text-sm text-gray-500 mt-1">
          Manage your subscription plan and billing information
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-blue-900">
                  Current Plan: {currentPlan.name}
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  {currentPlan.price === 0 
                    ? 'Free forever' 
                    : `$${currentPlan.price}/month${subscription?.interval === 'year' ? ' (billed yearly)' : ''}`
                  }
                </p>
              </div>
              {subscription?.status === 'active' && currentPlan.price > 0 && (
                <button
                  onClick={handleManageBilling}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  disabled={stripeLoading}
                >
                  Manage Billing
                </button>
              )}
            </div>
            
            {subscription?.cancelAtPeriodEnd && (
              <div className="mt-3 flex items-center text-sm text-red-600">
                <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                Subscription will cancel on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Available Plans</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => {
                const isCurrentPlan = currentPlan.id === plan.id;
                
                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-lg border-2 p-6 ${
                      plan.popular 
                        ? 'border-blue-500 shadow-lg' 
                        : 'border-gray-200'
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                          Most Popular
                        </span>
                      </div>
                    )}
                    
                    <div className="text-center mb-4">
                      <h4 className="text-xl font-semibold text-gray-900">{plan.name}</h4>
                      <div className="mt-2">
                        <span className="text-3xl font-bold text-gray-900">${plan.price}</span>
                        <span className="text-gray-500">/month</span>
                      </div>
                      {plan.yearlyPriceId && (
                        <p className="text-sm text-green-600 mt-1">
                          Save 20% with yearly billing
                        </p>
                      )}
                    </div>

                    <ul className="space-y-2 mb-6">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start">
                          <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{feature}</span>
                        </li>
                      ))}
                      {plan.limitations?.map((limitation, index) => (
                        <li key={`limit-${index}`} className="flex items-start">
                          <XCircleIcon className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-500">{limitation}</span>
                        </li>
                      ))}
                    </ul>

                    {isCurrentPlan ? (
                      <button
                        disabled
                        className="w-full px-4 py-2 bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed"
                      >
                        Current Plan
                      </button>
                    ) : plan.price > currentPlan.price ? (
                      <button
                        onClick={() => handleUpgrade(plan.priceId)}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center"
                        disabled={stripeLoading || !plan.priceId}
                      >
                        Upgrade
                        <ArrowRightIcon className="h-4 w-4 ml-2" />
                      </button>
                    ) : (
                      <button
                        disabled
                        className="w-full px-4 py-2 bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed"
                      >
                        Downgrade Not Available
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Billing History</h3>
            {billingHistory.length > 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {billingHistory.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(invoice.created * 1000).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {invoice.description || 'Subscription'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${(invoice.amount_paid / 100).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                            invoice.status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <a
                            href={invoice.invoice_pdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex items-center"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                            Download
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No billing history available</p>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
            <div className="flex items-start">
              <SparklesIcon className="h-6 w-6 text-purple-600 mr-3 flex-shrink-0" />
              <div>
                <h4 className="text-lg font-medium text-gray-900">Need a Custom Plan?</h4>
                <p className="mt-1 text-sm text-gray-600">
                  For organizations with specific requirements, we offer custom enterprise solutions 
                  with tailored features, dedicated support, and flexible pricing.
                </p>
                <button
                  onClick={() => window.location.href = 'mailto:sales@dottapps.com?subject=Enterprise Plan Inquiry'}
                  className="mt-3 text-sm font-medium text-purple-600 hover:text-purple-700"
                >
                  Contact Sales →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingSubscriptions;