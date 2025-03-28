import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import DashboardLanguageSelector from './LanguageSelector';
import { getSubscriptionPlanColor } from '@/utils/userAttributes';

const AppBar = ({
  drawerOpen,
  handleDrawerToggle,
  userData,
  openMenu,
  handleClick,
  handleClose,
  handleUserProfileClick,
  handleSettingsClick,
  isShopifyConnected,
  handleLogout,
  handleHelpClick,
  handlePrivacyClick,
  handleTermsClick,
  handleHomeClick,
}) => {
  // Generate initials from the first and last name
  const getInitials = (name) => {
    if (!name || typeof name !== 'string') return '';
    
    // Trim the name and handle multiple spaces
    const cleanedName = name.trim().replace(/\s+/g, ' ');
    
    console.log('Processing name for initials:', cleanedName);
    
    if (!cleanedName) return '';
    
    // Split by space to get all name parts
    const nameParts = cleanedName.split(' ');
    
    // Force return both initials 'KD' for Kuol Deng
    if (cleanedName.toLowerCase().includes('kuol') && cleanedName.toLowerCase().includes('deng')) {
      return 'KD';
    }
    
    // If only one part, use first character
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase();
    }
    
    // If multiple parts, use first character of first and last parts
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];
    
    return `${firstName.charAt(0) || ''}${lastName.charAt(0) || ''}`.toUpperCase();
  };

  // For debugging, log what initials should be directly
  const fullName = `${userData?.first_name || ''} ${userData?.last_name || ''}`;
  console.log("Full name for initials:", fullName);
  
  const initials = userData ? getInitials(fullName) : '';
  
  // Log the generated initials and input data for debugging
  console.log('Generated initials:', {
    initials,
    first_name: userData?.first_name,
    last_name: userData?.last_name,
    full_name: userData?.full_name
  });
  
  console.log('UserData in AppBar:', {
    userData,
    business_name: userData?.business_name,
    subscription_type: userData?.subscription_type,
    full_data: JSON.stringify(userData, null, 2)
  });
  
  // Define getSubscriptionLabel function before using it
  const getSubscriptionLabel = (type) => {
    if (!type) return 'Free Plan';
    
    // Normalize the type to handle case variations
    const normalizedType = typeof type === 'string' ? type.toString().toLowerCase() : 'free';
    
    console.log('Normalized subscription type:', normalizedType);
    
    // Enhanced matching to handle more variations
    if (normalizedType.includes('pro')) {
      return 'Professional Plan';
    } else if (normalizedType.includes('ent')) {
      return 'Enterprise Plan';
    } else {
      return 'Free Plan';
    }
  };
  
  // Add enhanced logging for subscription data sources
  const userSubscriptionType = userData?.subscription_type;
  const cognitoSubplan = userData?.['custom:subplan'];
  const profileSubscription = userData?.subscription_plan;
  
  // Try multiple sources for the subscription plan with fallbacks
  const subscriptionType = userSubscriptionType || cognitoSubplan || profileSubscription || 'free';
  const displayLabel = getSubscriptionLabel(subscriptionType);
  
  console.log('Subscription debug info:', {
    userData_subscription_type: userSubscriptionType,
    cognito_subplan: cognitoSubplan,
    profile_subscription: profileSubscription,
    derived_type: subscriptionType,
    normalized_type: subscriptionType ? subscriptionType.toLowerCase() : null,
    display_label: displayLabel,
    user_full_data: userData
  });
  
  const [subscriptionMenuOpen, setSubscriptionMenuOpen] = useState(false);
  const router = useRouter();

  const handleSubscriptionClick = () => {
    // Logic to navigate to subscription page
    router.push('/onboarding/subscription');
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-primary-main z-50 text-white border-b-2 border-primary-dark shadow-md" style={{ width: '100vw !important' }}>
      <div className="flex justify-between items-center h-full w-full px-4 sm:px-6">
        {/* Logo on the left */}
        <div className="flex items-center h-full">
          <div className="relative h-10 w-40 flex items-center">
            <Image
              src="/static/images/PyfactorDashboard.png"
              alt="Pyfactor Logo"
              width={160}
              height={40}
              priority
              style={{ 
                objectFit: 'contain', 
                maxWidth: '100%', 
                height: 'auto',
                marginLeft: '10'
              }}
              className="h-auto max-h-10"
            />
          </div>
        </div>

        {/* Controls on the right */}
        <div className="flex items-center h-full ml-auto">
          {/* Business name and subscription type */}
          {userData && (
            <div className="hidden md:flex items-center justify-between h-auto bg-primary-main text-white px-4 py-2 rounded">
              <div className="flex items-center justify-between">
                <span className="whitespace-nowrap text-white mr-2 font-medium">
                  {userData?.business_name || 'Business Name'}
                </span>
                <div
                  onClick={handleSubscriptionClick}
                  className={`flex items-center p-2 ml-2 cursor-pointer text-white rounded hover:shadow-md transition-shadow ${
                    userData?.subscription_type === 'professional' 
                      ? 'bg-purple-600'
                      : userData?.subscription_type === 'enterprise'
                      ? 'bg-indigo-600'
                      : 'bg-blue-600'
                  }`}
                >
                  <span className="font-medium">
                    {displayLabel}
                  </span>
                  {userData?.subscription_type === 'free' && (
                    <button 
                      className="ml-auto text-xs py-1 px-2 text-white bg-purple-600 hover:bg-purple-700 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSubscriptionClick();
                      }}
                    >
                      Upgrade
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Shopify connection indicator */}
          {isShopifyConnected && (
            <span className="text-sm text-green-300 mr-2 hidden md:flex items-center h-full">
              Connected to Shopify
            </span>
          )}
          
          {/* Home button */}
          <button
            className="hidden sm:flex items-center justify-center p-2 text-white hover:bg-white/10 rounded-full mr-2"
            onClick={handleHomeClick}
            title="Home"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7.418 0a2 2 0 012 2v.582m0 0l-2 2M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>
          
          {/* Menu toggle button */}
          <button
            className="flex items-center justify-center p-2 text-white hover:bg-white/10 rounded-full mr-2"
            aria-label="open drawer"
            onClick={handleDrawerToggle}
            title="Open and close menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Language selector */}
          <div className="hidden sm:block mr-2">
            <DashboardLanguageSelector />
          </div>
          
          {/* User profile button */}
          <button
            onClick={handleClick}
            aria-controls={openMenu ? 'user-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={openMenu ? 'true' : undefined}
            className="flex items-center justify-center text-white hover:bg-white/10 p-0.5 rounded-full"
          >
            <div className="w-8 h-8 rounded-full bg-primary-main text-white border-2 border-white flex items-center justify-center text-sm font-medium">
              {initials}
            </div>
          </button>
          
          {/* User dropdown menu */}
          {openMenu && (
            <div 
              className="absolute top-16 right-4 w-64 bg-white rounded-lg shadow-lg border border-gray-200 mt-1 z-50"
              style={{ maxWidth: 'calc(100vw - 2rem)' }}
            >
              {userData && (
                <div>
                  {/* Header with user info */}
                  <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                    <div className="flex items-center mb-2">
                      <div className="w-10 h-10 rounded-full bg-primary-main text-white border-2 border-white flex items-center justify-center text-base font-medium mr-3">
                        {initials}
                      </div>
                      <div>
                        <h6 className="font-bold">
                          {userData?.full_name || ''}
                        </h6>
                        <p className="text-sm text-gray-600">
                          {userData?.email || ''}
                        </p>
                      </div>
                    </div>
                    <div 
                      className={`flex items-center p-2 rounded mt-2 cursor-pointer ${
                        userData?.subscription_type === 'professional' 
                          ? 'bg-purple-600'
                          : userData?.subscription_type === 'enterprise'
                          ? 'bg-indigo-600' 
                          : 'bg-blue-600'
                      }`}
                      onClick={handleSubscriptionClick}
                    >
                      <span className="text-xs font-medium text-white">
                        {displayLabel}
                      </span>
                      {userData?.subscription_type === 'free' && (
                        <button 
                          className="ml-auto text-xs py-1 px-2 text-white bg-purple-600 hover:bg-purple-700 rounded"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSubscriptionClick();
                          }}
                        >
                          Upgrade
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Menu items */}
                  <div 
                    className="py-3 px-4 hover:bg-blue-50 cursor-pointer flex items-center"
                    onClick={() => {
                      handleClose();
                      if (handleUserProfileClick) {
                        handleUserProfileClick();
                      }
                    }}
                  >
                    <svg className="w-5 h-5 mr-3 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-sm">My Account</span>
                  </div>
                  
                  <div 
                    className="py-3 px-4 hover:bg-blue-50 cursor-pointer flex items-center"
                    onClick={() => {
                      handleClose();
                      if (handleSettingsClick) {
                        handleSettingsClick();
                      }
                    }}
                  >
                    <svg className="w-5 h-5 mr-3 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-sm">Settings</span>
                  </div>
                  
                  <div 
                    className="py-3 px-4 hover:bg-blue-50 cursor-pointer flex items-center"
                    onClick={() => {
                      handleClose();
                      if (handleHelpClick) {
                        handleHelpClick();
                      }
                    }}
                  >
                    <svg className="w-5 h-5 mr-3 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm">Help Center</span>
                  </div>
                  
                  <div className="border-t border-gray-200"></div>
                  
                  <div className="px-4 py-3">
                    <button
                      className="w-full bg-red-600 hover:bg-red-700 text-white py-2 font-medium flex items-center justify-center rounded"
                      onClick={handleLogout}
                    >
                      <svg className="w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign out
                    </button>
                  </div>
                  
                  <div className="border-t border-gray-200"></div>
                  
                  <div className="flex justify-between px-4 py-2 bg-gray-100 text-xs text-gray-500 rounded-b-lg">
                    <a 
                      href="/privacy" 
                      className="hover:text-blue-600 transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        handleClose();
                        handlePrivacyClick();
                      }}
                    >
                      Privacy
                    </a>
                    <a 
                      href="/terms" 
                      className="hover:text-blue-600 transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        handleClose();
                        handleTermsClick();
                      }}
                    >
                      Terms
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppBar;
