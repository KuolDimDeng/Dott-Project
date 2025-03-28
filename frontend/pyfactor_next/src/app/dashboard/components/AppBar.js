import React, { useState } from 'react';
import {
  Avatar,
  Tooltip,
  Button,
  Typography,
  Link,
  IconButton,
  Icons
} from '@/components/ui/TailwindComponents';
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
    
    // If only one part, use first character
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase();
    }
    
    // If multiple parts, use first character of first and last parts
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];
    
    return `${firstName.charAt(0) || ''}${lastName.charAt(0) || ''}`.toUpperCase();
  };

  const initials = userData ? getInitials(`${userData?.first_name || ''} ${userData?.last_name || ''}`) : '';
  
  // Log the generated initials and input data for debugging
  console.log('Generated initials:', {
    initials,
    first_name: userData?.first_name,
    last_name: userData?.last_name,
    full_name: userData?.full_name
  });
  
  console.log('userData in AppBar:', {
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
          <div className="relative h-9 w-36">
            <Image
              src="/static/images/PyfactorDashboard.png"
              alt="Pyfactor Logo"
              width={140}
              height={40}
              priority
              style={{ objectFit: 'contain', width: '100%', height: 'auto' }}
              className="h-auto w-auto"
            />
          </div>
        </div>

        {/* Controls on the right */}
        <div className="flex items-center h-full ml-auto">
          {/* Business name and subscription type */}
          {userData && (
            <div className="flex items-center justify-between h-auto bg-primary-main text-white px-4 py-2 rounded">
              <div className="flex items-center justify-between">
                <Typography
                  variant="h6"
                  className="whitespace-nowrap text-white mr-2 font-medium"
                >
                  {userData?.business_name || 'Business Name'}
                </Typography>
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
                  <Typography variant="body2" className="font-medium">
                    {displayLabel}
                  </Typography>
                </div>
              </div>
            </div>
          )}
          
          {/* Shopify connection indicator */}
          {isShopifyConnected && (
            <Typography
              variant="body2"
              className="text-green-300 mr-2 flex items-center h-full"
            >
              Connected to Shopify
            </Typography>
          )}
          
          {/* Home button */}
          <Tooltip title="Home">
            <IconButton
              className="hidden sm:flex items-center text-white hover:bg-white/10 mr-2"
              onClick={handleHomeClick}
            >
              <Icons.Home className="h-5 w-5" />
            </IconButton>
          </Tooltip>
          
          {/* Menu toggle button */}
          <Tooltip title="Open and close menu">
            <IconButton
              className="flex items-center text-white hover:bg-white/10 mr-2"
              aria-label="open drawer"
              onClick={handleDrawerToggle}
            >
              <Icons.Menu className="h-5 w-5" />
            </IconButton>
          </Tooltip>

          {/* Language selector */}
          <div className="hidden sm:block mr-2">
            <DashboardLanguageSelector />
          </div>
          
          {/* User profile button */}
          <IconButton
            onClick={handleClick}
            aria-controls={openMenu ? 'user-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={openMenu ? 'true' : undefined}
            className="flex items-center text-white hover:bg-white/10 p-0.5"
          >
            <Avatar
              className="w-8 h-8 text-sm bg-primary-main text-white border-2 border-white"
            >
              {initials}
            </Avatar>
          </IconButton>
          
          {/* User dropdown menu */}
          {openMenu && (
            <div 
              className="absolute top-16 right-4 w-64 bg-gradient-to-b from-gray-50 to-white rounded-lg shadow-lg border border-gray-200 mt-1 z-50"
              style={{ maxWidth: 'calc(100vw - 2rem)' }}
            >
              {userData && (
                <div>
                  {/* Header with user info */}
                  <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                    <div className="flex items-center mb-2">
                      <Avatar
                        className="w-10 h-10 text-base bg-primary-main text-white border-2 border-white mr-3"
                      >
                        {initials}
                      </Avatar>
                      <div>
                        <Typography variant="subtitle1" className="font-bold">
                          {userData?.full_name || ''}
                        </Typography>
                        <Typography variant="body2" className="text-gray-600">
                          {userData?.email || ''}
                        </Typography>
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
                      <Typography variant="caption" className="font-medium text-white">
                        {displayLabel}
                      </Typography>
                      {userData?.subscription_type === 'free' && (
                        <Button 
                          size="small"
                          variant="contained"
                          className="ml-auto text-xs py-1 px-2 text-white bg-purple-600 hover:bg-purple-700 rounded"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSubscriptionClick();
                          }}
                        >
                          Upgrade
                        </Button>
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
                    <Typography variant="body2">My Account</Typography>
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
                    <Typography variant="body2">Settings</Typography>
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
                    <Typography variant="body2">Help Center</Typography>
                  </div>
                  
                  <div className="border-t border-gray-200"></div>
                  
                  <div className="px-4 py-3">
                    <Button
                      variant="contained"
                      color="error"
                      fullWidth
                      className="bg-red-600 hover:bg-red-700 text-white py-2 font-medium flex items-center justify-center"
                      onClick={handleLogout}
                    >
                      <svg className="w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign out
                    </Button>
                  </div>
                  
                  <div className="border-t border-gray-200"></div>
                  
                  <div className="flex justify-between px-4 py-2 bg-gray-100 text-xs text-gray-500 rounded-b-lg">
                    <Link 
                      href="/privacy" 
                      className="hover:text-blue-600 transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        handleClose();
                        handlePrivacyClick();
                      }}
                    >
                      Privacy
                    </Link>
                    <Link 
                      href="/terms" 
                      className="hover:text-blue-600 transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        handleClose();
                        handleTermsClick();
                      }}
                    >
                      Terms
                    </Link>
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
