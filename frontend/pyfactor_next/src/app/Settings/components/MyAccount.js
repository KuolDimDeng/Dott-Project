import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSubscriptionPlanColor } from '@/utils/userAttributes';

const MyAccount = ({ userData }) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const router = useRouter();
  
  const handleTabChange = (newValue) => {
    setSelectedTab(newValue);
  };
  
  const handleUpgradeClick = () => {
    router.push('/onboarding/subscription');
  };

  const getPlanColor = (planId) => {
    return getSubscriptionPlanColor(planId);
  };

  // SVG Icons
  const PersonIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );

  const CreditCardIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );

  const ReceiptIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );

  const HistoryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const CheckCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const renderAccountInfo = () => {
    return (
      <div>
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex items-center mb-4">
            <div className="w-16 h-16 rounded-full bg-blue-900 text-white flex items-center justify-center text-2xl mr-4">
              {userData?.first_name?.charAt(0)}{userData?.last_name?.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-medium">{userData?.full_name || 'User'}</h2>
              <p className="text-gray-600 text-sm">
                {userData?.email || 'user@example.com'}
              </p>
            </div>
          </div>

          <hr className="my-4 border-gray-200" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500 font-medium">
                Business Name
              </p>
              <p className="text-gray-800">{userData?.business_name || 'My Business'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">
                Subscription Plan
              </p>
              <div className="flex items-center">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  userData?.subscription_type === 'free' 
                    ? 'bg-gray-100 text-gray-800' 
                    : 'bg-blue-100 text-blue-800'
                } mr-2`}>
                  {userData?.subscription_type === 'enterprise' 
                    ? 'Enterprise Plan' 
                    : userData?.subscription_type === 'professional' 
                      ? 'Professional Plan' 
                      : 'Free Plan'}
                </span>
                {userData?.subscription_type === 'free' && (
                  <button 
                    onClick={handleUpgradeClick}
                    className="text-xs px-2 py-1 rounded border border-blue-600 text-blue-600 hover:bg-blue-50"
                  >
                    Upgrade
                  </button>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">
                Phone Number
              </p>
              <p className="text-gray-800">{userData?.phone_number || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">
                Account Created
              </p>
              <p className="text-gray-800">
                {userData?.created_at 
                  ? new Date(userData.created_at).toLocaleDateString() 
                  : 'Not available'}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <button 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={() => router.push('/settings/profile')}
            >
              <PersonIcon />
              <span className="ml-2">Edit Profile</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSubscriptionManagement = () => {
    // Get current plan features based on subscription type
    const getPlanFeatures = (planType) => {
      switch(planType) {
        case 'enterprise':
          return [
            'Unlimited Invoices',
            'Unlimited Clients',
            'Advanced Reporting',
            'Premium Support',
            'Unlimited Storage',
            'Unlimited Users',
            'API Access',
            'Enhanced Security'
          ];
        case 'professional':
          return [
            'Up to 1000 Invoices',
            'Up to 500 Clients',
            'Standard Reporting',
            'Priority Support',
            '50GB Storage',
            'Up to 10 Users',
            'Basic API Access',
            'Standard Security'
          ];
        default: // Free plan
          return [
            'Up to 5 Invoices',
            'Up to 3 Clients',
            'Basic Reporting',
            'Community Support',
            '1GB Storage',
            '1 User',
            'No API Access',
            'Basic Security'
          ];
      }
    };

    const getTailwindColor = (planType) => {
      switch(planType) {
        case 'enterprise':
          return 'purple';
        case 'professional':
          return 'blue';
        default:
          return 'gray';
      }
    };

    const currentPlanFeatures = getPlanFeatures(userData?.subscription_type);
    const currentPlanType = userData?.subscription_type || 'free';
    const colorName = getTailwindColor(currentPlanType);

    return (
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Current Subscription
        </h2>
        
        <div className={`mb-6 rounded-lg border border-${colorName}-500 overflow-hidden bg-white shadow`}>
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-xl font-medium text-${colorName}-600`}>
                {userData?.subscription_type === 'enterprise' 
                  ? 'Enterprise Plan' 
                  : userData?.subscription_type === 'professional' 
                    ? 'Professional Plan' 
                    : 'Free Plan'}
              </h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${colorName}-500 text-white`}>
                Active
              </span>
            </div>
            
            <p className="text-sm text-gray-600 mb-3">
              Plan Features:
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentPlanFeatures.map((feature, index) => (
                <div key={index} className="flex items-center">
                  <span className={`text-${colorName}-500 mr-2`}>
                    <CheckCircleIcon />
                  </span>
                  <span className="text-sm text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            {userData?.subscription_type === 'free' ? (
              <button 
                className={`w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-${colorName === 'gray' ? 'blue' : colorName}-600 hover:bg-${colorName === 'gray' ? 'blue' : colorName}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                onClick={handleUpgradeClick}
              >
                Upgrade Plan
              </button>
            ) : (
              <div className="flex">
                <button 
                  className={`px-4 py-2 border border-${colorName}-500 text-${colorName}-600 rounded-md hover:bg-${colorName}-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${colorName}-500`}
                >
                  Manage Subscription
                </button>
                <button 
                  className="ml-3 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  View Billing History
                </button>
              </div>
            )}
          </div>
        </div>
        
        {userData?.subscription_type === 'free' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Professional Plan Card */}
            <div className="border border-blue-500 rounded-lg overflow-hidden bg-white shadow">
              <div className="p-6">
                <h3 className="text-lg font-medium mb-2">Professional Plan</h3>
                <p className="text-2xl font-bold text-blue-600 mb-4">
                  $19.99<span className="text-sm font-normal">/mo</span>
                </p>
                <ul className="space-y-2">
                  {getPlanFeatures('professional').map((feature, index) => (
                    <li key={index} className="flex items-center text-sm">
                      <span className="text-blue-500 mr-2 flex-shrink-0">
                        <CheckCircleIcon />
                      </span>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <button 
                  className="w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onClick={handleUpgradeClick}
                >
                  Upgrade
                </button>
              </div>
            </div>
            
            {/* Enterprise Plan Card */}
            <div className="border border-purple-500 rounded-lg overflow-hidden bg-white shadow">
              <div className="p-6">
                <h3 className="text-lg font-medium mb-2">Enterprise Plan</h3>
                <p className="text-2xl font-bold text-purple-600 mb-4">
                  $49.99<span className="text-sm font-normal">/mo</span>
                </p>
                <ul className="space-y-2">
                  {getPlanFeatures('enterprise').map((feature, index) => (
                    <li key={index} className="flex items-center text-sm">
                      <span className="text-purple-500 mr-2 flex-shrink-0">
                        <CheckCircleIcon />
                      </span>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <button 
                  className="w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                  onClick={handleUpgradeClick}
                >
                  Upgrade
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderBillingHistory = () => {
    // Mock data for billing history
    const billingHistory = [
      { id: 1, date: '2023-03-01', amount: 19.99, plan: 'Professional', status: 'Paid' },
      { id: 2, date: '2023-02-01', amount: 19.99, plan: 'Professional', status: 'Paid' },
      { id: 3, date: '2023-01-01', amount: 19.99, plan: 'Professional', status: 'Paid' },
    ];

    return (
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Billing History
        </h2>
        
        {billingHistory.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {billingHistory.map((item) => (
                <li key={item.id} className="p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 text-gray-500">
                      <ReceiptIcon />
                    </div>
                    <div className="ml-3 flex-grow">
                      <p className="text-sm font-medium text-gray-900">{`${item.plan} Plan - $${item.amount}`}</p>
                      <p className="text-sm text-gray-500">{new Date(item.date).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center">
                      <span className={`mr-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.status}
                      </span>
                      <button className="text-sm text-blue-600 hover:text-blue-800">
                        Download
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="rounded-md bg-blue-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0 text-blue-400">
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  No billing history available.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        My Account
      </h1>
      
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
            onClick={() => handleTabChange(0)}
            className={`flex items-center mr-8 py-4 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 0
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <PersonIcon />
            <span className="ml-2">Account Info</span>
          </button>
          <button
            onClick={() => handleTabChange(1)}
            className={`flex items-center mr-8 py-4 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 1
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <CreditCardIcon />
            <span className="ml-2">Subscription</span>
          </button>
          <button
            onClick={() => handleTabChange(2)}
            className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 2
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <HistoryIcon />
            <span className="ml-2">Billing History</span>
          </button>
        </nav>
      </div>
      
      {selectedTab === 0 && renderAccountInfo()}
      {selectedTab === 1 && renderSubscriptionManagement()}
      {selectedTab === 2 && renderBillingHistory()}
    </div>
  );
};

export default MyAccount;