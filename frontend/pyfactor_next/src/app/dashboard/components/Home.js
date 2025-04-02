'use client';

import React, { useState } from 'react';
import { getSubscriptionPlanColor } from '@/utils/userAttributes';

/**
 * Home Component
 * A simplified home component that doesn't make heavy API calls
 */
function Home({ userData }) {
  const [planDetailsOpen, setPlanDetailsOpen] = useState(false);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [paymentTab, setPaymentTab] = useState(0);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('credit_card');

  const handlePaymentTabChange = (event, newValue) => {
    setPaymentTab(newValue);
  };

  const handlePaymentMethodChange = (event) => {
    setSelectedPaymentMethod(event.target.value);
  };

  const handlePlanDetailsOpen = () => {
    setPlanDetailsOpen(true);
  };

  const handlePlanDetailsClose = () => {
    setPlanDetailsOpen(false);
  };

  const handleUpgradeDialogOpen = () => {
    setUpgradeDialogOpen(true);
  };

  const handleUpgradeDialogClose = () => {
    setUpgradeDialogOpen(false);
  };

  // Data for subscription plans
  const PLANS = [
    {
      id: 'free',
      name: 'Free Plan',
      price: '0',
      description: 'Basic features for small businesses just getting started',
      features: [
        'Basic invoicing',
        'Up to 5 clients',
        'Basic reporting',
        'Email support',
        '2GB storage',
      ],
      limitations: [
        'Limited to 5 invoices per month',
        'No custom branding',
        'Basic reporting only',
        'No API access',
        'Single user only',
      ]
    },
    {
      id: 'professional',
      name: 'Professional Plan',
      price: '15',
      description: 'Advanced features for growing businesses',
      features: [
        'Unlimited invoicing',
        'Unlimited clients',
        'Advanced reporting',
        'Priority support',
        'Custom branding',
        '15GB storage',
        'Up to 3 users',
      ]
    },
    {
      id: 'enterprise',
      name: 'Enterprise Plan',
      price: '45',
      description: 'Full suite of tools for established businesses',
      features: [
        'Everything in Professional',
        'Unlimited storage',
        'Unlimited users',
        'Dedicated account manager',
        'Advanced API access',
        'Custom roles & permissions',
        'Advanced security features',
        'Preferential transaction rates',
      ]
    },
  ];

  // Find current user's plan
  const currentPlan = PLANS.find(plan => 
    plan.id === (userData?.subscription_type?.toLowerCase() || 'free')
  ) || PLANS[0];

  // Helper function to get an icon for a feature
  const getFeatureIcon = (feature) => {
    if (feature.includes('invoic')) return 'check-circle';
    if (feature.includes('client')) return 'users';
    if (feature.includes('report')) return 'chart-line';
    if (feature.includes('support')) return 'headset';
    if (feature.includes('storage')) return 'database';
    if (feature.includes('user')) return 'users';
    if (feature.includes('API')) return 'code';
    if (feature.includes('security')) return 'shield-alt';
    return 'check-circle';
  };

  // Function to get plan color
  const getPlanColor = (planId) => {
    return getSubscriptionPlanColor(planId);
  };

  return (
    <div className="pt-1.5 pb-2">
      <h1 className="text-2xl font-bold mb-2">
        Home
      </h1>
      
      <p className="mb-4">
        Welcome to your Dott dashboard, {userData?.first_name || 'User'}!
      </p>
      
      {/* Subscription Expired Banner */}
      {userData?.subscription_expired && (
        <div className="p-3 mb-4 bg-red-100 border-l-4 border-red-500 rounded shadow">
          <h2 className="text-lg font-semibold mb-1 text-red-800">
            Your {userData.previous_plan} subscription has expired
          </h2>
          <p className="mb-3">
            Your account has been downgraded to the Free plan. You now have limited access to features.
          </p>
          <div className="flex gap-2">
            <button 
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              onClick={handleUpgradeDialogOpen}
            >
              Renew Subscription
            </button>
            <button 
              className="px-4 py-2 border border-red-600 text-red-600 rounded hover:bg-red-50"
              onClick={handlePlanDetailsOpen}
            >
              View Plan Details
            </button>
          </div>
        </div>
      )}
      
      {/* Regular Plan Banner (shown when subscription is not expired) */}
      {!userData?.subscription_expired && (
        <div className="p-3 mb-4 bg-blue-100 rounded shadow">
          <h2 className="text-lg font-semibold mb-1">
            Your {currentPlan.name} is active
          </h2>
          <p className="mb-3">
            You have access to all the features included in your plan.
          </p>
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={handlePlanDetailsOpen}
          >
            View Plan Details
          </button>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-3 bg-white rounded shadow flex flex-col h-full">
          <h2 className="text-lg font-semibold mb-2">
            Getting Started
          </h2>
          <p className="text-sm mb-3">
            Complete these steps to get the most out of your account:
          </p>
          <ul className="pl-5 list-disc">
            <li className="mb-1">
              <span className="text-sm">
                Complete your business profile
              </span>
            </li>
            <li className="mb-1">
              <span className="text-sm">
                Add your first customer
              </span>
            </li>
            <li className="mb-1">
              <span className="text-sm">
                Create your first product or service
              </span>
            </li>
            <li>
              <span className="text-sm">
                Explore the dashboard features
              </span>
            </li>
          </ul>
        </div>
        
        <div className="p-3 bg-white rounded shadow flex flex-col h-full">
          <h2 className="text-lg font-semibold mb-2">
            Recent Updates
          </h2>
          <p className="text-sm mb-3">
            No recent updates to display.
          </p>
          <p className="text-sm text-gray-500">
            Updates about your account and new features will appear here.
          </p>
        </div>
      </div>

      {/* Plan Details Dialog */}
      {planDetailsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Your Subscription Details</h2>
                <button 
                  onClick={handlePlanDetailsClose}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4">
                <h3 className="text-xl font-medium mb-1">
                  {currentPlan.name}
                </h3>
                <div className="flex items-center mb-2">
                  <span className="text-2xl font-bold text-blue-600 mr-1">
                    ${currentPlan.price}
                  </span>
                  <span className="text-sm text-gray-500">
                    per month
                  </span>
                </div>
                <p className="mb-3">
                  {currentPlan.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="px-3 py-1 rounded-full text-sm border border-green-500 text-green-700 bg-green-50 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Active
                  </span>
                  <span className="px-3 py-1 rounded-full text-sm border border-blue-500 text-blue-700 bg-blue-50 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Current Plan
                  </span>
                </div>
              </div>

              <div className="border-t border-gray-200 my-4"></div>

              <div>
                <h4 className="text-lg font-medium mb-2">
                  Features Included
                </h4>
                <ul className="space-y-2">
                  {currentPlan.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {currentPlan.id === 'free' && (
                <>
                  <div className="border-t border-gray-200 my-4"></div>
                  
                  <div>
                    <h4 className="text-lg font-medium mb-2">
                      Limitations on Free Plan
                    </h4>
                    <ul className="space-y-2">
                      {currentPlan.limitations.map((limitation) => (
                        <li key={limitation} className="flex items-start">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span>{limitation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="mt-4 mb-1">
                    <p className="mb-3">
                      Upgrade now to unlock all features and remove limitations!
                    </p>
                    <button 
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      onClick={handleUpgradeDialogOpen}
                    >
                      Upgrade Here
                    </button>
                  </div>
                </>
              )}

              {currentPlan.id === 'professional' && (
                <>
                  <div className="border-t border-gray-200 my-4"></div>
                  
                  <div className="mt-4 mb-1">
                    <button 
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      onClick={handleUpgradeDialogOpen}
                    >
                      Upgrade to Enterprise
                    </button>
                  </div>
                </>
              )}
            </div>
            <div className="bg-gray-50 px-6 py-3 flex justify-end border-t border-gray-200">
              <button 
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
                onClick={handlePlanDetailsClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Subscription Dialog */}
      {upgradeDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Upgrade Your Subscription</h2>
                <button 
                  onClick={handleUpgradeDialogClose}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <p className="mb-4">
                Choose a plan that suits your business needs
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {currentPlan.id === 'free' 
                  ? PLANS.filter(plan => plan.id !== 'free').map((plan) => (
                    <div 
                      key={plan.id}
                      className={`border rounded-lg flex flex-col h-full ${
                        plan.id === 'enterprise' 
                          ? 'border-blue-500 shadow-md' 
                          : `border-${getPlanColor(plan.id)}-500`
                      }`}
                    >
                      <div className="p-4 flex-grow">
                        <h3 className="text-lg font-medium mb-1">
                          {plan.name}
                        </h3>
                        <div className="mb-2">
                          <span className="text-xl font-bold text-blue-600">
                            ${plan.price}
                          </span>
                          <span className="text-sm text-gray-500">
                            /month
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          {plan.description}
                        </p>
                        <div className="mt-3">
                          {plan.features.slice(0, 5).map((feature) => (
                            <p key={feature} className="text-sm text-gray-600 py-0.5 flex items-start">
                              <span className="text-green-500 mr-1">✓</span> {feature}
                            </p>
                          ))}
                          {plan.features.length > 5 && (
                            <p className="text-sm text-blue-600 py-0.5">
                              + {plan.features.length - 5} more features
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="p-4 border-t border-gray-200">
                        <button
                          className={`w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700`}
                        >
                          Select {plan.name}
                        </button>
                      </div>
                    </div>
                  ))
                  : currentPlan.id === 'professional' && (
                    <div className="col-span-1 sm:col-span-2 border border-blue-500 rounded-lg flex flex-col h-full shadow-md">
                      {PLANS.find(plan => plan.id === 'enterprise') && (
                        <>
                          <div className="p-4 flex-grow">
                            <h3 className="text-lg font-medium mb-1">
                              {PLANS.find(plan => plan.id === 'enterprise').name}
                            </h3>
                            <div className="mb-2">
                              <span className="text-xl font-bold text-blue-600">
                                ${PLANS.find(plan => plan.id === 'enterprise').price}
                              </span>
                              <span className="text-sm text-gray-500">
                                /month
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">
                              {PLANS.find(plan => plan.id === 'enterprise').description}
                            </p>
                            <p className="text-sm font-medium text-blue-600 mb-2">
                              Upgrade Benefits from Professional Plan:
                            </p>
                            <div className="mt-3">
                              {PLANS.find(plan => plan.id === 'enterprise').features
                                .filter(feature => 
                                  !PLANS.find(plan => plan.id === 'professional').features.includes(feature))
                                .map((feature) => (
                                  <p key={feature} className="text-sm text-gray-600 py-0.5 flex items-start">
                                    <span className="text-green-500 mr-1">✓</span> {feature}
                                  </p>
                                ))}
                            </div>
                          </div>
                          <div className="p-4 border-t border-gray-200">
                            <button
                              className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Upgrade to Enterprise
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )
                }
              </div>
              
              <div className="border-t border-gray-200 my-4"></div>
              
              <div>
                <h3 className="text-lg font-medium mb-3">
                  Payment Method
                </h3>
                
                <div className="border-b border-gray-200 mb-4">
                  <div className="flex space-x-4">
                    <button
                      className={`py-2 px-4 font-medium ${
                        paymentTab === 0
                          ? 'text-blue-600 border-b-2 border-blue-500'
                          : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                      onClick={(e) => handlePaymentTabChange(e, 0)}
                    >
                      Credit/Debit Card
                    </button>
                    <button
                      className={`py-2 px-4 font-medium ${
                        paymentTab === 1
                          ? 'text-blue-600 border-b-2 border-blue-500'
                          : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                      onClick={(e) => handlePaymentTabChange(e, 1)}
                    >
                      PayPal
                    </button>
                    <button
                      className={`py-2 px-4 font-medium ${
                        paymentTab === 2
                          ? 'text-blue-600 border-b-2 border-blue-500'
                          : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                      onClick={(e) => handlePaymentTabChange(e, 2)}
                    >
                      Mobile Money
                    </button>
                  </div>
                </div>
                
                {paymentTab === 0 && (
                  <div className="mt-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="col-span-1 sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                        <input
                          type="text"
                          placeholder="1234 5678 9012 3456"
                          className="w-full p-2 border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          className="w-full p-2 border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                        <input
                          type="text"
                          placeholder="123"
                          className="w-full p-2 border border-gray-300 rounded"
                        />
                      </div>
                      <div className="col-span-1 sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cardholder Name</label>
                        <input
                          type="text"
                          placeholder="John Doe"
                          className="w-full p-2 border border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {paymentTab === 1 && (
                  <div className="mt-3">
                    <p className="text-sm mb-2">
                      You will be redirected to PayPal to complete your payment after clicking the button below.
                    </p>
                  </div>
                )}
                
                {paymentTab === 2 && (
                  <div className="mt-3">
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="mobile_money_mtn"
                          name="paymentMethod"
                          value="mobile_money_mtn"
                          checked={selectedPaymentMethod === 'mobile_money_mtn'}
                          onChange={handlePaymentMethodChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="mobile_money_mtn" className="ml-2 block text-sm text-gray-700">
                          MTN Mobile Money
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="mobile_money_airtel"
                          name="paymentMethod"
                          value="mobile_money_airtel"
                          checked={selectedPaymentMethod === 'mobile_money_airtel'}
                          onChange={handlePaymentMethodChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="mobile_money_airtel" className="ml-2 block text-sm text-gray-700">
                          Airtel Money
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="mobile_money_other"
                          name="paymentMethod"
                          value="mobile_money_other"
                          checked={selectedPaymentMethod === 'mobile_money_other'}
                          onChange={handlePaymentMethodChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="mobile_money_other" className="ml-2 block text-sm text-gray-700">
                          Other Mobile Money
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                      <input
                        type="text"
                        placeholder="Enter your mobile number"
                        className="w-full p-2 border border-gray-300 rounded"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-3 flex justify-end border-t border-gray-200">
              <button 
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded mr-2"
                onClick={handleUpgradeDialogClose}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Complete Upgrade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;