import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSubscriptionPlanColor } from '@/utils/userAttributes';
import SubscriptionPopup from '../../dashboard/components/SubscriptionPopup';
import { useNotification } from '@/context/NotificationContext';

const MyAccount = ({ userData }) => {
  console.log('MyAccount component rendered with userData:', userData);
  
  const [selectedTab, setSelectedTab] = useState(0);
  const [showSubscriptionPopup, setShowSubscriptionPopup] = useState(false);
  const [showCloseAccountModal, setShowCloseAccountModal] = useState(false);
  const [closureStep, setClosureStep] = useState('confirm'); // 'confirm', 'feedback', 'processing'
  const [feedbackReason, setFeedbackReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [enhancedUserData, setEnhancedUserData] = useState(userData);
  const router = useRouter();
  const { notifySuccess, notifyError } = useNotification();
  
  // Fetch user data from Auth0 profile API when component mounts
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get user profile from Auth0 profile endpoint
        const response = await fetch('/api/auth/profile');
        
        if (response.ok) {
        const profileData = await response.json();
        console.log('[CLOSE_ACCOUNT_UI] API Response:', profileData);
          console.log('Successfully fetched Auth0 profile data:', profileData);
          
          // Debug subscription data
          console.log('[MyAccount] Profile subscription data:', {
            selected_plan: profileData.selected_plan,
            selectedPlan: profileData.selectedPlan,
            subscription_plan: profileData.subscription_plan,
            subscriptionPlan: profileData.subscriptionPlan,
            subscriptionType: profileData.subscriptionType,
            subscription_type: profileData.subscription_type
          });
          
          // Enhance the userData with the fetched profile data
          setEnhancedUserData({
            ...userData,
            ...profileData,
            firstName: profileData.given_name || profileData.firstName || userData?.firstName || '',
            lastName: profileData.family_name || profileData.lastName || userData?.lastName || '',
            first_name: profileData.given_name || profileData.first_name || userData?.first_name || '',
            last_name: profileData.family_name || profileData.last_name || userData?.last_name || '',
            email: profileData.email || userData?.email,
            name: profileData.name || userData?.name,
            tenantId: profileData.tenantId || profileData.tenant_id || userData?.tenantId,
            sub: profileData.sub || userData?.sub,
            id: profileData.id || profileData.sub || userData?.id || userData?.sub,
            // Include all possible subscription fields
            selected_plan: profileData.selected_plan,
            selectedPlan: profileData.selectedPlan,
            subscription_plan: profileData.subscription_plan,
            subscriptionPlan: profileData.subscriptionPlan,
            subscriptionType: profileData.subscriptionType,
            subscription_type: profileData.subscription_type
          });
        }
      } catch (error) {
        console.error('Error fetching Auth0 profile data:', error);
        // If fetch fails, at least use the userData prop
        setEnhancedUserData(userData || {});
      }
    };
    
    fetchUserData();
  }, [userData]);
  
  // Use enhancedUserData instead of userData throughout the component
  const userDisplayData = enhancedUserData || userData || {};
  
  const handleTabChange = (newValue) => {
    setSelectedTab(newValue);
  };
  
  const handleUpgradeClick = () => {
    setShowSubscriptionPopup(true);
  };

  const getPlanColor = (planId) => {
    return getSubscriptionPlanColor(planId);
  };

  // Helper function to get the effective subscription type from multiple possible fields
  const getEffectiveSubscriptionType = () => {
    // Debug log all subscription fields
    console.log('[MyAccount] Subscription field debug:', {
      selected_plan: userDisplayData?.selected_plan,
      selectedPlan: userDisplayData?.selectedPlan,
      subscription_plan: userDisplayData?.subscription_plan,
      subscriptionPlan: userDisplayData?.subscriptionPlan,
      subscriptionType: userDisplayData?.subscriptionType,
      subscription_type: userDisplayData?.subscription_type,
      userDisplayData_keys: Object.keys(userDisplayData || {})
    });
    
    // Check selected_plan first (this is what's set during onboarding)
    const plan = userDisplayData?.selected_plan || 
                 userDisplayData?.selectedPlan ||
                 userDisplayData?.subscription_plan ||
                 userDisplayData?.subscriptionPlan ||
                 userDisplayData?.subscriptionType || 
                 userDisplayData?.subscription_type ||
                 'free';
    
    console.log('[MyAccount] Effective subscription plan:', plan);
    
    // Normalize the plan name to lowercase for consistent comparison
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
      
      // Get tenant ID from user data first, then from multiple sources for reliability
      const tenantId = userDisplayData?.tenantId || 
                        localStorage.getItem('tenantId') || 
                        document.cookie.split('; ').find(row => row.startsWith('tenantId='))?.split('=')[1];
      
      const userId = userDisplayData?.id || userDisplayData?.sub;
      
      // Add logging to debug tenant ID and user ID issues
      console.log('Account closure - userDisplayData:', userDisplayData);
      console.log('Account closure - request parameters:', {
        userId: userId,
        fromUserData_id: userDisplayData?.id,
        fromUserData_sub: userDisplayData?.sub,
        tenantId: tenantId,
        feedbackReason: feedbackReason
      });
      
      if (!tenantId) {
        console.error('Account closure failed - Missing required tenant ID');
        notifyError('Unable to process your request. Missing tenant information. Please try logging out and back in, or contact support.');
        setIsProcessing(false);
        return;
      }
      
      if (!userId) {
        console.error('Account closure failed - Missing required user ID');
        notifyError('Unable to process your request. Missing user information. Please try logging out and back in, or contact support.');
        setIsProcessing(false);
        return;
      }
      
      // Add retry mechanism
      let retries = 0;
      const maxRetries = 3;
      let success = false;
      let lastError = null;
      
      while (retries < maxRetries && !success) {
        try {
          // Add delay between retries
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000 * retries));
          }
          
          console.log('[CLOSE_ACCOUNT_UI] Calling close-account-fixed API');
      const response = await fetch('/api/user/close-account-fixed', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              reason: feedbackReason,
              userId: userId,
              tenantId: tenantId,
              retry: retries, // Add retry count for logging
            }),
          });
          
          let data;
          // Handle empty responses safely
          const responseText = await response.text();
          try {
            data = responseText ? JSON.parse(responseText) : { success: true };
          } catch (parseError) {
            console.error('Error parsing JSON response:', parseError, 'Response was:', responseText);
            data = { success: true }; // Fallback to success if we can't parse the response
          }
          
          if (!response.ok) {
            // Database errors often include "pg_hba.conf" in the message
            if (responseText.includes('pg_hba.conf') || responseText.includes('database')) {
              // This is a database connection error, retry
              console.warn(`Database connection error on attempt ${retries + 1}:`, data?.message || data?.error);
              lastError = new Error(data?.message || data?.error || 'Database connection error');
              retries++;
              continue;
            }
            
            throw new Error(data?.message || data?.error || 'Failed to close account');
          }
          
          // If we got here, the request was successful
          success = true;
          console.log('Account closure response:', data);
          
          // Clear all local storage and cookies
          localStorage.clear();
          document.cookie.split(';').forEach(c => {
            document.cookie = c
              .replace(/^ +/, '')
              .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
          });
          
          // Show success message before redirecting
          notifySuccess('Account closure request submitted successfully');
          
          // Redirect to Auth0 logout to ensure complete logout
          setTimeout(() => {
            window.location.href = '/api/auth/logout?returnTo=' + encodeURIComponent('/account-closed');
          }, 1500);
          
        } catch (fetchError) {
          lastError = fetchError;
          retries++;
          console.warn(`Account closure attempt ${retries} failed:`, fetchError);
        }
      }
      
      // If all retries failed, throw the last error
      if (!success) {
        if (lastError.message.includes('pg_hba.conf')) {
          // For database errors, provide a more user-friendly message
          throw new Error('Unable to connect to the database. Our servers may be experiencing issues. Please try again later.');
        }
        throw lastError;
      }
      
    } catch (error) {
      console.error('Error closing account:', error);
      setIsProcessing(false);
      setClosureStep('feedback'); // Return to feedback stage
      
      // Show error notification with user-friendly message
      const errorMessage = error.message.includes('database') || error.message.includes('pg_hba.conf')
        ? 'Our system is currently experiencing database connection issues. Please try again later or contact support.'
        : (error.message || 'There was an error closing your account. Please try again or contact support.');
      
      notifyError(errorMessage);
    }
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

  // Account closure modal component
  const AccountClosureModal = () => {
    // Early return if modal is not shown
    if (!showCloseAccountModal) return null;
    
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 py-12">
          {/* Background overlay */}
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" aria-hidden="true"></div>
          
          {/* Modal panel - centered properly */}
          <div className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all max-w-lg w-full">
            {closureStep === 'confirm' && (
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
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
                        <label className="flex items-center space-x-3">
                          <input
                            type="radio"
                            className="form-radio h-4 w-4 text-blue-600"
                            checked={feedbackReason === 'app_functionality'}
                            onChange={() => setFeedbackReason('app_functionality')}
                          />
                          <span className="text-gray-700">The app doesn't meet my needs</span>
                        </label>
                        <label className="flex items-center space-x-3">
                          <input
                            type="radio"
                            className="form-radio h-4 w-4 text-blue-600"
                            checked={feedbackReason === 'usability_issues'}
                            onChange={() => setFeedbackReason('usability_issues')}
                          />
                          <span className="text-gray-700">App is difficult to use</span>
                        </label>
                        <label className="flex items-center space-x-3">
                          <input
                            type="radio"
                            className="form-radio h-4 w-4 text-blue-600"
                            checked={feedbackReason === 'found_alternative'}
                            onChange={() => setFeedbackReason('found_alternative')}
                          />
                          <span className="text-gray-700">I found a better alternative</span>
                        </label>
                        <label className="flex items-center space-x-3">
                          <input
                            type="radio"
                            className="form-radio h-4 w-4 text-blue-600"
                            checked={feedbackReason === 'other'}
                            onChange={() => setFeedbackReason('other')}
                          />
                          <span className="text-gray-700">Other reason</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
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
                    <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">Closing Your Account</h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Please wait while we process your request. This might take a moment...
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

  const renderAccountInfo = () => {
    return (
      <div>
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex items-center mb-4">
            <div className="w-16 h-16 rounded-full bg-blue-900 text-white flex items-center justify-center text-2xl mr-4">
              {userDisplayData?.firstName?.charAt(0) || ''}{userDisplayData?.lastName?.charAt(0) || ''}
            </div>
            <div>
              <h2 className="text-xl font-medium">
                {userDisplayData?.full_name || 
                 (userDisplayData?.firstName && userDisplayData?.lastName ? 
                  `${userDisplayData.firstName} ${userDisplayData.lastName}` : 
                  userDisplayData?.firstName || 
                  (userDisplayData?.email ? userDisplayData.email.split('@')[0] : 'Guest'))}
              </h2>
              <p className="text-gray-600 text-sm">
                {userDisplayData?.email || ''}
              </p>
            </div>
          </div>

          <hr className="my-4 border-gray-200" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <h2 className="font-medium mb-1">Business Name</h2>
              <p className="text-gray-800">{userDisplayData?.businessName || userDisplayData?.['custom:businessname'] || ''}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">
                Subscription Plan
              </p>
              <div className="flex items-center">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  getEffectiveSubscriptionType() === 'free'
                    ? 'bg-gray-100 text-gray-800' 
                    : 'bg-blue-100 text-blue-800'
                } mr-2`}>
                  {getEffectiveSubscriptionType() === 'enterprise'
                    ? 'Enterprise Plan' 
                    : getEffectiveSubscriptionType() === 'professional'
                      ? 'Professional Plan' 
                      : 'Free Plan'}
                </span>
                {getEffectiveSubscriptionType() === 'free' && (
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
              <p className="text-gray-800">{userDisplayData?.phone_number || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">
                Account Created
              </p>
              <p className="text-gray-800">
                {userDisplayData?.created_at 
                  ? new Date(userDisplayData.created_at).toLocaleDateString() 
                  : 'Not available'}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={() => router.push('/settings/profile')}
            >
              <PersonIcon />
              <span className="ml-2">Edit Profile</span>
            </button>
            
            <button 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              onClick={handleOpenCloseAccountModal}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="ml-2">Close Account</span>
            </button>
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-8">My Account</h1>
      
      <div className="mb-6 bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm ${
                selectedTab === 0
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => handleTabChange(0)}
            >
              Account Information
            </button>
          </nav>
        </div>
        
        <div className="p-6">
          {selectedTab === 0 && renderAccountInfo()}
        </div>
      </div>
      
      <SubscriptionPopup 
        open={showSubscriptionPopup} 
        onClose={() => setShowSubscriptionPopup(false)} 
      />
      
      <AccountClosureModal />
    </div>
  );
};

export default MyAccount;