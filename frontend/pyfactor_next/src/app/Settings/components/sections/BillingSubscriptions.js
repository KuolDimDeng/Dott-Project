'use client';

import React, { useState, useEffect } from 'react';
import { 
  CreditCardIcon,
  DocumentDuplicateIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { logger } from '@/utils/logger';
import { useStripe } from '@/hooks/useStripe';

const BillingSubscriptions = ({ user, profileData, isOwner, notifySuccess, notifyError }) => {
  const { createCheckoutSession, createPortalSession } = useStripe();
  const [loading, setLoading] = useState(true);
  const [billingData, setBillingData] = useState({
    subscription: null,
    invoices: [],
    paymentMethod: null,
    upcomingInvoice: null
  });
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Subscription plans
  const subscriptionPlans = [
    {
      id: 'free',
      name: 'Free Plan',
      price: 0,
      interval: 'month',
      features: [
        '1 User',
        '3GB Storage',
        'Basic Features',
        'Email Support'
      ],
      color: 'gray'
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 15,
      interval: 'month',
      priceYearly: 144,
      features: [
        '5 Users',
        '50GB Storage',
        'Advanced Features',
        'Priority Support',
        'API Access',
        'Custom Reports'
      ],
      color: 'blue',
      popular: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 45,
      interval: 'month',
      priceYearly: 432,
      features: [
        'Unlimited Users',
        '500GB Storage',
        'All Features',
        '24/7 Phone Support',
        'API Access',
        'Custom Integration',
        'Dedicated Account Manager'
      ],
      color: 'purple'
    }
  ];

  // Fetch billing data
  useEffect(() => {
    const fetchBillingData = async () => {
      try {
        setLoading(true);
        
        // Fetch subscription data
        const subResponse = await fetch('/api/billing/subscription');
        if (subResponse.ok) {
          const subData = await subResponse.json();
          setBillingData(prev => ({ ...prev, subscription: subData }));
        }

        // Fetch invoices
        const invoicesResponse = await fetch('/api/billing/invoices');
        if (invoicesResponse.ok) {
          const invoicesData = await invoicesResponse.json();
          setBillingData(prev => ({ ...prev, invoices: invoicesData.data || [] }));
        }

        // Fetch payment method
        const pmResponse = await fetch('/api/billing/payment-method');
        if (pmResponse.ok) {
          const pmData = await pmResponse.json();
          setBillingData(prev => ({ ...prev, paymentMethod: pmData }));
        }

        // Fetch upcoming invoice
        const upcomingResponse = await fetch('/api/billing/upcoming-invoice');
        if (upcomingResponse.ok) {
          const upcomingData = await upcomingResponse.json();
          setBillingData(prev => ({ ...prev, upcomingInvoice: upcomingData }));
        }
      } catch (error) {
        logger.error('[BillingSubscriptions] Error fetching billing data:', error);
        notifyError('Failed to load billing information');
      } finally {
        setLoading(false);
      }
    };

    if (isOwner) {
      fetchBillingData();
    } else {
      setLoading(false);
    }
  }, [isOwner, notifyError]);

  // Handle upgrade/downgrade
  const handlePlanChange = async (planId) => {
    try {
      if (planId === 'free') {
        setShowCancelModal(true);
        return;
      }

      const priceId = planId === 'professional' ? 'price_professional' : 'price_enterprise';
      await createCheckoutSession(priceId);
    } catch (error) {
      logger.error('[BillingSubscriptions] Error changing plan:', error);
      notifyError('Failed to change subscription plan');
    }
  };

  // Handle subscription cancellation
  const handleCancelSubscription = async () => {
    try {
      setCancelling(true);
      
      const response = await fetch('/api/billing/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      notifySuccess('Your subscription has been cancelled. You will continue to have access until the end of your billing period.');
      setShowCancelModal(false);
      
      // Refresh billing data
      window.location.reload();
    } catch (error) {
      logger.error('[BillingSubscriptions] Error cancelling subscription:', error);
      notifyError('Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  // Handle manage billing (Stripe portal)
  const handleManageBilling = async () => {
    try {
      await createPortalSession();
    } catch (error) {
      logger.error('[BillingSubscriptions] Error opening billing portal:', error);
      notifyError('Failed to open billing portal');
    }
  };

  // Get current plan
  const currentPlan = subscriptionPlans.find(
    plan => plan.id === (billingData.subscription?.plan?.id || 'free')
  ) || subscriptionPlans[0];

  if (!isOwner) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">Access Restricted</p>
              <p>Only the account owner can view and manage billing information.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-gray-500">Loading billing information...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Billing & Subscriptions</h2>
        <p className="text-sm text-gray-600">
          Manage your subscription plan and billing information
        </p>
      </div>

      {/* Current Plan */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Current Plan</h3>
          {billingData.subscription && (
            <button
              onClick={handleManageBilling}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Manage Billing
            </button>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-gray-900">{currentPlan.name}</p>
            <p className="text-gray-600">
              ${currentPlan.price}/{currentPlan.interval}
              {currentPlan.priceYearly && ` or $${currentPlan.priceYearly}/year`}
            </p>
          </div>
          {billingData.subscription?.status && (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              billingData.subscription.status === 'active' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {billingData.subscription.status}
            </span>
          )}
        </div>

        {billingData.subscription?.current_period_end && (
          <p className="text-sm text-gray-500 mt-2">
            {billingData.subscription.cancel_at_period_end 
              ? `Cancels on ${new Date(billingData.subscription.current_period_end * 1000).toLocaleDateString()}`
              : `Renews on ${new Date(billingData.subscription.current_period_end * 1000).toLocaleDateString()}`
            }
          </p>
        )}
      </div>

      {/* Subscription Plans */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Available Plans</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {subscriptionPlans.map((plan) => {
            const isCurrent = plan.id === currentPlan.id;
            
            return (
              <div
                key={plan.id}
                className={`relative border rounded-lg p-6 ${
                  plan.popular ? 'border-blue-500 shadow-lg' : 'border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">{plan.name}</h4>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">${plan.price}</span>
                    <span className="text-gray-500">/{plan.interval}</span>
                  </div>
                  {plan.priceYearly && (
                    <p className="text-sm text-gray-600 mt-1">
                      ${plan.priceYearly}/year (save ${(plan.price * 12 - plan.priceYearly).toFixed(0)})
                    </p>
                  )}
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handlePlanChange(plan.id)}
                  disabled={isCurrent}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                    isCurrent
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : plan.popular
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {isCurrent ? 'Current Plan' : plan.price > currentPlan.price ? 'Upgrade' : 'Downgrade'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment Method */}
      {billingData.paymentMethod && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Method</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CreditCardIcon className="h-8 w-8 text-gray-400 mr-3" />
              <div>
                <p className="font-medium">
                  •••• •••• •••• {billingData.paymentMethod.last4}
                </p>
                <p className="text-sm text-gray-500">
                  Expires {billingData.paymentMethod.exp_month}/{billingData.paymentMethod.exp_year}
                </p>
              </div>
            </div>
            <button
              onClick={handleManageBilling}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Update
            </button>
          </div>
        </div>
      )}

      {/* Billing History */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Billing History</h3>
        </div>
        
        {billingData.invoices.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            No billing history available
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {billingData.invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(invoice.created * 1000).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {invoice.description || 'Subscription'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${(invoice.amount_paid / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        invoice.status === 'paid' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <a
                        href={invoice.invoice_pdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <DocumentDuplicateIcon className="h-5 w-5 inline" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Cancel Subscription</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to cancel your subscription? You'll lose access to premium features at the end of your billing period.
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-700 font-medium mb-2">You'll lose access to:</p>
              <ul className="space-y-1">
                {currentPlan.features.slice(1).map((feature, index) => (
                  <li key={index} className="flex items-start text-sm text-gray-600">
                    <XCircleIcon className="h-4 w-4 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={cancelling}
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                disabled={cancelling}
              >
                {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingSubscriptions;