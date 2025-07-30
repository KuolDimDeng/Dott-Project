'use client';








import { appCache } from '@/utils/appCache';



/**
 * @component DashAppBar
 * @description 
 * PERFORMANCE OPTIMIZED VERSION - 2025-06-11T23:18:40.753Z
 * 
 * Optimizations applied:
 * 1. Component wrapped with React.memo to prevent unnecessary re-renders
 * 2. Debug console.log statements removed
 * 3. Subscription type calculation memoized
 * 4. Business name dependencies optimized
 * 
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
import CurrencyIndicator from './CurrencyIndicator';
import { getSubscriptionPlanColor } from '@/utils/userAttributes';
import { useMemoryOptimizer } from '@/utils/memoryManager';
import { getCreateOptions } from './lists/listItems';
import { useNotification } from '@/context/NotificationContext';
import { logger } from '@/utils/logger';
import SubscriptionPopup from './SubscriptionPopup';
import clsx from 'clsx';
import { useToast } from '@/hooks/useToast';
import { useSession } from '@/hooks/useSession-v2';
import { useProfile } from '@/hooks/useProfile';
import { useAuth0Data } from '@/hooks/useAuth0Data';
import { usePermissions } from '@/hooks/usePermissions';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationDropdown from '@/components/NotificationDropdown';
import { APP_NAME, CREATE_NEW_ITEM_OPTIONS } from '@/config/constants';
import { businessTypes, legalStructures } from '@/app/utils/businessData';
import { useTranslation } from 'react-i18next';

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
  handleCookieClick,
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
  handleShowCreateOptions,
  setUserData, // Add setUserData to the component props
}) => {
  // Reduced logging for production - only log once per mount
  const hasLoggedInit = useRef(false);
  if (!hasLoggedInit.current) {
    if (process.env.NODE_ENV !== 'production') {
      logger.debug('[DashAppBar] Component initialized - Using Auth0 session data for user info');
    }
    hasLoggedInit.current = true;
  }
  
  // Use Auth0 data hook to get user information
  const { 
    user: auth0User, 
    isLoading: auth0Loading, 
    error: auth0Error,
    businessName: auth0BusinessName,
    getFullName: getAuth0FullName,
    getBusinessName: getAuth0BusinessName,
    getBusinessNameSync: getAuth0BusinessNameSync,
    getUserInitials: getAuth0UserInitials
  } = useAuth0Data();
  
  // Use session hook to get session data
  const { session, loading: sessionLoading, refreshSession } = useSession();
  
  // Log session data for debugging
  useEffect(() => {
    if (session && !sessionLoading) {
      console.log('🔍 [DashAppBar] Session data received:', {
        authenticated: session.authenticated,
        email: session.user?.email,
        subscription_plan: session?.subscription_plan || session?.tenant?.subscription_plan || session?.user?.subscription_plan,
        subscriptionPlan: session?.subscription_plan || session?.tenant?.subscription_plan || session?.user?.subscriptionPlan,
        given_name: session.user?.given_name,
        family_name: session.user?.family_name,
        first_name: session.user?.first_name,
        last_name: session.user?.last_name,
        name: session.user?.name,
        businessName: session.user?.businessName,
        business_name: session.user?.business_name,
        legal_structure: session.user?.legal_structure,
        legalStructure: session.user?.legalStructure,
        display_legal_structure: session.user?.display_legal_structure,
        displayLegalStructure: session.user?.displayLegalStructure,
        tenantId: session.user?.tenantId,
        allUserKeys: session.user ? Object.keys(session.user) : 'no user'
      });
      
      // Set legal structure and display preference from session
      if (session.user?.legal_structure) {
        setLegalStructure(session.user.legal_structure);
      }
      if (session.user?.legalStructure) {
        setLegalStructure(session.user.legalStructure);
      }
      if (session.user?.display_legal_structure !== undefined) {
        setDisplayLegalStructure(session.user.display_legal_structure);
      }
      if (session.user?.displayLegalStructure !== undefined) {
        setDisplayLegalStructure(session.user.displayLegalStructure);
      }
    }
  }, [session, sessionLoading]);
  
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

  // Load business logo
  useEffect(() => {
    const loadBusinessLogo = async () => {
      try {
        const response = await fetch('/api/business/logo');
        if (response.ok) {
          const data = await response.json();
          if (data.logo_url && isMounted.current) {
            // Convert backend URL to full URL if needed
            const fullUrl = data.logo_url.startsWith('http') 
              ? data.logo_url 
              : `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}${data.logo_url}`;
            setBusinessLogoUrl(fullUrl);
          }
        }
      } catch (error) {
        console.error('Error loading business logo:', error);
      }
    };

    if (session?.authenticated) {
      loadBusinessLogo();
    }
  }, [session?.authenticated]);
  
  // Create refs for the dropdown menu and button
  const userMenuRef = useRef(null);
  const profileButtonRef = useRef(null);
  
  // Track mounted state to prevent state updates after unmount
  const [businessLogoUrl, setBusinessLogoUrl] = useState(null);
  const isMounted = useRef(true);

  // Initialize profile data with prop if available or null
  const [profileData, setProfileData] = useState(propProfileData || null);
  // Create local userData state that's initialized with propUserData or an empty object to prevent null
  const [userData, setLocalUserData] = useState(propUserData || {});
  const [userInitials, setUserInitials] = useState(null);
  const [showSubscriptionPopup, setShowSubscriptionPopup] = useState(false);
  const [businessName, setBusinessName] = useState(null);
  const [fetchedBusinessName, setFetchedBusinessName] = useState(null);
  const [legalStructure, setLegalStructure] = useState(null);
  const [displayLegalStructure, setDisplayLegalStructure] = useState(true);
  const [isDesktop, setIsDesktop] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Get user permissions
  const { isOwner, isAdmin, isOwnerOrAdmin } = usePermissions();
  
  // Get translation functions - navigation for menu items, common for subscription labels
  const { t } = useTranslation('navigation');
  const { t: tCommon } = useTranslation('common');
  
  // Get notification data
  const { 
    notifications, 
    unreadCount, 
    loading: notificationsLoading, 
    markAsRead, 
    markAllAsRead 
  } = useNotifications();
  
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
    
    // Immediately try to fetch business name and user data on mount
    const fetchInitialBusinessName = async () => {
      try {
        const profileResponse = await fetch('/api/auth/profile');
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          if (isMounted.current) {
            // Set business name if available - check multiple possible fields
            const businessNameFromProfile = profileData?.businessName || 
                                          profileData?.business_name || 
                                          profileData?.tenantName ||
                                          profileData?.tenant_name;
            if (businessNameFromProfile) {
              logger.info('[DashAppBar] Initial business name from profile:', businessNameFromProfile);
              setBusinessName(businessNameFromProfile);
              setFetchedBusinessName(businessNameFromProfile);
            }
            
            // Generate and set user initials from profile data
            if (profileData?.name || profileData?.email) {
              const initials = generateInitialsFromNames(
                profileData.given_name || profileData.givenName,
                profileData.family_name || profileData.familyName,
                profileData.email,
                profileData.name
              );
              logger.info('[DashAppBar] Generated user initials from profile:', initials);
              setUserInitials(initials);
            }
          }
        }
      } catch (error) {
        logger.error('[DashAppBar] Error fetching initial business name:', error);
      }
    };
    
    fetchInitialBusinessName();
    
    // Cleanup function to prevent updates after unmount
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Simple utility function to generate user initials
  const generateInitialsFromNames = (firstName, lastName, email, fullName) => {
    // If we have explicit first and last names, use them
    if (firstName && lastName) {
      return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
    }
    
    // If we have a full name, split it and use first and last parts
    if (fullName) {
      const nameParts = fullName.trim().split(' ').filter(part => part.length > 0);
      if (nameParts.length >= 2) {
        return `${nameParts[0].charAt(0).toUpperCase()}${nameParts[nameParts.length - 1].charAt(0).toUpperCase()}`;
      } else if (nameParts.length === 1) {
        // Single name, use first two letters if available
        return nameParts[0].length >= 2 
          ? `${nameParts[0].charAt(0).toUpperCase()}${nameParts[0].charAt(1).toUpperCase()}`
          : nameParts[0].charAt(0).toUpperCase();
      }
    }
    
    // If we only have firstName, check if it's actually a full name
    if (firstName) {
      const firstNameParts = firstName.trim().split(' ');
      if (firstNameParts.length >= 2) {
        // firstName contains full name like "Kuol Deng"
        return `${firstNameParts[0].charAt(0).toUpperCase()}${firstNameParts[firstNameParts.length - 1].charAt(0).toUpperCase()}`;
      }
      return firstName.length >= 2 
        ? `${firstName.charAt(0).toUpperCase()}${firstName.charAt(1).toUpperCase()}`
        : firstName.charAt(0).toUpperCase();
    }
    
    // If we only have lastName, check if it's actually a full name
    if (lastName) {
      const lastNameParts = lastName.trim().split(' ');
      if (lastNameParts.length >= 2) {
        // lastName contains full name
        return `${lastNameParts[0].charAt(0).toUpperCase()}${lastNameParts[lastNameParts.length - 1].charAt(0).toUpperCase()}`;
      }
      return lastName.length >= 2 
        ? `${lastName.charAt(0).toUpperCase()}${lastName.charAt(1).toUpperCase()}`
        : lastName.charAt(0).toUpperCase();
    }
    
    // Last resort: use email
    if (email) {
      const emailName = email.split('@')[0];
      return emailName.length >= 2 
        ? `${emailName.charAt(0).toUpperCase()}${emailName.charAt(1).toUpperCase()}`
        : emailName.charAt(0).toUpperCase();
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

  // Process business name updates - prioritize session data, then Auth0 business name
  useEffect(() => {
    // First priority: session data
    if (session?.user?.businessName || session?.user?.business_name) {
      const sessionBusinessName = session.user.businessName || session.user.business_name;
      if (sessionBusinessName && sessionBusinessName !== businessName) {
        logger.debug('[DashAppBar] Setting business name from session:', sessionBusinessName);
        setBusinessName(sessionBusinessName);
        setFetchedBusinessName(sessionBusinessName);
        return;
      }
    }
    
    // Second priority: auth0BusinessName from the hook
    if (auth0BusinessName && auth0BusinessName !== businessName) {
      logger.debug('[DashAppBar] Setting business name from Auth0 hook:', auth0BusinessName);
      setBusinessName(auth0BusinessName);
      setFetchedBusinessName(auth0BusinessName);
      return;
    }
    
    // Skip if we've already set it and there's no change in dependencies
    if (hasSetBusinessNameRef.current && 
        userAttributes === prevPropsRef.current.userAttributes &&
        userData === prevPropsRef.current.userData &&
        profileData === prevPropsRef.current.profileData &&
        !auth0BusinessName) {
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
    const auth0AttributeName = userAttributes?.['custom:businessname'] || user?.['custom:businessname'];
    const userDataName = userData?.businessName || userData?.['custom:businessname'];
    const profileDataName = profileData?.businessName;
    const cachedName = cachedProfileData?.businessName;
    
    // Check if we have a valid business name from any source
    const newBusinessName = auth0BusinessName || auth0AttributeName || userDataName || profileDataName || cachedName || '';
    
    // Reduced logging for production
    if (process.env.NODE_ENV !== 'production') {
      logger.debug('[DashAppBar] Business name sources:', {
        auth0BusinessName,
        auth0AttributeName,
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
          source: auth0BusinessName ? 'auth0' :
                  auth0AttributeName ? 'auth0-attributes' : 
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
  }, [auth0BusinessName, userAttributes, userData, profileData, cachedProfileData, user, businessName]);
  
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
    
    logger.debug('[DashAppBar] Fetching user profile using Auth0 & AppCache only');
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

      // Skip custom attribute validation - Auth0 handles authentication
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
          auth0User.email,
          auth0User.name
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
      // Auth0 handles all authentication
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
    
    // Try to get from auth0 attributes first
    if (userAttributes) {
      const auth0AttributeName = findAttr(userAttributes, 'custom:businessname') || 
                         findAttr(userAttributes, 'custom:tenant_name');
      
      if (auth0AttributeName) {
        logger.debug('[AppBar] Using business name from Auth0 attributes:', auth0AttributeName);
        return auth0AttributeName;
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
    // First check session data (most reliable source)
    // CRITICAL FIX: Prioritize correct subscription plan sources
    // 1. session.subscription_plan (top-level session field)
    // 2. session.tenant.subscription_plan (tenant model field)  
    // 3. session.user.subscription_plan (user model field - fallback only)
    const sessionPlan = session?.subscription_plan || 
                       session?.tenant?.subscription_plan || 
                       session?.user?.subscriptionPlan || 
                       session?.user?.subscription_plan;
    
    if (sessionPlan) {
      return sessionPlan;
    }
    
    // Then check Auth0 attributes
    if (userAttributes && userAttributes['custom:subplan']) {
      return userAttributes['custom:subplan'];
    }
    
    // Then check user data
    if (userData) {
      const planFromUser = userData.selected_plan || 
                          userData.selectedPlan ||
                          userData.subscription_type ||
                          userData.subscriptionType;
      if (planFromUser) {
        return planFromUser;
      }
    }
    
    // Check profile data - multiple possible field names
    if (profileData) {
      const planFromProfile = profileData.selected_plan ||  // Check selected_plan first!
                             profileData.selectedPlan ||
                             profileData.subscriptionType || 
                             profileData.subscriptionPlan || 
                             profileData.subscription_plan ||
                             profileData.subscription_type;
      if (planFromProfile) {
        return planFromProfile;
      }
    }
    
    // Check tenant-specific cache
    const cachedType = getTenantCacheData('user', 'subscriptionType');
    if (cachedType) {
      return cachedType;
    }
    
    // Check cookies as fallback
    if (typeof document !== 'undefined') {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'subscriptionPlan' && value) {
          console.log('[DashAppBar] Found subscription in cookie:', value);
          return decodeURIComponent(value);
        }
      }
    }
    
    // Default to free
    return 'free';
  }, [session, userAttributes, userData, profileData, getTenantCacheData]);

  const getSubscriptionLabel = useCallback((type) => {
    switch (type?.toLowerCase()) {
      case 'professional':
        return tCommon('subscription.professionalPlan', 'Professional Plan');
      case 'enterprise':
        return tCommon('subscription.enterprisePlan', 'Enterprise Plan');
      default:
        return tCommon('subscription.freePlan', 'Free Plan');
    }
  }, [tCommon]);

  // Updated subscription display
  // Memoize subscription type to prevent recalculation on every render
  const effectiveSubscriptionType = useMemo(() => {
    const subscriptionType = getSubscriptionType();
    console.log('🔍 [DashAppBar] Calculating effectiveSubscriptionType:', {
      result: subscriptionType,
      sessionPlan: session?.subscription_plan || session?.tenant?.subscription_plan || session?.user?.subscriptionPlan || session?.user?.subscription_plan,
      auth0Attrs: userAttributes?.['custom:subplan'],
      userData: userData?.selected_plan || userData?.selectedPlan || userData?.subscription_type || userData?.subscriptionType,
      profileData: profileData?.selected_plan || profileData?.selectedPlan || profileData?.subscriptionType || profileData?.subscriptionPlan || profileData?.subscription_plan || profileData?.subscription_type,
      allProfileKeys: profileData ? Object.keys(profileData) : 'no profile data'
    });
    return subscriptionType;
  }, [getSubscriptionType, session, userAttributes, userData, profileData]);
  
  // Subscription debug removed for performance
  
  // Fetch business info if subscription is still showing as free
  useEffect(() => {
    const fetchBusinessInfoForSubscription = async () => {
      // Only fetch if we have a tenant ID and subscription is showing as free
      const currentTenantId = profileData?.tenantId || profileData?.tenant_id || userData?.tenantId || userData?.tenant_id;
      if (currentTenantId && effectiveSubscriptionType === 'free' && !hasAttemptedFetch) {
        try {
          console.log('[DashAppBar] Fetching business info to check subscription...');
          const response = await fetch(`/api/tenant/business-info?tenantId=${currentTenantId}`);
          if (response.ok) {
            const data = await response.json();
            console.log('[DashAppBar] Business info fetched:', {
              subscriptionPlan: data.subscriptionPlan,
              businessName: data.businessName
            });
            
            if (data.subscriptionPlan && data.subscriptionPlan !== 'free') {
              // Update profile data with the subscription plan
              setProfileData(prev => ({
                ...prev,
                subscriptionPlan: data.subscriptionPlan,
                subscriptionType: data.subscriptionPlan
              }));
            }
          }
        } catch (error) {
          console.error('[DashAppBar] Error fetching business info:', error);
        }
      }
    };
    
    fetchBusinessInfoForSubscription();
  }, [effectiveSubscriptionType, profileData?.tenantId, profileData?.tenant_id, userData?.tenantId, userData?.tenant_id, hasAttemptedFetch]);
  
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

  // Handle notification bell click
  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
  };

  // Handle closing notification dropdown
  const handleCloseNotifications = () => {
    setShowNotifications(false);
  };

  // Handle clicks outside of user menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside both the menu and the profile button
      if (
        openMenu &&
        userMenuRef.current &&
        profileButtonRef.current &&
        !userMenuRef.current.contains(event.target) &&
        !profileButtonRef.current.contains(event.target)
      ) {
        handleClose();
      }
    };

    // Add event listener when menu is open
    if (openMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [openMenu, handleClose]);

  // Add CSS keyframes for animations
  const animationStyles = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;

  // Get the effective business name from multiple sources
  const effectiveBusinessName = useMemo(() => {
    // For Auth0, prioritize backend/profile data over attributes
    
    // First priority: session data
    if (session?.user?.businessName && session.user.businessName !== 'undefined' && session.user.businessName !== 'null' && session.user.businessName !== '') {
      return session.user.businessName;
    }
    
    if (session?.user?.business_name && session.user.business_name !== 'undefined' && session.user.business_name !== 'null' && session.user.business_name !== '') {
      return session.user.business_name;
    }
    
    // Then check state variables that are actively updated
    if (businessName && businessName !== 'undefined' && businessName !== 'null' && businessName !== '') {
      return businessName;
    }
    
    if (fetchedBusinessName && fetchedBusinessName !== 'undefined' && fetchedBusinessName !== 'null' && fetchedBusinessName !== '') {
      return fetchedBusinessName;
    }
    
    if (auth0BusinessName && auth0BusinessName !== 'undefined' && auth0BusinessName !== 'null' && auth0BusinessName !== '') {
      return auth0BusinessName;
    }
    
    // Check profile data from backend
    if (profileData) {
      if (profileData.businessName && profileData.businessName !== 'undefined' && profileData.businessName !== 'null') {
        return profileData.businessName;
      }
      if (profileData.business_name && profileData.business_name !== 'undefined' && profileData.business_name !== 'null') {
        return profileData.business_name;
      }
      // Check if tenant info has the business name
      if (profileData.tenant && profileData.tenant.name) {
        return profileData.tenant.name;
      }
    }
    
    // Check user data
    if (userData) {
      if (userData.businessName && userData.businessName !== 'undefined' && userData.businessName !== 'null') {
        return userData.businessName;
      }
      // Check if tenant info has the business name
      if (userData.tenant && userData.tenant.name) {
        return userData.tenant.name;
      }
    }
    
    // Check app cache
    if (typeof window !== 'undefined' && appCache.getAll()) {
      const cachedName = appCache.get('tenant.businessName');
      if (cachedName && cachedName !== 'undefined' && cachedName !== 'null') {
        return cachedName;
      }
    }
    
    // Only check Auth0 attributes as a last resort
    if (userAttributes) {
      if (userAttributes['custom:businessname'] && 
          userAttributes['custom:businessname'] !== 'undefined' && 
          userAttributes['custom:businessname'] !== 'null' &&
          userAttributes['custom:businessname'] !== '') {
        return userAttributes['custom:businessname'];
      }
      
      if (userAttributes['custom:tenant_name'] && 
          userAttributes['custom:tenant_name'] !== 'undefined' && 
          userAttributes['custom:tenant_name'] !== 'null') {
        return userAttributes['custom:tenant_name'];
      }
    }
    
    // Return empty string if no business name found
    return '';
  }, [
    session?.user?.businessName,
    session?.user?.business_name,
    businessName, 
    fetchedBusinessName, 
    auth0BusinessName, 
    profileData?.businessName,
    profileData?.business_name,
    profileData?.tenant?.name,
    userData?.businessName,
    userData?.tenant?.name,
    userAttributes?.['custom:businessname'],
    userAttributes?.['custom:tenant_name']
  ]);

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

  // Fetch user attributes for initials (Auth0 handles this now)
  useEffect(() => {
    // Skip this entirely - Auth0 hook handles user initials
    if (auth0Loading) {
      return; // Wait for Auth0 data to load
    }
    
    // All user data now comes from Auth0 hook
    logger.debug('[DashAppBar] Using Auth0 data for user attributes');
  }, [auth0Loading]);

  // Enhanced debugging for user initials issue  
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

  // Update user data from session when available
  useEffect(() => {
    if (session && session.authenticated && session.user && !sessionLoading) {
      logger.info('[DashAppBar] Session data available:', {
        email: session.user.email,
        businessName: session.user.businessName || session.user.business_name,
        subscriptionPlan: session.subscription_plan || session.tenant?.subscription_plan || session.user.subscriptionPlan || session.user.subscription_plan,
        given_name: session.user.given_name,
        family_name: session.user.family_name,
        name: session.user.name
      });
      
      // Set business name from session
      const sessionBusinessName = session.user.businessName || session.user.business_name;
      if (sessionBusinessName && sessionBusinessName !== 'undefined' && sessionBusinessName !== 'null') {
        logger.info('[DashAppBar] Setting business name from session:', sessionBusinessName);
        setBusinessName(sessionBusinessName);
        setFetchedBusinessName(sessionBusinessName);
      }
      
      // Set user initials from session using the comprehensive function
      if (session.user.email) {
        // Use the existing generateInitialsFromNames function which handles all edge cases
        const initials = generateInitialsFromNames(
          session.user.given_name || session.user.first_name,
          session.user.family_name || session.user.last_name,
          session.user.email,
          session.user.name
        );
        
        if (initials && initials !== 'U') {
          logger.info('[DashAppBar] Setting user initials from session:', initials);
          setUserInitials(initials);
        }
      }
      
      // Update profile data with subscription info from session
      const plan = session.subscription_plan || session.tenant?.subscription_plan || session.user.subscriptionPlan || session.user.subscription_plan;
      if (plan) {
        logger.info('[DashAppBar] Setting subscription plan from session:', plan);
        setProfileData(prev => ({
          ...prev,
          subscriptionPlan: plan,
          subscriptionType: plan,
          selected_plan: plan
        }));
      }
    }
  }, [session, sessionLoading]);

  // Update user initials when Auth0 user data is available (as fallback)
  useEffect(() => {
    if (auth0User && !auth0Loading && getAuth0UserInitials && !userInitials) {
      const initials = getAuth0UserInitials(auth0User);
      logger.debug('[DashAppBar] Setting user initials from Auth0:', { 
        initials, 
        given_name: auth0User.given_name, 
        family_name: auth0User.family_name,
        name: auth0User.name,
        email: auth0User.email 
      });
      setUserInitials(initials);
    }
  }, [auth0User, auth0Loading, getAuth0UserInitials, userInitials]);

  // Fetch business name from session and profile
  useEffect(() => {
    const fetchBusinessNameData = async () => {
      try {
        // First try to get from session
        const sessionResponse = await fetch('/api/auth/session');
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          if (sessionData?.user?.businessName) {
            logger.debug('[DashAppBar] Found business name in session:', sessionData.user.businessName);
            setBusinessName(sessionData.user.businessName);
            setFetchedBusinessName(sessionData.user.businessName);
            return;
          }
        }
        
        // If not in session, try our new business info API
        if (tenantId) {
          const businessInfoResponse = await fetch(`/api/tenant/business-info?tenantId=${tenantId}`);
          if (businessInfoResponse.ok) {
            const businessInfo = await businessInfoResponse.json();
            if (businessInfo?.businessName) {
              logger.debug('[DashAppBar] Found business name from business info API:', businessInfo.businessName);
              setBusinessName(businessInfo.businessName);
              setFetchedBusinessName(businessInfo.businessName);
              
              // Also set legal structure from business info
              if (businessInfo.legalStructure) {
                setLegalStructure(businessInfo.legalStructure);
              }
              return;
            }
          }
        }
        
        // If not in business info API, try profile API
        const profileResponse = await fetch('/api/auth/profile');
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          if (profileData?.businessName) {
            logger.debug('[DashAppBar] Found business name in profile:', profileData.businessName);
            setBusinessName(profileData.businessName);
            setFetchedBusinessName(profileData.businessName);
            return;
          }
        }
        
        // Finally, try the async getBusinessName function
        if (!auth0Loading) {
          const auth0BusinessName = await getAuth0BusinessName();
          if (auth0BusinessName) {
            logger.debug('[DashAppBar] Found business name from Auth0 hook:', auth0BusinessName);
            setFetchedBusinessName(auth0BusinessName);
            if (!businessName) {
              setBusinessName(auth0BusinessName);
            }
          }
        }
      } catch (error) {
        logger.error('[DashAppBar] Error fetching business name:', error);
      }
    };
    
    // Only fetch if we don't already have a business name
    if (!businessName && !fetchedBusinessName) {
      fetchBusinessNameData();
    }
  }, [auth0Loading, getAuth0BusinessName, businessName, fetchedBusinessName, tenantId]);
  
  // Helper function to get legal structure suffix
  const getLegalStructureSuffix = () => {
    if (!displayLegalStructure || !legalStructure) return '';
    
    // Extract suffix from legal structure
    if (legalStructure.includes('LLC') || legalStructure.includes('Limited Liability Company')) {
      return ', LLC';
    } else if (legalStructure.includes('Inc.') || legalStructure.includes('Corp.') || legalStructure.includes('Corporation')) {
      return ', Corp';
    } else if (legalStructure.includes('Ltd.') || legalStructure.includes('Limited Company')) {
      return ', Ltd';
    }
    
    // Don't show suffix for Sole Proprietorship, Partnership, etc.
    return '';
  };
  
  // Get the display business name with optional legal structure
  const getDisplayBusinessName = () => {
    const baseName = businessName || fetchedBusinessName || auth0BusinessName || profileData?.businessName || profileData?.business_name || tCommon('common.loading', 'Loading...');
    return baseName + getLegalStructureSuffix();
  };

  return (
    <>
      <header 
        className="fixed top-0 left-0 right-0 w-full bg-primary-main text-white shadow-md z-20 transition-all duration-200 ease-in-out"
        style={mainBackground}
      >
        <div className="flex items-center justify-between px-4 h-16">
          {/* Hamburger menu and Logo on the left */}
          <div className="flex items-center">
            {/* Hamburger menu button */}
            <button
              className="p-2 text-white hover:bg-white/10 rounded-full mr-2"
              onClick={handleDrawerToggle}
              aria-label="Toggle navigation menu"
              title="Toggle navigation menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
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
            
            {/* Logo */}
            <div className="cursor-pointer flex items-center">
              <Image 
                src="/static/images/PyfactorDashboard.png"
                alt="Pyfactor Dashboard Logo"
                width={90}
                height={80}
                className="object-contain"
                priority
              />
            </div>
          </div>
          
          {/* Controls on the right */}
          <div className="flex items-center space-x-1 sm:space-x-3">
            {/* Existing controls */}
            <div className="flex items-center h-full ml-auto">
              {/* Business name and Subscription type display */}
              <div className="flex items-center">
                {/* Business name - make it visible on all screen sizes and add fallback display */}
                <div className="text-white flex items-center mr-3">
                  {businessLogoUrl && (
                    <div className="h-6 w-6 mr-2 bg-white rounded flex items-center justify-center flex-shrink-0">
                      <img 
                        src={businessLogoUrl} 
                        alt="Business logo" 
                        className="h-5 w-5 object-contain"
                      />
                    </div>
                  )}
                  <span className="font-semibold">{getDisplayBusinessName()}</span>
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
                  <span className="whitespace-nowrap text-xs md:hidden mr-1 flex items-center">
                    {(businessName || fetchedBusinessName || auth0BusinessName) ? (
                      <>
                        {businessLogoUrl && (
                          <div className="h-4 w-4 mr-1 bg-white rounded flex items-center justify-center flex-shrink-0">
                            <img 
                              src={businessLogoUrl} 
                              alt="Business logo" 
                              className="h-3 w-3 object-contain"
                            />
                          </div>
                        )}
                        {getDisplayBusinessName()}
                        :
                      </>
                    ) : ''}
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
                      {tCommon('subscription.upgrade', 'Upgrade')}
                    </button>
                  )}
                </div>
              </div>


              {/* Notification button */}
              <button
                className="hidden sm:flex items-center justify-center p-2 text-white hover:bg-white/10 rounded-full mr-2 relative"
                onClick={handleNotificationClick}
                title="Notifications"
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
                {/* Notification badge */}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full min-w-[1rem] h-4">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Home button */}
              <button
                className="hidden sm:flex items-center justify-center p-2 text-white hover:bg-white/10 rounded-full mr-2"
                onClick={handleHomeClick}
                title="Home"
              >
                <svg
                  className="w-5 h-5"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="m4 12 8-8 8 8M6 10.5V19a1 1 0 0 0 1 1h3v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3h3a1 1 0 0 0 1-1v-8.5"
                  />
                </svg>
              </button>


              {/* Currency indicator */}
              <div className="hidden sm:block mr-3">
                <CurrencyIndicator />
              </div>

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
          className="fixed top-16 right-4 w-80 bg-white rounded-lg shadow-lg border border-gray-200 mt-1 z-50"
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
                  <span>{effectiveBusinessName || 'Loading...'}</span>
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
                <span>Profile</span>
              </div>
              {/* Settings menu item - only show for OWNER and ADMIN */}
              {isOwnerOrAdmin() && (
                <div
                  className="py-3 px-4 hover:bg-blue-50 cursor-pointer flex items-center"
                  onClick={() => {
                    if (typeof handleSettingsClick === 'function') {
                      handleSettingsClick();
                    }
                    handleClose();
                  }}
                >
                  <svg className="w-5 h-5 mr-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  <span>Settings</span>
                </div>
              )}
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

      {/* Notification dropdown */}
      {showNotifications && (
        <NotificationDropdown
          notifications={notifications}
          unreadCount={unreadCount}
          onClose={handleCloseNotifications}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          loading={notificationsLoading}
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
              {(() => {
                try {
                  if (!t || typeof t !== 'function') {
                    console.error('[DashAppBar] Translation function t is not available');
                    return null;
                  }
                  const options = getCreateOptions(t);
                  if (!options || !Array.isArray(options)) {
                    console.error('[DashAppBar] getCreateOptions returned invalid value:', options);
                    return null;
                  }
                  return options.filter(option => option && option.label && option.label !== 'Create New').map((option, index) => {
                    if (!option) {
                      console.error('[DashAppBar] Invalid option in getCreateOptions:', option);
                      return null;
                    }
                
                return (
                  <li key={index}>
                    <button 
                      className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 flex items-center"
                      onClick={() => {
                        console.log('[DashAppBar] Create menu item clicked:', option.label);
                        // If the option has its own onClick handler, call it
                        if (typeof option.onClick === 'function') {
                          console.log('[DashAppBar] Calling option.onClick with params:', {
                            handleCloseCreateMenu: typeof handleCloseCreateMenu,
                            handleShowCreateOptions: typeof handleShowCreateOptions
                          });
                          // Pass the required parameters for Create New menu items
                          option.onClick(false, handleCloseCreateMenu, handleCloseCreateMenu, handleShowCreateOptions || handleMenuItemClick);
                        } else {
                          console.log('[DashAppBar] Using default handleMenuItemClick');
                          // Otherwise use the default handleMenuItemClick
                          handleMenuItemClick(option.value || option.label);
                        }
                      }}
                    >
                      <span className="mr-2 text-primary-main">
                        {option.icon && typeof option.icon === 'function' 
                          ? (() => {
                              try {
                                const IconComponent = option.icon({ className: "w-5 h-5" });
                                return IconComponent || null;
                              } catch (iconError) {
                                console.error('[DashAppBar] Error rendering icon for:', option.label, iconError);
                                return null;
                              }
                            })()
                          : null
                        }
                      </span>
                      <span>{option.label || ''}</span>
                    </button>
                  </li>
                  );
                  });
                } catch (error) {
                  console.error('[DashAppBar] Error rendering create options:', error);
                  return null;
                }
              })()}
            </ul>
          </div>
        </>
      )}
    </>
  )
}

// Memoize component to prevent unnecessary re-renders
const MemoizedDashAppBar = memo(DashAppBar, (prevProps, nextProps) => {
  // Custom comparison function - only re-render if these props change
  return (
    prevProps.drawerOpen === nextProps.drawerOpen &&
    prevProps.view === nextProps.view &&
    prevProps.tenantId === nextProps.tenantId &&
    prevProps.isAuthenticated === nextProps.isAuthenticated &&
    prevProps.showCreateMenu === nextProps.showCreateMenu &&
    prevProps.openMenu === nextProps.openMenu &&
    // Deep compare user data only if references change
    prevProps.userData === nextProps.userData &&
    prevProps.profileData === nextProps.profileData &&
    prevProps.userAttributes === nextProps.userAttributes &&
    prevProps.user === nextProps.user &&
    // IMPORTANT: Ensure handleDrawerToggle is compared
    prevProps.handleDrawerToggle === nextProps.handleDrawerToggle
  );
});

export default MemoizedDashAppBar;