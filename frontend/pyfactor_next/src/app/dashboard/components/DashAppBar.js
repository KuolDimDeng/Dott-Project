'use client';








import { appCache } from '../../../utils/appCache';



/**
 * @component DashAppBar
 * @description 
 * IMPORTANT: THIS IS THE FINAL DESIGN AND LAYOUT FOR THE APP BAR.
 * DO NOT MAKE ANY CHANGES TO THIS COMPONENT WITHOUT EXPRESS PERMISSION FROM THE OWNER.
 * This design was finalized on 2025-04-06 with the following specifications:
 * - The Pyfactor Dashboard logo on the left side
 * - The business name and subscription plan together on the right side
 * - A full-width header that spans the entire screen
 * - Proper layout adjustments for both mobile and desktop views
 * 
 * Any changes require explicit approval from the project owner.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useReducer,
  memo
} from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import DashboardLanguageSelector from './LanguageSelector';
import { getSubscriptionPlanColor } from '@/utils/userAttributes';
import { useMemoryOptimizer } from '@/utils/memoryManager';
import { useNotification } from '@/context/NotificationContext';
import { logger } from '@/utils/logger';
import SubscriptionPopup from './SubscriptionPopup';
import clsx from 'clsx';
import { useToast } from '@/hooks/useToast';
import { useSession } from '@/hooks/useSession';
import { useProfile } from '@/hooks/useProfile';
import { useAuth0Data } from '@/hooks/useAuth0Data';
import { APP_NAME, CREATE_NEW_ITEM_OPTIONS } from '@/config/constants';
import { businessTypes, legalStructures } from '@/app/utils/businessData';

// Initialize global app cache if it doesn't exist
if (typeof window !== 'undefined' && !appCache.getAll()) {
  // Initialize app cache properly
if (!appCache.getAll() || Object.keys(appCache.getAll()).length === 0) {
  appCache.set('auth', {});
  appCache.set('user', {});
  appCache.set('tenant', {});
}
}

const DashAppBar = ({
  drawerOpen,
  handleDrawerToggle,
  userData: propUserData,
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
  tenantId,
  mainBackground,
  profileData: propProfileData,
  setShowMainDashboard,
  view,
  setView,
  setShowHelpCenter,
  setShowMyAccount,
  isAuthenticated,
  user,
  userAttributes,
  showCreateMenu,
  handleMenuItemClick,
  handleCloseCreateMenu,
  setUserData, // Add setUserData to the component props
}) => {
  // Reduced logging for production - only log once per mount
  const hasLoggedInit = useRef(false);
  if (!hasLoggedInit.current) {
    logger.debug('[DashAppBar] Component initialized - Using Auth0 session data for user info');
    hasLoggedInit.current = true;
  }
  
  // Use Auth0 data hook to get user information
  const { 
    user: auth0User, 
    isLoading: auth0Loading, 
    error: auth0Error,
    getFullName: getAuth0FullName,
    getBusinessName: getAuth0BusinessName
  } = useAuth0Data();
  
  const { notifySuccess, notifyError, notifyInfo, notifyWarning } =
    useNotification();
    
  // Get user profile data from context
  const { 
    profileData: cachedProfileData, 
    loading: profileLoading, 
    error: profileError,
    fetchProfile,
    isCacheValid
  } = useProfile();
  
  // Add refs to track state updates to avoid infinite loops
  const hasInitializedRef = useRef(false);
  const hasSetBusinessNameRef = useRef(false);
  const hasSetUserInitialsRef = useRef(false);
  
  // Track previous props to prevent unnecessary updates
  const prevPropsRef = useRef({
    userAttributes: null,
    userData: null,
    profileData: null
  });
  
  // Create refs for the dropdown menu and button
  const userMenuRef = useRef(null);
  const profileButtonRef = useRef(null);
  
  // Track mounted state to prevent state updates after unmount
  const isMounted = useRef(true);

  // Initialize profile data with prop if available or null
  const [profileData, setProfileData] = useState(propProfileData || null);
  // Create local userData state that's initialized with propUserData or an empty object to prevent null
  const [userData, setLocalUserData] = useState(propUserData || {});
  const [userInitials, setUserInitials] = useState(null);
  const [showSubscriptionPopup, setShowSubscriptionPopup] = useState(false);
  const [businessName, setBusinessName] = useState(null);
  const [fetchedBusinessName, setFetchedBusinessName] = useState(null);
  const [isDesktop, setIsDesktop] = useState(true);
  
  // Add a flag to track if we've attempted to fetch profile data
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);

  // Create a wrapper for setUserData to update both the parent and local state
  // Using useCallback to avoid recreation on every render
  const updateUserData = useCallback((newData) => {
    // Skip updates during render
    if (React.renderPhaseUpdaterWarning) {
      console.warn('[DashAppBar] Attempted to update state during render');
      return;
    }
    
    // If it's a function, ensure we call it correctly
    if (typeof newData === 'function') {
      setLocalUserData((prevData) => {
        const updatedData = newData(prevData);
        
        // Store the updated data for useEffect to handle parent update
        if (typeof setUserData === 'function') {
          // Use a ref to store the data we want to pass to parent
          // This avoids the state update during render issue
          const dataForParent = updatedData;
          setTimeout(() => {
            if (isMounted.current) {
              setUserData(dataForParent);
            }
          }, 0);
        }
        
        return updatedData;
      });
    } else {
      // If it's an object, directly update local state
      setLocalUserData(newData);
      
      // Use setTimeout to defer parent state update until after render
      if (typeof setUserData === 'function') {
        setTimeout(() => {
          if (isMounted.current) {
            setUserData(newData);
          }
        }, 0);
      }
    }
  }, [setUserData]);
  
  // Initialize component once on mount
  useEffect(() => {
    // Only run initialization once
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    
    // Set mounted flag
    isMounted.current = true;
    
    // Store initial prop values for comparison
    prevPropsRef.current = {
      userAttributes: userAttributes || null,
      userData: propUserData || null,
      profileData: propProfileData || null
    };
    
    logger.info('[DashAppBar] Component initialized with props', {
      hasUserAttrs: !!userAttributes,
      hasUserData: !!propUserData,
      hasProfileData: !!propProfileData,
    });
    
    // Cleanup function to prevent updates after unmount
    return () => {
      isMounted.current = false;
    };
  }, [userAttributes, propUserData, propProfileData]);

  // Simple utility function to generate user initials (replaces CognitoAttributes.getUserInitials)
  const generateInitialsFromNames = (firstName, lastName, email) => {
    if (firstName && lastName) {
      return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
    }
    if (firstName) {
      return firstName.charAt(0).toUpperCase();
    }
    if (lastName) {
      return lastName.charAt(0).toUpperCase();
    }
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    return 'U'; // Default fallback
  };

  // Use the cached profile data if available - only on mount
  useEffect(() => {
    if (cachedProfileData && !profileData && !hasInitializedRef.current) {
      logger.debug('[DashAppBar] Using cached profile data');
      setProfileData(cachedProfileData);
    }
  }, [cachedProfileData, profileData]);

  // Process business name updates - use refs to track state and avoid loops
  useEffect(() => {
    // Skip if we've already set it and there's no change in dependencies
    if (hasSetBusinessNameRef.current && 
        userAttributes === prevPropsRef.current.userAttributes &&
        userData === prevPropsRef.current.userData &&
        profileData === prevPropsRef.current.profileData) {
      return;
    }
    
    // Update tracking refs
    prevPropsRef.current = {
      userAttributes: userAttributes || null,
      userData: userData || null,
      profileData: profileData || null
    };
    
    // Set our tracking flag
    hasSetBusinessNameRef.current = true;
    
    // Update business name from all potential sources
    const cognitoName = userAttributes?.['custom:businessname'] || user?.['custom:businessname'];
    const userDataName = userData?.businessName || userData?.['custom:businessname'];
    const profileDataName = profileData?.businessName;
    const cachedName = cachedProfileData?.businessName;
    
    // Check if we have a valid business name from any source
    const newBusinessName = cognitoName || userDataName || profileDataName || cachedName || '';
    
    // Reduced logging for production
    if (process.env.NODE_ENV !== 'production') {
      logger.debug('[DashAppBar] Business name sources:', {
        cognitoName,
        userDataName,
        profileDataName,
        cachedName,
        current: businessName
      });
    }
    
    if (newBusinessName && newBusinessName !== '') {
      if (process.env.NODE_ENV !== 'production') {
        logger.debug('[DashAppBar] Setting business name from data source:', {
          name: newBusinessName,
          source: cognitoName ? 'cognito' : 
                  userDataName ? 'userData' : 
                  profileDataName ? 'profileData' : 
                  'cachedData'
        });
      }
      
      setBusinessName(newBusinessName);
      
      // Store in app cache for persistence
      if (typeof window !== 'undefined') {
        if (!appCache.getAll()) { appCache.set('tenant', {}); appCache.set('user', {}); }
        if (!appCache.get('tenant')) { appCache.set('tenant', {}); }
        appCache.set('tenant.businessName', newBusinessName);
      }
    }
  }, [userAttributes, userData, profileData, cachedProfileData, user, businessName]);
  
  // Separate effect for updating parent userData - runs only when needed to avoid loops
  useEffect(() => {
    // Skip if we don't have a business name or setUserData function
    if (!businessName || typeof setUserData !== 'function') return;
    
    // Skip if the parent data is already set with this business name
    if (propUserData && propUserData.businessName === businessName) return;
    
    // We need to use setTimeout to break the update cycle
    const timerId = setTimeout(() => {
      updateUserData(prevData => {
        // Only update if value is different to prevent loops
        if (prevData.businessName !== businessName) {
          return {
            ...prevData,
            businessName: businessName
          };
        }
        return prevData;
      });
    }, 0);
    
    return () => clearTimeout(timerId);
  }, [businessName, setUserData, updateUserData, propUserData]);

  // Replace the existing fetchUserProfile function with this simplified version
  const fetchUserProfile = useCallback(async () => {
    // Skip if we already have profile data or have already attempted to fetch
    if (profileData || hasAttemptedFetch) {
      return;
    }
    
    setHasAttemptedFetch(true);
    
    logger.debug('[DashAppBar] Fetching user profile using Cognito & AppCache only');
    // Check if we have a valid cached profile first
    if (isCacheValid(tenantId)) {
      logger.debug('[DashAppBar] Using valid cached profile data');
      return;
    }
    
    // Fetch the profile data using our context
    logger.debug('[DashAppBar] Fetching user profile data for tenant:', tenantId);
    const result = await fetchProfile(tenantId);
    
          // Reduced logging for production
      if (result && process.env.NODE_ENV !== 'production') {
        logger.debug('[DashAppBar] Received profile data with attributes:', {
          firstName: result?.profile?.firstName,
          lastName: result?.profile?.lastName,
          email: result?.profile?.email,
          businessName: result?.profile?.businessName,
          tenantId: result?.profile?.tenantId
        });
      }
      
      // Set business name from profile data if available
      if (result?.profile?.businessName) {
        setBusinessName(result.profile.businessName);
      }
    
  }, [profileData, hasAttemptedFetch, isCacheValid, tenantId, fetchProfile]);

  // Function to get tenant-specific cache key
  const getTenantCacheKey = useCallback((baseKey) => {
    if (!tenantId) return baseKey;
    return `${tenantId}_${baseKey}`;
  }, [tenantId]);

  // Function to safely get tenant-specific data from app cache
  const getTenantCacheData = useCallback((category, key) => {
    if (typeof window === 'undefined' || !appCache.getAll()) return null;
    if (!tenantId) return null;
    
    // Ensure we only access data for the current tenant
    const tenantSpecificKey = `${tenantId}_${key}`;
    
    // First check for tenant-specific data
    if (appCache.getAll()[category] && appCache.getAll()[category][tenantSpecificKey]) {
      return appCache.getAll()[category][tenantSpecificKey];
    }
    
    // Fallback: check if there's generic data for this tenant
    if (category === 'tenant' && appCache.getAll().tenant[tenantId]) {
      return appCache.getAll().tenant[tenantId][key];
    }
    
    return null;
  }, [tenantId]);

  // Function to safely store tenant-specific data in app cache
  const setTenantCacheData = useCallback((category, key, value) => {
    if (typeof window === 'undefined' || !appCache.getAll()) return;
    if (!tenantId) return;
    
    // Create category if it doesn't exist
    if (!appCache.getAll()[category]) {
      appCache.getAll()[category] = {};
    }
    
    // Store with tenant-specific key
    const tenantSpecificKey = `${tenantId}_${key}`;
    appCache.getAll()[category][tenantSpecificKey] = value;
    
    // Also store in tenant-specific structure
    if (category === 'tenant') {
      if (!appCache.getAll().tenant[tenantId]) {
        appCache.getAll().tenant[tenantId] = {};
      }
      appCache.getAll().tenant[tenantId][key] = value;
    }
  }, [tenantId]);

  // Function to clear cached data for a specific tenant
  const clearTenantCache = useCallback(() => {
    if (typeof window === 'undefined' || !appCache.getAll() || !tenantId) return;
    
    // Remove all tenant-specific keys from each category
    Object.keys(appCache.getAll()).forEach(category => {
      if (typeof appCache.getAll()[category] === 'object') {
        Object.keys(appCache.getAll()[category]).forEach(key => {
          if (key.startsWith(`${tenantId}_`)) {
            delete appCache.getAll()[category][key];
          }
        });
      }
    });
    
    // Clear tenant-specific object
    if (appCache.getAll().tenant && appCache.getAll().tenant[tenantId]) {
      delete appCache.getAll().tenant[tenantId];
    }
  }, [tenantId]);

  // Modify the fetchCorrectUserDetails function to use tenant-specific caching
  const fetchCorrectUserDetails = useCallback(async () => {
    try {
      if (!tenantId) {
        logger.error('[AppBar] Cannot fetch tenant details without tenant ID');
        return;
      }

      // Skip Cognito validation entirely - Auth0 handles authentication
      logger.debug('[AppBar] Using Auth0 for user authentication and data');
      
      // Get business name from Auth0 cache
      let businessName = await getAuth0BusinessName() || '';
      
      // Get subscription type - default to free for Auth0 users
      const subscriptionType = 'free';
      
      // Initialize initials variable outside the if block
      let initials = 'U'; // Default fallback
      
      // Set business name if available
      if (businessName) {
        setBusinessName(businessName);
      }
      
      // Generate and set user initials from Auth0 user data
      if (auth0User) {
        initials = generateInitialsFromNames(
          auth0User.given_name, 
          auth0User.family_name, 
          auth0User.email
        );
        if (initials) {
          setUserInitials(initials);
        }
      }
      
      // Update cache with tenant-specific keys
      if (typeof window !== 'undefined') {
        setTenantCacheData('tenant', 'businessName', businessName);
        setTenantCacheData('user', 'initials', initials);
        setTenantCacheData('user', 'subscriptionType', subscriptionType);
      }
      
    } catch (error) {
      logger.error('[AppBar] Error fetching tenant-specific details:', error);
      
      // Try fallback to cached profile data for THIS tenant only
      if (isCacheValid && cachedProfileData?.businessName) {
        setBusinessName(cachedProfileData.businessName);
      }
    }
  }, [tenantId, generateInitialsFromNames, isCacheValid, cachedProfileData, setTenantCacheData, getAuth0BusinessName, auth0User]);

  // Update the component initialization effect to ensure tenant isolation
  useEffect(() => {
    if (tenantId && !auth0Loading) {
      // Auth0 handles all authentication - no need for Cognito validation
      logger.debug('[AppBar] Initializing with Auth0 authentication for tenant:', tenantId);
      
      // Proceed with fetching Auth0-based user details
      fetchCorrectUserDetails();
    }
  }, [tenantId, auth0Loading, fetchCorrectUserDetails]);

  // Update generateBusinessName function to use tenant-specific cache
  const generateBusinessName = useCallback(() => {
    const findAttr = (obj, baseKey) => {
      if (!obj) return null;
      
      // Direct match
      if (obj[baseKey]) return obj[baseKey];
      
      // Case-insensitive match
      const lowerKey = baseKey.toLowerCase();
      const key = Object.keys(obj).find(k => k.toLowerCase() === lowerKey);
      return key ? obj[key] : null;
    };
    
    // Try to get from cognito attributes first
    if (userAttributes) {
      const cognitoName = findAttr(userAttributes, 'custom:businessname') || 
                         findAttr(userAttributes, 'custom:tenant_name');
      
      if (cognitoName) {
        logger.debug('[AppBar] Using business name from Cognito:', cognitoName);
        return cognitoName;
      }
    }
    
    // Try to get from userData
    if (userData) {
      const userDataName = findAttr(userData, 'businessName') || 
                          findAttr(userData, 'business_name') || 
                          findAttr(userData, 'tenant_name');
      
      if (userDataName) {
        logger.debug('[AppBar] Using business name from userData:', userDataName);
        return userDataName;
      }
    }
    
    // Try to get from profile data
    if (profileData) {
      const profileDataName = findAttr(profileData, 'businessName') || 
                             findAttr(profileData, 'business_name') || 
                             findAttr(profileData, 'tenant_name');
      
      if (profileDataName) {
        logger.debug('[AppBar] Using business name from profileData:', profileDataName);
        return profileDataName;
      }
    }
    
    // Try to get from app cache for this specific tenant
    if (typeof window !== 'undefined' && appCache.getAll()) {
      const cachedName = getTenantCacheData('tenant', 'businessName');
      
      if (cachedName) {
        logger.debug('[AppBar] Using business name from tenant-specific cache:', cachedName);
        return cachedName;
      }
    }
    
    return null;
  }, [userAttributes, userData, profileData, getTenantCacheData]);

  // Update subscription display logic to correctly use tenant-specific subscription data
  const getSubscriptionType = useCallback(() => {
    // First check Cognito attributes
    if (userAttributes && userAttributes['custom:subplan']) {
      return userAttributes['custom:subplan'];
    }
    
    // Then check user data
    if (userData && userData.subscription_type) {
      return userData.subscription_type;
    }
    
    // Check profile data
    if (profileData && profileData.subscriptionType) {
      return profileData.subscriptionType;
    }
    
    // Check tenant-specific cache
    const cachedType = getTenantCacheData('user', 'subscriptionType');
    if (cachedType) {
      return cachedType;
    }
    
    // Default to free
    return 'free';
  }, [userAttributes, userData, profileData, getTenantCacheData]);

  const getSubscriptionLabel = useCallback((type) => {
    switch (type?.toLowerCase()) {
      case 'professional':
        return 'Professional Plan';
      case 'enterprise':
        return 'Enterprise Plan';
      case 'premium':
        return 'Premium Plan';
      default:
        return 'Free Plan';
    }
  }, []);

  // Updated subscription display
  const effectiveSubscriptionType = getSubscriptionType();
  
  // Using the existing getSubscriptionLabel function declared earlier
  const displayLabel = getSubscriptionLabel(effectiveSubscriptionType || 'free');

  const router = useRouter();

  const handleSubscriptionClick = () => {
    // Open the subscription popup instead of navigating
    setShowSubscriptionPopup(true);
  };

  const handleShowNotification = (type) => {
    switch (type) {
      case 'success':
        notifySuccess('Operation completed successfully!');
        break;
      case 'error':
        notifyError('An error occurred. Please try again.');
        break;
      case 'warning':
        notifyWarning('Please be aware of this important information.');
        break;
      default:
        notifyInfo('This is an informational message.');
        break;
    }
  };

  // Add CSS keyframes for animations
  const animationStyles = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;

  // Get the effective business name from multiple sources
  const effectiveBusinessName = useMemo(() => {
    // ALWAYS use Cognito as the primary source of truth in dashboard
    if (userAttributes) {
      // Check for businessname in Cognito attributes
      if (userAttributes['custom:businessname'] && 
          userAttributes['custom:businessname'] !== 'undefined' && 
          userAttributes['custom:businessname'] !== 'null' &&
          userAttributes['custom:businessname'] !== '') {
        return userAttributes['custom:businessname'];
      }
      
      // Try alternate Cognito attribute names
      if (userAttributes['custom:tenant_name'] && 
          userAttributes['custom:tenant_name'] !== 'undefined' && 
          userAttributes['custom:tenant_name'] !== 'null') {
        return userAttributes['custom:tenant_name'];
      }
      
      // No longer generate business names with suffixes - only use actual Cognito data
    }
    
    // Check app cache
    if (typeof window !== 'undefined' && appCache.getAll()) {
      return appCache.get('tenant.businessName');
    }
    
    // Only use these fallbacks if Cognito data is unavailable
    if (userData) {
      if (userData.businessName && userData.businessName !== 'undefined') {
        return userData.businessName;
      }
      
      if (userData['custom:businessname'] && userData['custom:businessname'] !== 'undefined') {
        return userData['custom:businessname'];
      }
    }
    
    // Return strictly data from sources, not generated values
    return businessName || 
           (profileData?.business_name && profileData.business_name !== 'undefined' ? profileData.business_name : '') || 
           '';
  }, [userAttributes, userData, businessName, profileData]);

  // Function to get the user's email from Auth0 session and app cache
  const getUserEmail = () => {
    // First check userData from props
    if (userData && userData.email) {
      return userData.email;
    }
    
    // Check Auth0 user data
    if (auth0User && auth0User.email) {
      return auth0User.email;
    }
    
    if (typeof window !== 'undefined') {
      // Initialize app cache if needed
      if (!appCache.getAll()) { appCache.set('tenant', {}); appCache.set('user', {}); }
      if (!appCache.getAll().auth) appCache.set('auth', {});
      if (!appCache.getAll().user) appCache.set('user', {});
      
      // Check app cache for email (primary source)
      if (appCache.get('auth.email')) {
        return appCache.get('auth.email');
      }
      
      if (appCache.get('user.email')) {
        return appCache.get('user.email');
      }
      
      // Try to get from Auth0 session storage
      const sessionData = localStorage.getItem('auth0_session');
      if (sessionData) {
        try {
          const parsed = JSON.parse(sessionData);
          if (parsed.user && parsed.user.email) {
            // Store in app cache for future use
            appCache.set('auth.email', parsed.user.email);
            return parsed.user.email;
          }
        } catch (error) {
          logger.debug('[AppBar] Error parsing Auth0 session data:', error);
        }
      }
    }
    
    return null;
  };

  // Update email in userData when component mounts - refactored to prevent state updates during render
  useEffect(() => {
    if (!isMounted.current || hasEmailBeenProcessed.current) return;
    
    // Set our processing flag
    hasEmailBeenProcessed.current = true;
    
    // Check if we have an email
    const realEmail = getUserEmail();
    
    // Store it for later update
    if (realEmail) {
      logger.info('[AppBar] Found real email from auth sources:', realEmail);
      
      // Use setTimeout to break the update cycle and avoid React warnings
      const timerId = setTimeout(() => {
        if (isMounted.current && typeof updateUserData === 'function') {
          // Only update if email is different than current
          updateUserData(prevData => {
            if (prevData.email !== realEmail) {
              return {
                ...prevData,
                email: realEmail
              };
            }
            return prevData;
          });
        }
      }, 0);
      
      return () => clearTimeout(timerId);
    }
  }, [updateUserData]);
  
  // Flag to track email processing
  const hasEmailBeenProcessed = useRef(false);

  // Fetch user attributes for initials (REMOVE COGNITO - Auth0 handles this now)
  useEffect(() => {
    // Skip this entirely - Auth0 hook handles user initials
    if (auth0Loading) {
      return; // Wait for Auth0 data to load
    }
    
    // All user data now comes from Auth0 hook
    logger.debug('[DashAppBar] Skipping Cognito attribute fetch - using Auth0 data');
  }, [auth0Loading]);

  // Remove Cognito debugging - Enhanced debugging for user initials issue  
  useEffect(() => {
    if (!auth0Loading && auth0User) {
      logger.debug('[DashAppBar] Auth0 User Initials Debug:', {
        userInitials: userInitials,
        auth0User: !!auth0User,
        given_name: auth0User.given_name,
        family_name: auth0User.family_name,
        email: auth0User.email,
        initials: generateInitialsFromNames(auth0User.given_name, auth0User.family_name, auth0User.email)
      });
    }
  }, [userInitials, auth0User, auth0Loading, generateInitialsFromNames]);

  // Only use tenant-specific fetch when tenant ID changes
  useEffect(() => {
    if (tenantId && !auth0Loading) {
      // Fetch tenant-specific details when tenant ID is available
      fetchCorrectUserDetails();
    }
  }, [tenantId, auth0Loading, fetchCorrectUserDetails]);

  // Remove JWT token extraction - not needed with Auth0 hook
  // Function to get user initials from JWT token - REMOVED (Auth0 hook handles this)

  // Declare the subscription type for display purposes
  const subscriptionTypeForDisplay = effectiveSubscriptionType || 'free';

  // Update user initials when Auth0 user data is available
  useEffect(() => {
    if (auth0User && !auth0Loading) {
      const initials = generateInitialsFromNames(auth0User.given_name, auth0User.family_name, auth0User.email);
      logger.debug('[DashAppBar] Setting user initials from Auth0:', { 
        initials, 
        given_name: auth0User.given_name, 
        family_name: auth0User.family_name 
      });
      setUserInitials(initials);
    }
  }, [auth0User, auth0Loading, generateInitialsFromNames]);

  // Update business name from Auth0 business info cache
  useEffect(() => {
    if (!auth0Loading) {
      const fetchBusinessName = async () => {
        const auth0BusinessName = await getAuth0BusinessName();
        if (auth0BusinessName) {
          logger.debug('[DashAppBar] Setting business name from Auth0 cache:', auth0BusinessName);
          setFetchedBusinessName(auth0BusinessName);
          if (!businessName) {
            setBusinessName(auth0BusinessName);
          }
        }
      };
      fetchBusinessName();
    }
  }, [auth0Loading, getAuth0BusinessName]);

  return (
    <>
      <header 
        className="fixed top-0 left-0 right-0 w-full bg-primary-main text-white shadow-md z-20 transition-all duration-200 ease-in-out"
        style={mainBackground}
      >
        <div className="flex items-center justify-between px-4 h-16">
          {/* Logo on the left */}
          <div 
            className="cursor-pointer"
            onClick={handleDrawerToggle}
          >
            <Image 
              src="/static/images/PyfactorDashboard.png"
              alt="Pyfactor Dashboard Logo"
              width={90}
              height={80}
              className="object-contain"
              priority
            />
          </div>
          
          {/* Controls on the right */}
          <div className="flex items-center space-x-1 sm:space-x-3">
            {/* Existing controls */}
            <div className="flex items-center h-full ml-auto">
              {/* Business name and Subscription type display */}
              <div className="flex items-center">
                {/* Business name - make it visible on all screen sizes and add fallback display */}
                <div className="text-white flex items-center mr-3">
                  <span className="font-semibold">{businessName || fetchedBusinessName || ''}</span>
                  <span className="mx-2 h-4 w-px bg-white/30"></span>
                </div>
                
                <div
                  onClick={handleSubscriptionClick}
                  className={`flex items-center px-3 py-1.5 cursor-pointer text-white rounded hover:shadow-md transition-shadow ${
                    effectiveSubscriptionType === 'professional'
                      ? 'bg-purple-600'
                      : effectiveSubscriptionType === 'enterprise'
                        ? 'bg-indigo-600'
                        : 'bg-blue-600'
                  }`}
                >
                  {/* Display business name on mobile inside the subscription button */}
                  <span className="whitespace-nowrap text-xs md:hidden mr-1">
                    {(businessName || fetchedBusinessName) ? `${businessName || fetchedBusinessName}:` : ''}
                  </span>
                  <span className="whitespace-nowrap text-xs inline-block">
                    {displayLabel}
                  </span>
                  {(!effectiveSubscriptionType || effectiveSubscriptionType === 'free') && (
                    <button
                      className="ml-2 text-xs py-0.5 px-2 text-white bg-purple-600 hover:bg-purple-700 rounded"
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

              {/* Shopify connection indicator */}
              {isShopifyConnected && (
                <span className="text-sm text-green-300 mr-2 hidden md:flex items-center h-full">
                  Connected to Shopify
                </span>
              )}

              {/* Notification button */}
              <button
                className="hidden sm:flex items-center justify-center p-2 text-white hover:bg-white/10 rounded-full mr-2"
                onClick={() => handleShowNotification('info')}
                title="Show Notification"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </button>

              {/* Home button */}
              <button
                className="hidden sm:flex items-center justify-center p-2 text-white hover:bg-white/10 rounded-full mr-2"
                onClick={handleHomeClick}
                title="Home"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7.418 0a2 2 0 012 2v.582m0 0l-2 2M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </button>

              {/* Menu toggle button */}
              <button
                className="flex items-center justify-center p-2 text-white hover:bg-white/10 rounded-full mr-2"
                aria-label="open drawer"
                onClick={handleDrawerToggle}
                title="Open and close menu"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>

              {/* Language selector */}
              <div className="hidden sm:block mr-2">
                <DashboardLanguageSelector />
              </div>

              {/* User profile button */}
              <button
                ref={profileButtonRef}
                onClick={(e) => {
                  e.stopPropagation(); // Prevent event bubbling
                  console.log('User profile button clicked');
                  handleClick(e);
                }}
                aria-controls={openMenu ? 'user-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={openMenu ? 'true' : undefined}
                className="flex items-center justify-center text-white hover:bg-white/10 p-0.5 rounded-full"
              >
                <div className="w-8 h-8 rounded-full bg-primary-main text-white flex items-center justify-center text-sm font-medium border-2 border-white">
                  {userInitials || '?'}
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* User dropdown menu - POSITIONED OUTSIDE HEADER */}
      {openMenu && (
        <div
          ref={userMenuRef}
          className="fixed top-16 right-4 w-64 bg-white rounded-lg shadow-lg border border-gray-200 mt-1 z-50"
          style={{
            maxWidth: 'calc(100vw - 2rem)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
            zIndex: 10000000,
          }}
        >
          {userData && (
            <div>
              {/* Header with user info */}
              <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                <div className="flex items-center mb-2">
                  <div className="w-10 h-10 rounded-full bg-primary-main text-white border-2 border-white flex items-center justify-center text-base font-medium mr-3">
                    {userInitials || '?'}
                  </div>
                  <div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">
                        {auth0User ? getAuth0FullName(auth0User) : 'Guest'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {auth0User?.email || ''}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  <span className="font-semibold">Business: </span>
                  <span>{businessName || fetchedBusinessName || ''}</span>
                </div>
              </div>

              {/* Menu items */}
              <div
                className="py-3 px-4 hover:bg-blue-50 cursor-pointer flex items-center"
                onClick={handleUserProfileClick}
              >
                <svg className="w-5 h-5 mr-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
                <span>My Account</span>
              </div>
              <div
                className="py-3 px-4 hover:bg-blue-50 cursor-pointer flex items-center"
                onClick={(e) => {
                  console.log('[DashAppBar] Settings menu item clicked');
                  if (typeof handleSettingsClick === 'function') {
                    handleSettingsClick();
                  } else {
                    console.error('[DashAppBar] handleSettingsClick is not a function', handleSettingsClick);
                    handleClose(); // Fallback to just closing the menu if handleSettingsClick is not available
                  }
                }}
              >
                <svg className="w-5 h-5 mr-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                <span>Settings</span>
              </div>
              <div
                className="py-3 px-4 hover:bg-blue-50 cursor-pointer flex items-center"
                onClick={handleHelpClick}
              >
                <svg className="w-5 h-5 mr-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>Help Center</span>
              </div>
              <div
                className="py-3 px-4 hover:bg-blue-50 cursor-pointer flex items-center border-t"
                onClick={handleLogout}
              >
                <svg className="w-5 h-5 mr-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                </svg>
                <span>Sign Out</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add the subscription popup */}
      {showSubscriptionPopup && (
        <SubscriptionPopup
          open={showSubscriptionPopup}
          onClose={() => setShowSubscriptionPopup(false)}
          onSubscriptionClick={handleSubscriptionClick}
          onShowNotification={handleShowNotification}
        />
      )}

      {/* Render create menu popup when showCreateMenu is true */}
      {showCreateMenu && (
        <>
          {/* Overlay to catch clicks outside the menu */}
          <div 
            className="fixed inset-0 bg-black/20 z-50" 
            onClick={handleCloseCreateMenu}
          />
          
          {/* Menu positioned based on screen size and drawer state */}
          <div className={`fixed top-16 ${
            isDesktop 
              ? (drawerOpen ? "left-64" : "left-16") 
              : "left-1/2 -translate-x-1/2"
          } bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50 w-64`}>
            <div className="flex justify-between items-center mb-3 border-b pb-2">
              <h3 className="text-lg font-semibold">Create New</h3>
              <button 
                onClick={handleCloseCreateMenu}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <ul className="space-y-1">
              <li>
                <button 
                  className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 flex items-center"
                  onClick={() => handleMenuItemClick('Transaction')}
                >
                  <span className="mr-2 text-primary-main">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </span>
                  <span>Transaction</span>
                </button>
              </li>
              <li>
                <button 
                  className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 flex items-center"
                  onClick={() => handleMenuItemClick('Product')}
                >
                  <span className="mr-2 text-primary-main">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </span>
                  <span>Product</span>
                </button>
              </li>
              <li>
                <button 
                  className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 flex items-center"
                  onClick={() => handleMenuItemClick('Service')}
                >
                  <span className="mr-2 text-primary-main">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </span>
                  <span>Service</span>
                </button>
              </li>
              <li>
                <button 
                  className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 flex items-center"
                  onClick={() => handleMenuItemClick('Invoice')}
                >
                  <span className="mr-2 text-primary-main">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <span>Invoice</span>
                </button>
              </li>
              <li>
                <button 
                  className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 flex items-center"
                  onClick={() => handleMenuItemClick('Bill')}
                >
                  <span className="mr-2 text-primary-main">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </span>
                  <span>Bill</span>
                </button>
              </li>
              <li>
                <button 
                  className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 flex items-center"
                  onClick={() => handleMenuItemClick('Estimate')}
                >
                  <span className="mr-2 text-primary-main">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </span>
                  <span>Estimate</span>
                </button>
              </li>
              <li>
                <button 
                  className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 flex items-center"
                  onClick={() => handleMenuItemClick('Customer')}
                >
                  <span className="mr-2 text-primary-main">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </span>
                  <span>Customer</span>
                </button>
              </li>
              <li>
                <button 
                  className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 flex items-center"
                  onClick={() => handleMenuItemClick('Vendor')}
                >
                  <span className="mr-2 text-primary-main">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </span>
                  <span>Vendor</span>
                </button>
              </li>
            </ul>
          </div>
        </>
      )}
    </>
  )
}

export default DashAppBar;