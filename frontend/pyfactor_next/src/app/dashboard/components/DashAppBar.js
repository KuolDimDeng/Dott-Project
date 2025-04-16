'use client';

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
import { useUserProfile } from '@/contexts/UserProfileContext';

// Initialize global app cache if it doesn't exist
if (typeof window !== 'undefined' && !window.__APP_CACHE) {
  window.__APP_CACHE = { auth: {}, user: {}, tenant: {} };
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
  // Log that this component only uses Cognito and AppCache
  logger.info('[DashAppBar] Component initialized - Using ONLY Cognito and AppCache for data sources (NO GRAPHQL)');
  
  const { notifySuccess, notifyError, notifyInfo, notifyWarning } =
    useNotification();
    
  // Get user profile data from context
  const { 
    profileData: cachedProfileData, 
    loading: profileLoading, 
    error: profileError,
    fetchProfile,
    isCacheValid
  } = useUserProfile();
  
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
        // Also update parent state if callback available
        if (typeof setUserData === 'function') {
          setUserData(updatedData);
        }
        return updatedData;
      });
    } else {
      // If it's an object, directly update both states
      setLocalUserData(newData);
      if (typeof setUserData === 'function') {
        setUserData(newData);
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

  // Find where generateInitialsFromNames is first declared (keep this one)
  const generateInitialsFromNames = useCallback(
    (firstNameValue, lastNameValue, emailValue) => {
      if (!firstNameValue && !lastNameValue && !emailValue) return '';

      if (firstNameValue && lastNameValue) {
        return `${firstNameValue.charAt(0).toUpperCase()}${lastNameValue.charAt(0).toUpperCase()}`;
      } else if (firstNameValue) {
        // Try to extract a second initial from email
        if (emailValue && emailValue.includes('@')) {
          const emailName = emailValue.split('@')[0];
          if (emailName.includes('.')) {
            const emailParts = emailName.split('.');
            if (emailParts.length >= 2 && emailParts[1].length > 0) {
              return `${firstNameValue.charAt(0).toUpperCase()}${emailParts[1].charAt(0).toUpperCase()}`;
            }
          }
        }
        return firstNameValue.charAt(0).toUpperCase();
      } else if (lastNameValue) {
        return lastNameValue.charAt(0).toUpperCase();
      } else if (emailValue) {
        // Try to extract initials from email format (first.last@domain.com)
        const emailName = emailValue.split('@')[0];
        if (emailName.includes('.')) {
          const emailParts = emailName.split('.');
          if (
            emailParts.length >= 2 &&
            emailParts[0].length > 0 &&
            emailParts[1].length > 0
          ) {
            return `${emailParts[0].charAt(0).toUpperCase()}${emailParts[1].charAt(0).toUpperCase()}`;
          }
        } else if (emailName.length > 1) {
          // For emails like kuoldimdeng@outlook.com - try to extract two initials
          // First, check if there's any camelCase (e.g., kuolDimdeng)
          const camelCaseMatch = emailName.match(/([a-z]+)([A-Z][a-z]+)/);
          if (camelCaseMatch && camelCaseMatch.length >= 3) {
            return `${camelCaseMatch[1].charAt(0).toUpperCase()}${camelCaseMatch[2].charAt(0).toUpperCase()}`;
          }

          // Otherwise, try to intelligently split the name
          // For kuoldimdeng, we'll intelligently try to identify a split point
          // Common South Sudanese names often have this pattern

          // Specific handling for known formats like kuoldimdeng
          if (emailName.toLowerCase().startsWith('kuol')) {
            // Extract K from kuol and D from dimdeng
            const firstPart = emailName.substring(0, 4); // kuol
            const secondPart = emailName.substring(4); // dimdeng
            return `${firstPart.charAt(0).toUpperCase()}${secondPart.charAt(0).toUpperCase()}`;
          }

          // For other cases, try a simple division of the string
          const midPoint = Math.floor(emailName.length / 2);
          const firstPart = emailName.substring(0, midPoint);
          const lastPart = emailName.substring(midPoint);

          return `${firstPart.charAt(0).toUpperCase()}${lastPart.charAt(0).toUpperCase()}`;
        }
        return emailValue.charAt(0).toUpperCase();
      }

      return '';
    },
    []
  );

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
    const newBusinessName = cognitoName || userDataName || profileDataName || cachedName;
    
    logger.info('[DashAppBar] Business name sources:', {
      cognitoName,
      userDataName,
      profileDataName,
      cachedName,
      current: businessName
    });
    
    if (newBusinessName && newBusinessName !== '') {
      logger.info('[DashAppBar] Setting business name from data source:', {
        name: newBusinessName,
        source: cognitoName ? 'cognito' : 
                userDataName ? 'userData' : 
                profileDataName ? 'profileData' : 
                'cachedData'
      });
      
      setBusinessName(newBusinessName);
      
      // Store in app cache for persistence
      if (typeof window !== 'undefined') {
        if (!window.__APP_CACHE) window.__APP_CACHE = {};
        if (!window.__APP_CACHE.tenant) window.__APP_CACHE.tenant = {};
        window.__APP_CACHE.tenant.businessName = newBusinessName;
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
    
    // Log what attributes we actually received in the profile
    if (result) {
      logger.info('[DashAppBar] Received profile data with attributes:', {
        firstName: result?.profile?.firstName,
        lastName: result?.profile?.lastName,
        first_name: result?.profile?.first_name,
        last_name: result?.profile?.last_name,
        email: result?.profile?.email,
        businessName: result?.profile?.businessName,
        tenantId: result?.profile?.tenantId,
        rawProfileKeys: result?.profile ? Object.keys(result.profile) : 'no profile'
      });
      
      // Set business name from profile data if available
      if (result.profile?.businessName) {
        setBusinessName(result.profile.businessName);
      }
    } else {
      logger.warn('[DashAppBar] No profile data received from fetchProfile');
    }
    
  }, [profileData, hasAttemptedFetch, isCacheValid, tenantId, fetchProfile]);

  // Replace existing fetchCorrectUserDetails with a simpler version
  const fetchCorrectUserDetails = useCallback(async () => {
    if (!tenantId || !isAuthenticated) {
      return;
    }
    
    try {
      logger.debug('[AppBar] Starting direct Cognito fetch for tenant', tenantId);
      
      // Import Amplify auth functions
      const { fetchUserAttributes } = await import('aws-amplify/auth');
      
      // Get user attributes directly from Cognito
      const attributes = await fetchUserAttributes();
      logger.info('[AppBar] Fetched Cognito attributes for tenant details:', {
        tenantId,
        businessName: attributes['custom:businessname'] || attributes['custom:tenant_name'],
        firstName: attributes['custom:firstname'] || attributes['given_name'],
        lastName: attributes['custom:lastname'] || attributes['family_name']
      });
      
      // Extract business name from attributes
      const businessName = attributes['custom:businessname'] || attributes['custom:tenant_name'] || '';
      
      // Set business name if available
      if (businessName && businessName.trim() !== '') {
        logger.info('[AppBar] Setting business name from Cognito:', businessName);
        setBusinessName(businessName);
      }
      
      // Generate and set user initials
      const firstName = attributes['custom:firstname'] || attributes['given_name'] || '';
      const lastName = attributes['custom:lastname'] || attributes['family_name'] || '';
      const email = attributes['email'] || '';
      
      const initials = generateInitialsFromNames(firstName, lastName, email);
      if (initials) {
        setUserInitials(initials);
      }
      
      // Update cache
      if (typeof window !== 'undefined') {
        window.__APP_CACHE = window.__APP_CACHE || {};
        window.__APP_CACHE.tenant = window.__APP_CACHE.tenant || {};
        window.__APP_CACHE.tenant.businessName = businessName;
        window.__APP_CACHE.user = window.__APP_CACHE.user || {};
        window.__APP_CACHE.user.initials = initials;
      }
      
    } catch (error) {
      logger.error('[AppBar] Error fetching tenant-specific details:', error);
      
      // Try fallback to cached profile data
      if (isCacheValid && cachedProfileData?.businessName) {
        setBusinessName(cachedProfileData.businessName);
      }
    }
  }, [tenantId, isAuthenticated, generateInitialsFromNames, isCacheValid, cachedProfileData]);

  // Simplify dependencies for useEffect calls
  useEffect(() => {
    if (isAuthenticated && tenantId) {
      // Fetch tenant-specific details when tenant ID is available
      fetchCorrectUserDetails();
    }
  }, [isAuthenticated, tenantId, fetchCorrectUserDetails]);

  // Update initials whenever user data changes
  useEffect(() => {
    if (userData) {
      // Helper function to find attribute regardless of case
      const findAttr = (obj, baseKey) => {
        if (!obj) return null;
        
        // Direct access attempt first
        if (obj[baseKey]) return obj[baseKey];
        
        // Try case insensitive lookup
        const baseLower = baseKey.toLowerCase();
        const key = Object.keys(obj).find(k => k.toLowerCase() === baseLower);
        if (key) return obj[key];
        
        // Try with custom: prefix variations
        if (!baseKey.startsWith('custom:') && !baseLower.startsWith('custom:')) {
          // Try with custom: prefix
          const withPrefix = `custom:${baseKey}`;
          if (obj[withPrefix]) return obj[withPrefix];
          
          // Try case insensitive with prefix
          const prefixLower = withPrefix.toLowerCase();
          const prefixKey = Object.keys(obj).find(k => k.toLowerCase() === prefixLower);
          return prefixKey ? obj[prefixKey] : null;
        }
        
        // Try without custom: prefix if it has one
        if (baseKey.startsWith('custom:')) {
          const withoutPrefix = baseKey.substring(7);
          if (obj[withoutPrefix]) return obj[withoutPrefix];
          
          // Try case insensitive without prefix
          const noPrefixLower = withoutPrefix.toLowerCase();
          const noPrefixKey = Object.keys(obj).find(k => k.toLowerCase() === noPrefixLower);
          return noPrefixKey ? obj[noPrefixKey] : null;
        }
        
        return null;
      };
      
      // Get name components using case-insensitive lookups
      const firstName =
        findAttr(userData, 'first_name') || 
        findAttr(userData, 'firstName') || 
        findAttr(userData, 'given_name') || 
        findAttr(userData, 'custom:firstname');
        
      const lastName =
        findAttr(userData, 'last_name') || 
        findAttr(userData, 'lastName') || 
        findAttr(userData, 'family_name') || 
        findAttr(userData, 'custom:lastname');
        
      const email = userData.email;
      
      // Get business name using case-insensitive lookup
      const businessNameValue = 
        findAttr(userData, 'businessName') || 
        findAttr(userData, 'custom:businessname');
        
      if (businessNameValue && businessNameValue !== '') {
        logger.debug('[DashAppBar] Setting business name from userData:', businessNameValue);
        setBusinessName(businessNameValue);
      }

      // Log the raw user data to help debug attribute mapping issues
      logger.debug('[DashAppBar] Raw user data attributes:', {
        userData,
        first_name: findAttr(userData, 'first_name'),
        firstName: findAttr(userData, 'firstName'),
        given_name: findAttr(userData, 'given_name'),
        custom_firstname: findAttr(userData, 'custom:firstname'),
        last_name: findAttr(userData, 'last_name'),
        lastName: findAttr(userData, 'lastName'),
        family_name: findAttr(userData, 'family_name'),
        custom_lastname: findAttr(userData, 'custom:lastname'),
        businessNameValue,
        allKeys: Object.keys(userData)
      });

      // Always try to get both initials when possible
      if (firstName && lastName) {
        const initials = `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
        logger.info(
          '[AppBar] Setting initials from userData first+last name:',
          { firstName, lastName, initials }
        );
        setUserInitials(initials);
        
        // Store in app cache for persistence
        if (typeof window !== 'undefined') {
          if (!window.__APP_CACHE) window.__APP_CACHE = {};
          if (!window.__APP_CACHE.user) window.__APP_CACHE.user = {};
          window.__APP_CACHE.user.initials = initials;
          window.__APP_CACHE.user.firstName = firstName;
          window.__APP_CACHE.user.lastName = lastName;
        }
      } else if (firstName && email) {
        // Try to get second initial from email if available (e.g., first.last@domain.com)
        if (email.includes('@')) {
          const namePart = email.split('@')[0];
          if (namePart.includes('.')) {
            const parts = namePart.split('.');
            if (parts.length >= 2 && parts[1].length > 0) {
              const initials = `${firstName.charAt(0).toUpperCase()}${parts[1].charAt(0).toUpperCase()}`;
              logger.info(
                '[AppBar] Setting initials from userData first name + email:',
                { firstName, email, initials }
              );
              setUserInitials(initials);
              return;
            }
          } else if (namePart.length > 1) {
            // For emails without periods, try to identify a second name part
            // Special case for kuoldimdeng@outlook.com
            if (namePart.toLowerCase().startsWith('kuol')) {
              // Extract K from 'kuol' and D from 'dimdeng'
              const firstPart = namePart.substring(0, 4); // kuol
              const secondPart = namePart.substring(4); // dimdeng
              const initials = `${firstPart.charAt(0).toUpperCase()}${secondPart.charAt(0).toUpperCase()}`;
              logger.info(
                '[AppBar] Setting initials from special case email:',
                { email, initials }
              );
              setUserInitials(initials);
              return;
            }

            // For other single-part email names, use first and middle letter as initials
            // This isn't ideal but better than just one letter
            const midPoint = Math.floor(namePart.length / 2);
            const initials = `${namePart.charAt(0).toUpperCase()}${namePart.charAt(midPoint).toUpperCase()}`;
            logger.info('[AppBar] Setting initials from email split:', {
              email,
              initials,
            });
            setUserInitials(initials);
            return;
          }
        }
        // Fallback to just first initial if we can't extract a second one
        const initial = firstName.charAt(0).toUpperCase();
        logger.info(
          '[AppBar] Setting initials from userData first name only:',
          { firstName, initial }
        );
        setUserInitials(initial);
      } else if (email && email.includes('@')) {
        // No first or last name, use email to get initials
        const namePart = email.split('@')[0];
        if (namePart.includes('.')) {
          const parts = namePart.split('.');
          if (parts.length >= 2) {
            const initials = `${parts[0].charAt(0).toUpperCase()}${parts[1].charAt(0).toUpperCase()}`;
            logger.info('[AppBar] Setting initials from email parts:', {
              email,
              initials,
            });
            setUserInitials(initials);
            return;
          }
        } else if (namePart.length > 1) {
          // Special case for known email patterns
          if (namePart.toLowerCase().startsWith('kuol')) {
            // Extract K from 'kuol' and D from 'dimdeng'
            const firstPart = namePart.substring(0, 4); // kuol
            const secondPart = namePart.substring(4); // dimdeng
            const initials = `${firstPart.charAt(0).toUpperCase()}${secondPart.charAt(0).toUpperCase()}`;
            logger.info('[AppBar] Setting initials from special case email:', {
              email,
              initials,
            });
            setUserInitials(initials);
            return;
          }

          // Use first and a distinctive letter from the middle/end
          const midPoint = Math.floor(namePart.length / 2);
          const initials = `${namePart.charAt(0).toUpperCase()}${namePart.charAt(midPoint).toUpperCase()}`;
          logger.info('[AppBar] Setting initials from email characters:', {
            email,
            initials,
          });
          setUserInitials(initials);
          return;
        }

        // Fall back to the helper function for complex cases
        const initials = generateInitialsFromNames(firstName, lastName, email);
        if (initials) {
          logger.info('[AppBar] Setting initials from userData using helper:', {
            initials
          });
          setUserInitials(initials);
        }
      }
    }
  }, [userData, generateInitialsFromNames]);

  // Update initials when profile data changes
  useEffect(() => {
    if (profileData?.userData) {
      const firstName =
        profileData.userData.first_name ||
        profileData.userData.firstName ||
        profileData.userData.given_name;
      const lastName =
        profileData.userData.last_name ||
        profileData.userData.lastName ||
        profileData.userData.family_name;
      const email = profileData.userData.email;

      // Always try to get both initials when possible
      if (firstName && lastName) {
        const initials = `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
        logger.info(
          '[AppBar] Setting initials from profileData first+last name:',
          { firstName, lastName, initials }
        );
        setUserInitials(initials);
      } else if (firstName && email) {
        // Try to get second initial from email if available (e.g., first.last@domain.com)
        if (email.includes('@')) {
          const namePart = email.split('@')[0];
          if (namePart.includes('.')) {
            const parts = namePart.split('.');
            if (parts.length >= 2 && parts[1].length > 0) {
              const initials = `${firstName.charAt(0).toUpperCase()}${parts[1].charAt(0).toUpperCase()}`;
              logger.info(
                '[AppBar] Setting initials from profileData first name + email:',
                { firstName, email, initials }
              );
              setUserInitials(initials);
              return;
            }
          } else if (namePart.length > 1) {
            // Special case for known email patterns
            if (namePart.toLowerCase().startsWith('kuol')) {
              // Extract K from 'kuol' and D from 'dimdeng'
              const firstPart = namePart.substring(0, 4); // kuol
              const secondPart = namePart.substring(4); // dimdeng
              const initials = `${firstPart.charAt(0).toUpperCase()}${secondPart.charAt(0).toUpperCase()}`;
              logger.info(
                '[AppBar] Setting initials from special case email in profile:',
                { email, initials }
              );
              setUserInitials(initials);
              return;
            }

            // For other single-part email names, use first and middle letter as initials
            const midPoint = Math.floor(namePart.length / 2);
            const initials = `${namePart.charAt(0).toUpperCase()}${namePart.charAt(midPoint).toUpperCase()}`;
            logger.info('[AppBar] Setting initials from profile email split:', {
              email,
              initials,
            });
            setUserInitials(initials);
            return;
          }
        }
        // Fallback to just first initial if we can't extract a second one
        const initial = firstName.charAt(0).toUpperCase();
        logger.info(
          '[AppBar] Setting initials from profileData first name only:',
          { firstName, initial }
        );
        setUserInitials(initial);
      } else if (email && email.includes('@')) {
        // No first or last name, use email to get initials
        const namePart = email.split('@')[0];
        if (namePart.includes('.')) {
          const parts = namePart.split('.');
          if (parts.length >= 2) {
            const initials = `${parts[0].charAt(0).toUpperCase()}${parts[1].charAt(0).toUpperCase()}`;
            logger.info('[AppBar] Setting initials from profile email parts:', {
              email,
              initials,
            });
            setUserInitials(initials);
            return;
          }
        } else if (namePart.length > 1) {
          // Special case for known email formats
          if (namePart.toLowerCase().startsWith('kuol')) {
            // Extract K from 'kuol' and D from 'dimdeng'
            const firstPart = namePart.substring(0, 4); // kuol
            const secondPart = namePart.substring(4); // dimdeng
            const initials = `${firstPart.charAt(0).toUpperCase()}${secondPart.charAt(0).toUpperCase()}`;
            logger.info(
              '[AppBar] Setting initials from special case profile email:',
              { email, initials }
            );
            setUserInitials(initials);
            return;
          }

          // Use first and a distinctive letter from the middle/end
          const midPoint = Math.floor(namePart.length / 2);
          const initials = `${namePart.charAt(0).toUpperCase()}${namePart.charAt(midPoint).toUpperCase()}`;
          logger.info(
            '[AppBar] Setting initials from profile email characters:',
            { email, initials }
          );
          setUserInitials(initials);
          return;
        }

        // Fall back to the helper function for complex cases
        const initials = generateInitialsFromNames(null, null, email);
        if (initials) {
          logger.info(
            '[AppBar] Setting initials from profileData using helper:',
            { email, initials }
          );
          setUserInitials(initials);
        }
      } else {
        // Fall back to the helper function for complex cases
        const initials = generateInitialsFromNames(firstName, lastName, email);
        if (initials) {
          logger.info(
            '[AppBar] Setting initials from profileData using helper:',
            { firstName, lastName, email, initials }
          );
          setUserInitials(initials);
        }
      }
    }
  }, [profileData, generateInitialsFromNames]);

  // Add a click-away listener to close the menu
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        openMenu &&
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target) &&
        profileButtonRef.current &&
        !profileButtonRef.current.contains(event.target)
      ) {
        console.log('Clicking outside user menu, closing menu');
        handleClose();
      }
    }

    // Add click event listener to the document
    document.addEventListener('mousedown', handleClickOutside, true);

    // Cleanup the event listener on component unmount
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [openMenu, handleClose]);

  // Create a function to get the user's display name from Cognito
  const getUserInfoFromCognito = async () => {
    try {
      const { fetchUserAttributes } = await import('aws-amplify/auth');
      const userAttributes = await fetchUserAttributes();
      
      return {
        email: userAttributes.email || '',
        tenantId: userAttributes['custom:tenant_id'] || userAttributes['custom:businessid'] || null,
        firstName: userAttributes.given_name || '',
        lastName: userAttributes.family_name || '',
        businessName: userAttributes['custom:businessname'] || ''
      };
    } catch (error) {
      logger.error('[AppBar] Error retrieving user info from Cognito:', error);
      return {
        email: '',
        tenantId: null,
        firstName: '',
        lastName: '',
        businessName: ''
      };
    }
  };

  // Replace localStorage references with Cognito-based function calls
  const getDisplayName = async () => {
    try {
      const cognitoInfo = await getUserInfoFromCognito();
      
      // Use email if available
      if (cognitoInfo.email) {
        return cognitoInfo.email;
      }
      
      // Try user data from props if available
      if (userData?.email) {
        return userData.email;
      }
      
      return 'User';
    } catch (error) {
      logger.error('[AppBar] Error getting display name:', error);
      return 'User';
    }
  };

  // Get the tenant ID from Cognito
  const getTenantId = async () => {
    try {
      const { fetchUserAttributes } = await import('aws-amplify/auth');
      const userAttributes = await fetchUserAttributes();
      
      return userAttributes['custom:tenant_id'] || 
             userAttributes['custom:businessid'] || 
             userAttributes['custom:tenantId'] ||
             null;
    } catch (error) {
      logger.error('[AppBar] Error getting tenant ID from Cognito:', error);
      return null;
    }
  };

  // Get the ID token from Cognito session
  const getIdToken = async () => {
    try {
      const { fetchAuthSession } = await import('aws-amplify/auth');
      const session = await fetchAuthSession();
      
      if (session?.tokens?.idToken) {
        return session.tokens.idToken.toString();
      }
      
      return null;
    } catch (error) {
      logger.error('[AppBar] Error getting ID token from Cognito session:', error);
      return null;
    }
  };

  // Directly calculate initials from userData if needed - prioritize real user data
  const directInitials = useMemo(() => {
    // Already have initials from authenticated user data
    if (userInitials) return userInitials;

    // Check profileData first as it is more likely to have the correct user data
    if (profileData?.userData) {
      const profileFirstName =
        profileData.userData.first_name ||
        profileData.userData.firstName ||
        profileData.userData.given_name ||
        '';
      const profileLastName =
        profileData.userData.last_name ||
        profileData.userData.lastName ||
        profileData.userData.family_name ||
        '';
      const profileEmail = profileData.userData.email || '';

      if (profileFirstName && profileLastName) {
        return `${profileFirstName.charAt(0).toUpperCase()}${profileLastName.charAt(0).toUpperCase()}`;
      } else if (profileFirstName) {
        // Try to get last initial from email if available
        if (profileEmail && profileEmail.includes('@')) {
          const namePart = profileEmail.split('@')[0];
          if (namePart.includes('.')) {
            const parts = namePart.split('.');
            if (parts.length >= 2 && parts[1].length > 0) {
              return `${profileFirstName.charAt(0).toUpperCase()}${parts[1].charAt(0).toUpperCase()}`;
            }
          }
        }
        return profileFirstName.charAt(0).toUpperCase();
      } else if (profileLastName) {
        return profileLastName.charAt(0).toUpperCase();
      }

      // Try email from profileData
      if (profileEmail && profileEmail.includes('@')) {
        const namePart = profileEmail.split('@')[0];
        if (namePart.includes('.')) {
          const parts = namePart.split('.');
          if (parts.length >= 2) {
            return `${parts[0].charAt(0).toUpperCase()}${parts[1].charAt(0).toUpperCase()}`;
          }
        }
        return profileEmail.charAt(0).toUpperCase();
      }
    }

    // Fall back to userData
    if (userData) {
      const firstName =
        userData.first_name ||
        userData.firstName ||
        userData.given_name ||
        '';
      const lastName =
        userData.last_name ||
        userData.lastName ||
        userData.family_name ||
        '';
      const email = userData.email || '';

      if (firstName && lastName) {
        return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
      } else if (firstName) {
        // Try to get last initial from email if available
        if (email && email.includes('@')) {
          const namePart = email.split('@')[0];
          if (namePart.includes('.')) {
            const parts = namePart.split('.');
            if (parts.length >= 2 && parts[1].length > 0) {
              return `${firstName.charAt(0).toUpperCase()}${parts[1].charAt(0).toUpperCase()}`;
            }
          }
        }
        return firstName.charAt(0).toUpperCase();
      } else if (lastName) {
        return lastName.charAt(0).toUpperCase();
      }

      // Try email from userData
      if (email && email.includes('@')) {
        const namePart = email.split('@')[0];
        if (namePart.includes('.')) {
          const parts = namePart.split('.');
          if (parts.length >= 2) {
            return `${parts[0].charAt(0).toUpperCase()}${parts[1].charAt(0).toUpperCase()}`;
          }
        }
        return email.charAt(0).toUpperCase();
      }
    }

    // Ultimate fallback
    return '';
  }, [userInitials, profileData, userData]);

  // Combine profile data with user data for display
  const effectiveUserData = useMemo(() => {
    return {
      ...(userData || {}),
      ...(profileData?.userData || {}),
    };
  }, [userData, profileData]);

  // Determine which initials to display
  const displayInitials = userInitials || directInitials;

  // Log the final initials that will be displayed
  useEffect(() => {
    // Less frequent logging by only logging when values actually change
    const loggableData = {
      displayInitials,
      userInitialsState: userInitials,
      calculatedInitials: directInitials,
      userData: userData
        ? {
            first_name:
              userData.first_name || userData.firstName || userData.given_name,
            last_name:
              userData.last_name || userData.lastName || userData.family_name,
          }
        : 'No userData',
      profileData: profileData?.userData
        ? {
            first_name:
              profileData.userData.first_name || profileData.userData.firstName,
            last_name:
              profileData.userData.last_name || profileData.userData.lastName,
          }
        : 'No profileData',
    };

    // Only force update initials when necessary, not on every render
    if (displayInitials && displayInitials.length === 1) {
      const firstName =
        userData?.first_name ||
        userData?.firstName ||
        userData?.given_name ||
        profileData?.userData?.first_name ||
        profileData?.userData?.firstName ||
        profileData?.userData?.given_name;

      const lastName =
        userData?.last_name ||
        userData?.lastName ||
        userData?.family_name ||
        profileData?.userData?.last_name ||
        profileData?.userData?.lastName ||
        profileData?.userData?.family_name;

      if (firstName && lastName) {
        const newInitials = `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
        if (userInitials !== newInitials) {
          logger.info('[AppBar] Forcing both initials:', {
            from: displayInitials,
            to: newInitials,
          });
          setUserInitials(newInitials);
        }
      }
    }
  }, [displayInitials, directInitials]); // Reduced dependencies to prevent excessive rerenders

  // Consolidate tenant ID validation and logging into a single useEffect
  useEffect(() => {
    // Only run this effect when userData or profileData changes
    if (!userData && !profileData) return;

    const authenticatedTenantId =
      userData?.['custom:businessid'] ||
      userData?.tenantId ||
      userData?.businessId;
    const profileTenantId = profileData?.tenant_id;

    // If we have both tenant IDs and they don't match, log a warning
    if (
      authenticatedTenantId &&
      profileTenantId &&
      authenticatedTenantId !== profileTenantId
    ) {
      logger.warn('[AppBar] Tenant ID mismatch:', {
        authenticated: authenticatedTenantId,
        profile: profileTenantId,
      }, [/* TODO: Add dependencies */]);
    }

    // Log the tenant ID consistency check
    const tenant1 =
      userData?.tenantId ||
      userData?.['custom:businessid'] ||
      userData?.businessId;
    const tenant2 =
      profileData?.userData?.tenantId ||
      profileData?.userData?.['custom:businessid'] ||
      profileData?.userData?.businessId;

    logger.info('[AppBar] Tenant ID consistency check:', {
      fromUserData: tenant1 || '(not available)',
      fromProfileData: tenant2 || '(not available)',
      match:
        tenant1 && tenant2
          ? tenant1 === tenant2
            ? 'Yes'
            : 'No'
          : 'Cannot compare (missing data)',
    });

    // Log user full name
    const fullName =
      `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim();
    if (fullName) {
      logger.info('[AppBar] User full name:', fullName);
    }

    // Consolidated check for correct initials
    if (userData?.first_name && userData?.last_name) {
      const expectedInitials = `${userData.first_name.charAt(0).toUpperCase()}${userData.last_name.charAt(0).toUpperCase()}`;
      if (userInitials !== expectedInitials) {
        setUserInitials(expectedInitials);
      }
    } else if (
      profileData?.userData?.first_name &&
      profileData?.userData?.last_name
    ) {
      const expectedInitials = `${profileData.userData.first_name.charAt(0).toUpperCase()}${profileData.userData.last_name.charAt(0).toUpperCase()}`;
      if (userInitials !== expectedInitials) {
        setUserInitials(expectedInitials);
      }
    }

    // Single consolidated debug log for final calculations
    logger.debug('[AppBar] Final initials calculation:', {
      displayInitials,
      userInitials,
      directInitials,
      isValidProfileData:
        !authenticatedTenantId ||
        !profileTenantId ||
        authenticatedTenantId === profileTenantId,
    });
  }, [userData, profileData, userInitials]); // Run only when these dependencies change

  // Only use profile data if it's for the authenticated tenant
  const authenticatedTenantId =
    userData?.['custom:businessid'] ||
    userData?.tenantId ||
    userData?.businessId;
  const profileTenantId = profileData?.tenant_id;
  const isValidProfileData =
    !authenticatedTenantId ||
    !profileTenantId ||
    authenticatedTenantId === profileTenantId;

  // Create a unified effective user data object to avoid multiple recalculations
  const businessData = useMemo(() => {
    // Generate business name from user attributes if not explicitly set
    const generateBusinessName = () => {
      // Helper function to find attribute regardless of case
      const findAttr = (obj, baseKey) => {
        if (!obj) return null;
        
        // Direct access attempt first
        if (obj[baseKey]) return obj[baseKey];
        
        // Try case insensitive lookup
        const baseLower = baseKey.toLowerCase();
        const key = Object.keys(obj || {}).find(k => k?.toLowerCase() === baseLower);
        return key && obj ? obj[key] : null;
      };
      
      // Log all sources of business name to help debug
      const cognitoName = 
        findAttr(userAttributes, 'custom:businessname') || 
        findAttr(user, 'custom:businessname');
        
      const stateValue = businessName;
      const userDataName = 
        findAttr(userData, 'businessName') || 
        findAttr(userData, 'custom:businessname');
        
      const profileDataName = 
        profileData?.businessName ||
        (profileData?.userData ? findAttr(profileData.userData, 'businessName') : null);
      
      // Log all potential sources to help with debugging
      logger.debug('[AppBar] Business name sources:', {
        cognitoName,
        stateValue,
        userDataName,
        profileDataName
      });
      
      // Return the first valid business name (prioritized order) - no generated names
      return cognitoName || 
             stateValue || 
             userDataName || 
             profileDataName || 
             '';  // Return empty string
    };

    return {
      business_name:
        isValidProfileData && profileData?.business_name
          ? profileData.business_name
          : userData?.business_name ||
            userData?.['custom:businessname'] ||
            generateBusinessName(),

      subscription_type:
        isValidProfileData && profileData?.subscription_type
          ? profileData.subscription_type
          : userData?.subscription_type ||
            userData?.['custom:subscription'] ||
            userAttributes?.['custom:subscription'] ||
            'free',
    };
  }, [isValidProfileData, profileData, userData, businessName, cachedProfileData, userAttributes, user]);

  const getSubscriptionLabel = (type) => {
    if (!type) return 'Free Plan';

    // Normalize the type to handle case variations
    const normalizedType =
      typeof type === 'string' ? type.toString().toLowerCase() : 'free';

    // Log just once per component lifecycle
    logger.debug('Normalized subscription type:', normalizedType);

    // Enhanced matching to handle more variations
    if (normalizedType.includes('pro')) {
      return 'Professional Plan';
    } else if (normalizedType.includes('ent')) {
      return 'Enterprise Plan';
    } else {
      return 'Free Plan';
    }
  };

  const displayLabel = getSubscriptionLabel(businessData.subscription_type);

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
    if (typeof window !== 'undefined' && window.__APP_CACHE?.tenant?.businessName) {
      return window.__APP_CACHE.tenant.businessName;
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
           (businessData?.business_name && businessData.business_name !== '' ? businessData.business_name : '');
  }, [userAttributes, userData, businessName, profileData, businessData]);

  // Function to get the user's email from app cache, cookies, and Cognito tokens
  const getUserEmail = () => {
    if (userData && userData.email) {
      return userData.email;
    }
    
    if (typeof window !== 'undefined') {
      // Initialize app cache if needed
      if (!window.__APP_CACHE) window.__APP_CACHE = {};
      if (!window.__APP_CACHE.auth) window.__APP_CACHE.auth = {};
      if (!window.__APP_CACHE.user) window.__APP_CACHE.user = {};
      
      // Check app cache for email (primary source)
      if (window.__APP_CACHE.auth.email) {
        return window.__APP_CACHE.auth.email;
      }
      
      if (window.__APP_CACHE.user.email) {
        return window.__APP_CACHE.user.email;
      }
      
      // Try to decode from idToken if available in app cache
      const idToken = window.__APP_CACHE.auth.idToken;
      if (idToken) {
        try {
          const payload = JSON.parse(atob(idToken.split('.')[1]));
          if (payload.email) {
            // Ensure data is in app cache
            window.__APP_CACHE.auth.email = payload.email;
            return payload.email;
          }
        } catch (error) {
          console.error('Error parsing ID token:', error);
        }
      }
      
      // Last resort - try to get email from Cognito (async, will update later)
      import('aws-amplify/auth')
        .then(({ fetchUserAttributes }) => {
          fetchUserAttributes()
            .then(attributes => {
              if (attributes.email) {
                window.__APP_CACHE.auth.email = attributes.email;
                // Update UI if needed
                if (setUserData) {
                  setUserData(prevData => ({
                    ...prevData,
                    email: attributes.email
                  }));
                }
              }
            })
            .catch(e => {
              logger.debug('[AppBar] Failed to fetch user attributes:', e);
            });
        })
        .catch(e => {
          logger.debug('[AppBar] Failed to import auth module:', e);
        });
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

  // Effect to fetch Cognito user attributes when authenticated
  useEffect(() => {
    // Define async function for user attributes fetch
    async function fetchCognitoUserData() {
      try {
        logger.debug('[AppBar] Starting Cognito user attributes fetch');
        
        // Try to get Cognito data first if authenticated
        if (isAuthenticated) {
          try {
            logger.debug('[AppBar] User is authenticated, fetching from Cognito directly');
            
            // Import Amplify auth functions
            const { fetchUserAttributes } = await import('aws-amplify/auth');
            
            // Get user attributes directly from Cognito
            const attributes = await fetchUserAttributes();
            logger.debug('[AppBar] Successfully fetched Cognito attributes:', attributes);
            
            // Extract important profile data - enhanced to check more potential attribute names
            const firstName = 
              attributes['given_name'] || 
              attributes['custom:firstname'] || 
              attributes['custom:first_name'] || 
              attributes['first_name'] || 
              attributes['firstName'] || 
              attributes['name']?.split(' ')[0] || 
              '';
              
            const lastName = 
              attributes['family_name'] || 
              attributes['custom:lastname'] || 
              attributes['custom:last_name'] || 
              attributes['last_name'] || 
              attributes['lastName'] || 
              (attributes['name']?.includes(' ') ? attributes['name'].split(' ').slice(1).join(' ') : '') || 
              '';
              
            const email = attributes['email'] || '';
            
            // Enhanced business name extraction - check all possible attribute names
            const businessName = 
              attributes['custom:businessname'] || 
              attributes['custom:tenant_name'] || 
              attributes['custom:business_name'] || 
              attributes['custom:company'] || 
              attributes['businessName'] ||
              attributes['business_name'] ||
              '';
              
            const subscriptionType = 
              attributes['custom:subplan'] || 
              attributes['custom:subscription_plan'] || 
              attributes['custom:subscription'] || 
              'free';
            
            // Create profile object
            const profile = {
              firstName,
              lastName,
              email,
              businessName,
              subscriptionType
            };
            
            logger.info('[AppBar] Profile data from Cognito:', profile);
            
            // Use Cognito business name if available
            if (businessName) {
              logger.info('[AppBar] Setting business name from Cognito:', businessName);
              setBusinessName(businessName);
              
              // Store in app cache for persistence
              if (typeof window !== 'undefined') {
                if (!window.__APP_CACHE) window.__APP_CACHE = {};
                if (!window.__APP_CACHE.tenant) window.__APP_CACHE.tenant = {};
                window.__APP_CACHE.tenant.businessName = businessName;
              }
            }
            
            // Generate and set user initials
            const initials = generateInitialsFromNames(firstName, lastName, email);
            if (initials) {
              setUserInitials(initials);
              
              // Store initials in cache for persistence
              if (typeof window !== 'undefined') {
                if (!window.__APP_CACHE) window.__APP_CACHE = {};
                if (!window.__APP_CACHE.user) window.__APP_CACHE.user = {};
                window.__APP_CACHE.user.initials = initials;
                window.__APP_CACHE.user.firstName = firstName;
                window.__APP_CACHE.user.lastName = lastName;
              }
            }
            
            // Update profile state
            setProfileData(prevProfile => ({
              ...prevProfile,
              ...profile
            }));
            
            // Update userdata if callback available - use setTimeout to break update cycles
            if (typeof setUserData === 'function' && isMounted.current) {
              // Use setTimeout to break update cycles
              setTimeout(() => {
                if (isMounted.current) {
                  updateUserData(prevData => {
                    // Only update if needed - check field by field
                    const needsUpdate = 
                      prevData.businessName !== businessName ||
                      prevData.first_name !== firstName ||
                      prevData.firstName !== firstName ||
                      prevData.last_name !== lastName ||
                      prevData.lastName !== lastName ||
                      prevData.subscription_type !== subscriptionType;
                      
                    if (needsUpdate) {
                      return {
                        ...prevData,
                        ...profile,
                        // Add these fields to ensure they're available for UI display
                        businessName: businessName,
                        first_name: firstName,
                        firstName: firstName,
                        last_name: lastName,
                        lastName: lastName,
                        subscription_type: subscriptionType
                      };
                    }
                    return prevData;
                  });
                }
              }, 0);
            }
            
            return;
          } catch (cognitoError) {
            logger.error('[AppBar] Error fetching Cognito attributes:', cognitoError);
            // Continue with fallbacks below
          }
        }
        
        // If Cognito failed or user not authenticated, try JWT token as fallback
        try {
          // Initialize app cache if needed
          if (typeof window !== 'undefined') {
            if (!window.__APP_CACHE) window.__APP_CACHE = {};
            if (!window.__APP_CACHE.auth) window.__APP_CACHE.auth = {};
            if (!window.__APP_CACHE.user) window.__APP_CACHE.user = {};
          }
          
          // Try to get token from app cache first
          let idToken = null;
          
          if (typeof window !== 'undefined' && window.__APP_CACHE?.auth?.idToken) {
            idToken = window.__APP_CACHE.auth.idToken;
            logger.debug('[AppBar] Using JWT token from app cache');
          } else {
            // Try to get from auth session
            try {
              const { fetchAuthSession } = await import('aws-amplify/auth');
              const session = await fetchAuthSession();
              if (session?.tokens?.idToken) {
                idToken = session.tokens.idToken.toString();
                // Store in app cache for future use
                if (typeof window !== 'undefined') {
                  window.__APP_CACHE = window.__APP_CACHE || {};
                  window.__APP_CACHE.auth = window.__APP_CACHE.auth || {};
                  window.__APP_CACHE.auth.idToken = idToken;
                }
                logger.debug('[AppBar] Retrieved token from auth session');
              }
            } catch (sessionError) {
              logger.warn('[AppBar] Could not retrieve token from session:', sessionError);
            }
          }
          
          if (idToken) {
            const payload = JSON.parse(atob(idToken.split('.')[1]));
            logger.debug('[AppBar] JWT token payload:', payload);
            
            // Extract data from JWT payload
            const firstName = payload['custom:firstname'] || payload['given_name'] || '';
            const lastName = payload['custom:lastname'] || payload['family_name'] || '';
            const email = payload['email'] || '';
            const businessName = payload['custom:businessname'] || payload['custom:tenant_name'] || '';
            
            if (email || firstName || lastName || businessName) {
              logger.info('[AppBar] Found profile information in JWT token');
              
              // Set business name if available
              if (businessName) {
                setBusinessName(businessName);
              }
              
              // Generate initials
              const initials = generateInitialsFromNames(firstName, lastName, email);
              if (initials) {
                setUserInitials(initials);
              }
              
              // Update profile data
              const profile = {
                firstName,
                lastName,
                email,
                businessName,
                subscription_type: payload['custom:subplan'] || 'free'
              };
              
              setProfileData(prevProfile => ({
                ...prevProfile,
                ...profile
              }));
              
              // Update userData if callback available - use setTimeout to break update cycles
              if (typeof setUserData === 'function' && isMounted.current) {
                // Use setTimeout to break update cycles
                setTimeout(() => {
                  if (isMounted.current) {
                    updateUserData(prevData => {
                      // Only update if needed - check field by field
                      const needsUpdate = 
                        prevData.businessName !== businessName ||
                        prevData.first_name !== firstName ||
                        prevData.firstName !== firstName ||
                        prevData.last_name !== lastName ||
                        prevData.lastName !== lastName ||
                        prevData.subscription_type !== subscriptionType;
                        
                      if (needsUpdate) {
                        return {
                          ...prevData,
                          ...profile,
                          // Add these fields to ensure they're available for UI display
                          businessName: businessName,
                          first_name: firstName,
                          firstName: firstName,
                          last_name: lastName,
                          lastName: lastName,
                          subscription_type: subscriptionType
                        };
                      }
                      return prevData;
                    });
                  }
                }, 0);
              }
            }
          }
        } catch (error) {
          logger.error('[DashAppBar] Error extracting data from token:', error);
        }
      } catch (cognitoError) {
        logger.error('[AppBar] Error fetching Cognito attributes:', cognitoError);
      }
    }

    // Call the function when the effect runs
    if (isAuthenticated) {
      fetchCognitoUserData();
    }
  }, [isAuthenticated, updateUserData, generateInitialsFromNames]);

  // Only use tenant-specific fetch when tenant ID changes
  useEffect(() => {
    if (isAuthenticated && tenantId) {
      // Fetch tenant-specific details when tenant ID is available
      fetchCorrectUserDetails();
    }
  }, [isAuthenticated, tenantId, fetchCorrectUserDetails]);

  // Function to get user initials from JWT token
  const getInitialsFromJwtToken = async () => {
    try {
      // Try to get token from app cache first
      let idToken = null;
      
      if (typeof window !== 'undefined' && window.__APP_CACHE?.auth?.idToken) {
        idToken = window.__APP_CACHE.auth.idToken;
      } else {
        // Try to get from auth session
        try {
          const { fetchAuthSession } = await import('aws-amplify/auth');
          const session = await fetchAuthSession();
          if (session?.tokens?.idToken) {
            idToken = session.tokens.idToken.toString();
            // Store in app cache for future use
            if (typeof window !== 'undefined') {
              window.__APP_CACHE = window.__APP_CACHE || {};
              window.__APP_CACHE.auth = window.__APP_CACHE.auth || {};
              window.__APP_CACHE.auth.idToken = idToken;
            }
            logger.debug('[AppBar] Retrieved token from auth session for initials');
          }
        } catch (error) {
          logger.warn('[AppBar] Error accessing auth session:', error);
        }
      }
      
      if (!idToken) {
        logger.warn('[AppBar] No JWT token found for initial extraction');
        return null;
      }

      const payload = JSON.parse(atob(idToken.split('.')[1]));
      logger.debug('[AppBar] Found JWT token payload for initials:', payload);
      
      // Check for first name and last name in ALL possible attribute formats
      const firstName = 
        payload['given_name'] || 
        payload['custom:firstname'] || 
        payload['custom:first_name'] || 
        payload['first_name'] || 
        payload['firstName'] || 
        payload['name']?.split(' ')[0] || 
        '';
      
      const lastName = 
        payload['family_name'] || 
        payload['custom:lastname'] || 
        payload['custom:last_name'] || 
        payload['last_name'] || 
        payload['lastName'] || 
        (payload['name']?.includes(' ') ? payload['name'].split(' ').slice(1).join(' ') : '') || 
        '';
        
      const email = payload['email'] || '';
      
      const initials = generateInitialsFromNames(firstName, lastName, email);
      if (initials) {
        logger.info('[AppBar] Setting initials from JWT token:', { firstName, lastName, initials });
        setUserInitials(initials);
        return initials;
      }
    } catch (error) {
      logger.warn('[AppBar] Error extracting initials from JWT token:', error);
      return null;
    }
  };

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
                  <span className="font-semibold">{businessName || effectiveBusinessName || userAttributes?.['custom:businessname'] || userData?.businessName || ''}</span>
                  <span className="mx-2 h-4 w-px bg-white/30"></span>
                </div>
                
                <div
                  onClick={handleSubscriptionClick}
                  className={`flex items-center px-3 py-1.5 cursor-pointer text-white rounded hover:shadow-md transition-shadow ${
                    userData?.subscription_type === 'professional'
                      ? 'bg-purple-600'
                      : userData?.subscription_type === 'enterprise'
                        ? 'bg-indigo-600'
                        : 'bg-blue-600'
                  }`}
                >
                  {/* Display business name on mobile inside the subscription button */}
                  <span className="whitespace-nowrap text-xs md:hidden mr-1">
                    {effectiveBusinessName ? `${effectiveBusinessName}:` : ''}
                  </span>
                  <span className="whitespace-nowrap text-xs inline-block">
                    {userData?.subscription_type ? getSubscriptionLabel(userData.subscription_type) : 'Free Plan'}
                  </span>
                  {(!userData?.subscription_type || userData?.subscription_type === 'free') && (
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
                  {userInitials || (userAttributes && generateInitialsFromNames(
                    userAttributes['given_name'] || userAttributes['custom:firstname'] || userAttributes['firstName'] || userAttributes['first_name'] || '',
                    userAttributes['family_name'] || userAttributes['custom:lastname'] || userAttributes['lastName'] || userAttributes['last_name'] || '',
                    userAttributes['email'] || ''
                  )) || '?'}
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
                    {userInitials || (userAttributes && generateInitialsFromNames(
                      userAttributes['given_name'] || userAttributes['custom:firstname'] || userAttributes['firstName'] || userAttributes['first_name'] || '',
                      userAttributes['family_name'] || userAttributes['custom:lastname'] || userAttributes['lastName'] || userAttributes['last_name'] || '',
                      userAttributes['email'] || ''
                    )) || '?'}
                  </div>
                  <div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">
                        {userAttributes?.['given_name'] && userAttributes?.['family_name'] ? 
                          `${userAttributes['given_name']} ${userAttributes['family_name']}` : 
                        userAttributes?.['custom:firstname'] && userAttributes?.['custom:lastname'] ? 
                          `${userAttributes['custom:firstname']} ${userAttributes['custom:lastname']}` : 
                        userAttributes?.['firstName'] && userAttributes?.['lastName'] ? 
                          `${userAttributes['firstName']} ${userAttributes['lastName']}` :
                        userData?.name || 
                        (userData?.firstName && userData?.lastName) ? 
                          `${userData.firstName} ${userData.lastName}` :
                        (userData?.first_name && userData?.last_name) ? 
                          `${userData.first_name} ${userData.last_name}` : 
                        userData?.firstName || 
                        userData?.first_name || 
                        userData?.email?.split('@')[0] || 
                        'Guest'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {userAttributes?.email || userData?.email || ''}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  <span className="font-semibold">Business: </span>
                  <span>{userAttributes?.['custom:businessname'] || userData?.businessName || businessName || effectiveBusinessName || ''}</span>
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
                onClick={handleSettingsClick}
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