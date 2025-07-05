'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSubscriptionPlanColor } from '@/utils/userAttributes';
import SubscriptionPopup from '../../dashboard/components/SubscriptionPopup';
import { useNotification } from '@/context/NotificationContext';
import AuditTrail from '@/app/dashboard/components/AuditTrail';

const MyAccount = ({ userData }) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [showSubscriptionPopup, setShowSubscriptionPopup] = useState(false);
  const [showCloseAccountModal, setShowCloseAccountModal] = useState(false);
  const [closureStep, setClosureStep] = useState('confirm');
  const [feedbackReason, setFeedbackReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [enhancedUserData, setEnhancedUserData] = useState(userData);
  const router = useRouter();
  const { notifySuccess, notifyError } = useNotification();

  // Fetch user data from Auth0 profile API when component mounts
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/auth/profile');
        if (response.ok) {
          const profileData = await response.json();
          setEnhancedUserData({
            ...userData,
            ...profileData,
            firstName: profileData.given_name || profileData.firstName || userData?.firstName || '',
            lastName: profileData.family_name || profileData.lastName || userData?.lastName || '',
            email: profileData.email || userData?.email,
            name: profileData.name || userData?.name,
            tenantId: profileData.tenantId || profileData.tenant_id || userData?.tenantId,
            selected_plan: profileData.selected_plan,
            subscriptionPlan: profileData.subscriptionPlan,
          });
        }
      } catch (error) {
        console.error('Error fetching Auth0 profile data:', error);
        setEnhancedUserData(userData || {});
      }
    };
    
    fetchUserData();
  }, [userData]);

  const userDisplayData = enhancedUserData || userData || {};

  const handleTabChange = (newValue) => {
    setSelectedTab(newValue);
  };

  const handleUpgradeClick = () => {
    setShowSubscriptionPopup(true);
  };

  const getEffectiveSubscriptionType = () => {
    const plan = userDisplayData?.selected_plan || 
                 userDisplayData?.subscriptionPlan ||
                 userDisplayData?.subscription_plan ||
                 'free';
    return plan.toLowerCase();
  };

  const handleOpenCloseAccountModal = () => {
    setShowCloseAccountModal(true);
    setClosureStep('confirm');
  };

  const handleCloseAccountModal = () => {
    setShowCloseAccountModal(false);
    setClosureStep('confirm');
    setFeedbackReason('');
  };

  const handleProceedToFeedback = () => {
    setClosureStep('feedback');
  };

  const handleSubmitFeedback = async () => {
    try {
      setIsProcessing(true);
      setClosureStep('processing');
      
      const tenantId = userDisplayData?.tenantId || 
                        localStorage.getItem('tenantId') || 
                        document.cookie.split('; ').find(row => row.startsWith('tenantId='))?.split('=')[1];
      
      const userId = userDisplayData?.id || userDisplayData?.sub;
      
      if (!tenantId || !userId) {
        notifyError('Unable to process your request. Missing required information.');
        setIsProcessing(false);
        return;
      }
      
      const response = await fetch('/api/user/close-account-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: feedbackReason,
          userId: userId,
          tenantId: tenantId,
        }),
      });
      
      if (response.ok) {
        localStorage.clear();
        document.cookie.split(';').forEach(c => {
          document.cookie = c
            .replace(/^ +/, '')
            .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
        });
        
        notifySuccess('Account closure request submitted successfully');
        
        setTimeout(() => {
          window.location.href = '/api/auth/logout?returnTo=' + encodeURIComponent('/account-closed');
        }, 1500);
      } else {
        throw new Error('Failed to close account');
      }
      
    } catch (error) {
      console.error('Error closing account:', error);
      setIsProcessing(false);
      setClosureStep('feedback');
      notifyError('There was an error closing your account. Please try again or contact support.');
    }
  };

  // Icon components
  const UserIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );

  const ActivityIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );

  const SecurityIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );

  const BillingIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );

  const renderAccountInfo = () => {
    return (
      <div className="space-y-6">
        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/50 flex items-center justify-center text-3xl font-medium text-white">
                {userDisplayData?.firstName?.charAt(0) || ''}{userDisplayData?.lastName?.charAt(0) || ''}
              </div>
              <div className="text-white">
                <h2 className="text-2xl font-semibold">
                  {userDisplayData?.firstName || ''} {userDisplayData?.lastName || ''}
                </h2>
                <p className="text-blue-100 mt-1">{userDisplayData?.email || ''}</p>
              </div>
            </div>
          </div>
          
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">Business Name</label>
                <p className="mt-1 text-gray-900">{userDisplayData?.businessName || 'Not set'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Subscription Plan</label>
                <div className="mt-1 flex items-center space-x-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    getEffectiveSubscriptionType() === 'free'
                      ? 'bg-gray-100 text-gray-800' 
                      : getEffectiveSubscriptionType() === 'professional'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                  }`}>
                    {getEffectiveSubscriptionType() === 'enterprise'
                      ? 'Enterprise' 
                      : getEffectiveSubscriptionType() === 'professional'
                        ? 'Professional' 
                        : 'Free'}
                  </span>
                  {getEffectiveSubscriptionType() === 'free' && (
                    <button 
                      onClick={handleUpgradeClick}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      Upgrade
                    </button>
                  )}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Phone Number</label>
                <p className="mt-1 text-gray-900">{userDisplayData?.phone_number || 'Not provided'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Member Since</label>
                <p className="mt-1 text-gray-900">
                  {userDisplayData?.created_at 
                    ? new Date(userDisplayData.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })
                    : 'Not available'}
                </p>
              </div>
            </div>
            
            <div className="mt-8 flex flex-wrap gap-3">
              <button 
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                onClick={() => router.push('/settings/profile')}
              >
                <UserIcon />
                <span className="ml-2">Edit Profile</span>
              </button>
              
              <button 
                className="inline-flex items-center px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                onClick={handleOpenCloseAccountModal}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="ml-2">Close Account</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderActivityLog = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Your Activity History</h3>
            <p className="mt-1 text-sm text-gray-600">
              View all your actions and changes made to your account
            </p>
          </div>
          <AuditTrail userSpecific={true} />
        </div>
      </div>
    );
  };

  const renderSecuritySettings = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Security Settings</h3>
          
          <div className="space-y-4">
            <div className="p-4 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Two-Factor Authentication</h4>
              <p className="text-sm text-gray-600 mb-3">Add an extra layer of security to your account</p>
              <button className="text-sm font-medium text-blue-600 hover:text-blue-700">
                Enable 2FA
              </button>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Login Sessions</h4>
              <p className="text-sm text-gray-600 mb-3">Manage your active sessions across devices</p>
              <button className="text-sm font-medium text-blue-600 hover:text-blue-700">
                View Sessions
              </button>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Password</h4>
              <p className="text-sm text-gray-600 mb-3">Last changed 30 days ago</p>
              <button className="text-sm font-medium text-blue-600 hover:text-blue-700">
                Change Password
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBilling = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Billing & Subscription</h3>
          
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-medium text-gray-900">Current Plan</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {getEffectiveSubscriptionType() === 'free' ? 'Free Plan' : 
                     getEffectiveSubscriptionType() === 'professional' ? 'Professional Plan' : 
                     'Enterprise Plan'}
                  </p>
                </div>
                {getEffectiveSubscriptionType() !== 'free' && (
                  <button className="text-sm font-medium text-gray-600 hover:text-gray-700">
                    Manage
                  </button>
                )}
              </div>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Payment Method</h4>
              <p className="text-sm text-gray-600">
                {getEffectiveSubscriptionType() === 'free' ? 'No payment method required' : 'Visa ending in 4242'}
              </p>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Billing History</h4>
              <p className="text-sm text-gray-600 mb-3">Download invoices and receipts</p>
              <button className="text-sm font-medium text-blue-600 hover:text-blue-700">
                View History
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Account closure modal component
  const AccountClosureModal = () => {
    if (!showCloseAccountModal) return null;
    
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 py-12">
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" aria-hidden="true"></div>
          
          <div className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all max-w-lg w-full">
            {closureStep === 'confirm' && (
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Close Your Account</h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to close your account? This action cannot be undone. All your data will be permanently removed from our servers.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={handleProceedToFeedback}
                  >
                    Yes, close my account
                  </button>
                  <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                    onClick={handleCloseAccountModal}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            {closureStep === 'feedback' && (
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Help Us Improve</h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 mb-4">
                        We're sorry to see you go. Please let us know why you're closing your account:
                      </p>
                      <div className="space-y-2">
                        {[
                          { value: 'app_functionality', label: "The app doesn't meet my needs" },
                          { value: 'usability_issues', label: 'App is difficult to use' },
                          { value: 'found_alternative', label: 'I found a better alternative' },
                          { value: 'other', label: 'Other reason' }
                        ].map((reason) => (
                          <label key={reason.value} className="flex items-center space-x-3">
                            <input
                              type="radio"
                              className="form-radio h-4 w-4 text-blue-600"
                              checked={feedbackReason === reason.value}
                              onChange={() => setFeedbackReason(reason.value)}
                            />
                            <span className="text-gray-700">{reason.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                    onClick={handleSubmitFeedback}
                    disabled={!feedbackReason}
                  >
                    Submit & Close Account
                  </button>
                  <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                    onClick={() => setClosureStep('confirm')}
                  >
                    Back
                  </button>
                </div>
              </div>
            )}
            
            {closureStep === 'processing' && (
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12">
                    <svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">Closing Your Account</h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Please wait while we process your request...
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 0, label: 'Account', icon: <UserIcon /> },
    { id: 1, label: 'Activity', icon: <ActivityIcon /> },
    { id: 2, label: 'Security', icon: <SecurityIcon /> },
    { id: 3, label: 'Billing', icon: <BillingIcon /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Account</h1>
          <p className="mt-2 text-gray-600">Manage your account settings and preferences</p>
        </div>
        
        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`
                    group relative min-w-0 flex-1 overflow-hidden py-4 px-4 text-sm font-medium text-center hover:bg-gray-50 focus:z-10 transition-all duration-200
                    ${selectedTab === tab.id
                      ? 'text-blue-600 bg-blue-50/50'
                      : 'text-gray-500 hover:text-gray-700'
                    }
                  `}
                  onClick={() => handleTabChange(tab.id)}
                >
                  <span className="flex items-center justify-center space-x-2">
                    <span className={selectedTab === tab.id ? 'text-blue-600' : 'text-gray-400'}>
                      {tab.icon}
                    </span>
                    <span>{tab.label}</span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`
                      absolute inset-x-0 bottom-0 h-0.5 transition-all duration-200
                      ${selectedTab === tab.id ? 'bg-blue-600' : 'bg-transparent'}
                    `}
                  />
                </button>
              ))}
            </nav>
          </div>
        </div>
        
        {/* Tab Content */}
        <div>
          {selectedTab === 0 && renderAccountInfo()}
          {selectedTab === 1 && renderActivityLog()}
          {selectedTab === 2 && renderSecuritySettings()}
          {selectedTab === 3 && renderBilling()}
        </div>
        
        <SubscriptionPopup 
          open={showSubscriptionPopup} 
          onClose={() => setShowSubscriptionPopup(false)} 
        />
        
        <AccountClosureModal />
      </div>
    </div>
  );
};

export default MyAccount;