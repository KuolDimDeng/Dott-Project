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

const DashAppBar = ({
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
}) => {
  const { notifySuccess, notifyError, notifyInfo, notifyWarning } =
    useNotification();

  // Initialize profile data with prop if available or null
  const [profileData, setProfileData] = useState(propProfileData || null);
  const [userInitials, setUserInitials] = useState(null);
  const [showSubscriptionPopup, setShowSubscriptionPopup] = useState(false);
  const [businessName, setBusinessName] = useState(null);

  // Create a ref for the dropdown menu and button
  const userMenuRef = useRef(null);
  const profileButtonRef = useRef(null);

  // Helper function to consistently generate initials from user data
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

  // Update initials whenever user data changes
  useEffect(() => {
    if (userData) {
      const firstName =
        userData.first_name || userData.firstName || userData.given_name;
      const lastName =
        userData.last_name || userData.lastName || userData.family_name;
      const email = userData.email;

      // Always try to get both initials when possible
      if (firstName && lastName) {
        const initials = `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
        logger.info(
          '[AppBar] Setting initials from userData first+last name:',
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
            firstName,
            lastName,
            email,
            initials,
          });
          setUserInitials(initials);
        }
      } else {
        // Fall back to the helper function for complex cases
        const initials = generateInitialsFromNames(firstName, lastName, email);
        if (initials) {
          logger.info('[AppBar] Setting initials from userData using helper:', {
            firstName,
            lastName,
            email,
            initials,
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
        handleClose();
      }
    }

    // Add click event listener to the document
    document.addEventListener('mousedown', handleClickOutside);

    // Cleanup the event listener on component unmount
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenu, handleClose]);

  // Get business name from cookies first - most reliable source
  const getBusinessNameFromCookies = () => {
    try {
      // Get cookies directly
      const getCookie = (name) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
      };

      // Log all cookies for debugging
      console.log('All cookies:', document.cookie);

      // Check multiple possible cookie names
      const businessName = getCookie('businessName') || 
                         getCookie('business_name') || 
                         getCookie('custom:businessname');
      
      console.log('Raw businessName cookie value:', businessName);

      if (businessName) {
        // Check if the value is already decoded or needs decoding
        const needsDecoding = businessName.includes('%');

        // Decode URL-encoded values (like %20 for spaces)
        const decodedName = needsDecoding
          ? decodeURIComponent(businessName)
          : businessName;

        // Check if we have a double-encoded value (contains %25 which is % encoded)
        const isDoubleEncoded = businessName.includes('%25');

        console.log('[AppBar] Cookie analysis:', {
          original: businessName,
          decoded: decodedName,
          needsDecoding,
          isDoubleEncoded,
        });

        // If double-encoded, we need to decode twice
        const finalName = isDoubleEncoded
          ? decodeURIComponent(decodeURIComponent(businessName))
          : decodedName;

        logger.debug(
          '[AppBar] Found business name in cookies. Final value:',
          finalName
        );
        return finalName;
      }
    } catch (e) {
      logger.error('[AppBar] Error reading cookies:', e);
    }
    return null;
  };

  // Get business name from localStorage as fallback
  const getBusinessNameFromStorage = () => {
    try {
      // First try the tenantName which is set by DashboardWrapper
      const tenantName = localStorage.getItem('tenantName');
      if (tenantName && tenantName !== 'undefined' && tenantName !== 'null') {
        logger.debug('[AppBar] Found business name in tenantName:', tenantName);
        return tenantName;
      }
      
      // Check for business info in localStorage
      const storedInfo = localStorage.getItem('businessInfo');
      if (storedInfo) {
        try {
          const parsedInfo = JSON.parse(storedInfo);
          if (parsedInfo.businessName) {
            // Decode URL-encoded values if present
            const decodedName = parsedInfo.businessName.includes('%')
              ? decodeURIComponent(parsedInfo.businessName)
              : parsedInfo.businessName;
            logger.debug(
              '[AppBar] Found business name in localStorage businessInfo:',
              decodedName
            );
            return decodedName;
          }
        } catch (parseError) {
          logger.error('[AppBar] Error parsing businessInfo JSON:', parseError);
        }
      }

      // Try alternative storage keys
      const alternateName = localStorage.getItem('businessName');
      if (alternateName && alternateName !== 'undefined' && alternateName !== 'null') {
        // Decode URL-encoded values if present
        const decodedName = alternateName.includes('%')
          ? decodeURIComponent(alternateName)
          : alternateName;
        logger.debug(
          '[AppBar] Found business name in alternate storage:',
          decodedName
        );
        return decodedName;
      }
    } catch (e) {
      logger.error('[AppBar] Error reading localStorage:', e);
    }
    return null;
  };

  // Fetch user data for AppBar display
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // Check for business name in localStorage first (prioritizes tenantName set by DashboardWrapper)
        const storageBusinessName = getBusinessNameFromStorage();
        const cookieBusinessName = getBusinessNameFromCookies();
        const locallyStoredName = storageBusinessName || cookieBusinessName;
        
        // If we found a business name, update the state
        if (locallyStoredName) {
          logger.info('[AppBar] Setting business name from local sources:', locallyStoredName);
          setBusinessName(locallyStoredName);
        }

        // Check for cookie-based user information
        const getCookie = (name) => {
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) return parts.pop().split(';').shift();
          return null;
        };

        // Get user details from cookies
        const firstName =
          getCookie('first_name') ||
          getCookie('firstName') ||
          getCookie('given_name');
        const lastName =
          getCookie('last_name') ||
          getCookie('lastName') ||
          getCookie('family_name');
        const email = getCookie('email') || getCookie('userEmail');

        // Generate initials from cookie data if available
        let initials = '';
        if (firstName && lastName) {
          const first = firstName.charAt(0).toUpperCase();
          const last = lastName.charAt(0).toUpperCase();
          initials = first + last;
          logger.info('[AppBar] Generated initials from cookies:', {
            firstName,
            lastName,
            initials,
          });
        } else if (firstName) {
          // Try to extract last initial from email or username
          const lastInitial =
            email && email.includes('@') && email.split('@')[0].includes('.')
              ? email.split('@')[0].split('.')[1].charAt(0).toUpperCase()
              : '';

          if (lastInitial) {
            initials = `${firstName.charAt(0).toUpperCase()}${lastInitial}`;
            logger.info(
              '[AppBar] Generated initials from first name and email:',
              { firstName, email, initials }
            );
          } else {
            initials = firstName.charAt(0).toUpperCase();
            logger.info('[AppBar] Only first initial available from cookies:', {
              firstName,
              initials,
            });
          }
        } else if (lastName) {
          initials = lastName.charAt(0).toUpperCase();
        } else if (email) {
          initials = email.charAt(0).toUpperCase();
        }

        if (initials) {
          logger.debug('Setting initials from cookies:', initials);
          setUserInitials(initials);
        }

        // Fetch user profile from API
        let profileApiData = null;
        try {
          // Make API request with tenant ID to get correct profile
          const tenantId =
            localStorage.getItem('tenantId') ||
            getCookie('tenantId') ||
            getCookie('custom:businessid');

          const url = tenantId
            ? `/api/user/profile?tenantId=${encodeURIComponent(tenantId)}`
            : '/api/user/profile';

          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            profileApiData = data;
            logger.debug('Retrieved profile data:', profileApiData);

            // Log specifically what user attributes we found
            logger.info('Retrieved user profile with attributes:', {
              firstName: data.profile?.firstName || data.profile?.first_name,
              lastName: data.profile?.lastName || data.profile?.last_name,
              email: data.profile?.email,
              businessName:
                data.profile?.businessName || data.profile?.business_name,
              subscriptionType:
                data.profile?.subscriptionType ||
                data.profile?.subscription_type,
            });

            // Use profile data to update user information
            if (data.profile) {
              const profileFirstName =
                data.profile.firstName || data.profile.first_name;
              const profileLastName =
                data.profile.lastName || data.profile.last_name;
              const profileEmail = data.profile.email;

              // Extract real user information and override any mock data
              setProfileData({
                business_name:
                  data.profile.businessName ||
                  data.profile.business_name ||
                  locallyStoredName ||
                  'Default Business',
                subscription_type:
                  data.profile.subscription_type ||
                  data.profile.subscriptionType ||
                  'free',
                email: profileEmail,
                first_name: profileFirstName || '',
                last_name: profileLastName || '',
                tenant_id: data.profile.tenantId,
              });

              // Generate initials from profile data
              if (profileFirstName && profileLastName) {
                const initials = `${profileFirstName.charAt(0).toUpperCase()}${profileLastName.charAt(0).toUpperCase()}`;
                logger.info(
                  '[AppBar] Setting initials from profile data:',
                  initials
                );
                setUserInitials(initials);
              } else if (
                profileFirstName &&
                profileEmail &&
                profileEmail.includes('.') &&
                profileEmail.includes('@')
              ) {
                // Try to extract initials from email (kuol.dimdeng@outlook.com -> KD)
                const nameParts = profileEmail.split('@')[0].split('.');
                if (nameParts.length >= 2 && nameParts[1].length > 0) {
                  const initials = `${profileFirstName.charAt(0).toUpperCase()}${nameParts[1].charAt(0).toUpperCase()}`;
                  logger.info(
                    '[AppBar] Setting initials from profile name + email parts:',
                    initials
                  );
                  setUserInitials(initials);
                } else {
                  setUserInitials(profileFirstName.charAt(0).toUpperCase());
                }
              }

              // Update user data with real information - no mock data
              setUserData({
                email: profileEmail,
                firstName: profileFirstName || '',
                lastName: profileLastName || '',
                first_name: profileFirstName || '',
                last_name: profileLastName || '',
                tenantId: data.profile.tenantId,
              });
            }
          }
        } catch (apiError) {
          logger.warn('API call to fetch profile failed:', apiError);
          // Continue with fallback data - don't exit the main function
        }

        // If we don't have profile data from API but have local data
        if (!profileApiData) {
          logger.info('No user data available from API, using local data');

          // If we have a locally stored name, use it even if API call failed
          if (locallyStoredName || firstName || lastName || email) {
            setProfileData((prevData) => ({
              ...(prevData || {}),
              business_name: locallyStoredName || 'Default Business',
              subscription_type: userData?.subscription_type || 'free',
              userData: {
                ...(prevData?.userData || {}),
                first_name: firstName || '',
                last_name: lastName || '',
                email: email || '',
              },
            }));

            // Set initials if we have name data
            if (!initials) {
              const first = firstName ? firstName.charAt(0).toUpperCase() : '';
              const last = lastName ? lastName.charAt(0).toUpperCase() : '';
              const userInitials =
                first + last || (email ? email.charAt(0).toUpperCase() : '');
              if (userInitials) {
                logger.debug(
                  'Setting initials from fallback data:',
                  userInitials
                );
                setUserInitials(userInitials);
              }
            }
          }
          return;
        }

        // Process API data if available
        const profile = profileApiData;
        // Prioritize locally stored business name over API data
        const businessName =
          locallyStoredName ||
          profile.businessName ||
          profile.businessname ||
          'Default Business';
        const subscriptionType =
          profile.subscriptionPlan || profile.subplan || 'free';
        const accountStatus =
          profile.accountStatus || profile.acctstatus || 'ACTIVE';

        // Generate initials from name parts
        let firstInitial = '';
        let lastInitial = '';

        // Use cookie data first if available
        if (firstName) {
          firstInitial = firstName.charAt(0).toUpperCase();
        } else if (
          profile.firstName ||
          profile.firstname ||
          profile.given_name
        ) {
          const profileFirstName =
            profile.firstName || profile.firstname || profile.given_name;
          firstInitial = profileFirstName.charAt(0).toUpperCase();
        }

        if (lastName) {
          lastInitial = lastName.charAt(0).toUpperCase();
        } else if (
          profile.lastName ||
          profile.lastname ||
          profile.family_name
        ) {
          const profileLastName =
            profile.lastName || profile.lastname || profile.family_name;
          lastInitial = profileLastName.charAt(0).toUpperCase();
        }

        // If we don't have first/last name, try to use full name
        if (
          (!firstInitial || !lastInitial) &&
          (profile.fullName || profile.name)
        ) {
          const fullName = profile.fullName || profile.name;
          const nameParts = fullName.split(' ');

          // Only set if we don't already have an initial
          if (!firstInitial && nameParts.length > 0 && nameParts[0]) {
            firstInitial = nameParts[0].charAt(0).toUpperCase();
          }

          if (
            !lastInitial &&
            nameParts.length > 1 &&
            nameParts[nameParts.length - 1]
          ) {
            lastInitial = nameParts[nameParts.length - 1]
              .charAt(0)
              .toUpperCase();
          }
        }

        // If we still don't have initials, use email
        if (!firstInitial && !lastInitial) {
          if (email || profile.email) {
            firstInitial = (email || profile.email).charAt(0).toUpperCase();
          }
        }

        const computedInitials =
          firstInitial && lastInitial
            ? `${firstInitial}${lastInitial}`
            : firstInitial || '';

        logger.info('User profile data:', {
          initials: computedInitials,
          firstName: firstName || profile.firstName || profile.firstname,
          lastName: lastName || profile.lastName || profile.lastname,
          fullName: profile.fullName || profile.name,
          businessName,
          subscriptionType,
          accountStatus,
        });

        // Update state with user data
        setProfileData({
          userData: {
            ...profile,
            first_name:
              firstName || profile.firstName || profile.firstname || '',
            last_name: lastName || profile.lastName || profile.lastname || '',
            email: email || profile.email || '',
          },
          business_name: businessName,
          subscription_type: subscriptionType,
          account_status: accountStatus,
          business_type: profile.businessType || profile.businesstype,
          business_country: profile.businessCountry || profile.businesscountry,
          created_at: profile.created_at || profile.created,
          payment_verified:
            profile.paymentVerified || profile.payverified === 'TRUE',
          subscription_interval:
            profile.subscriptionInterval ||
            profile.subscriptioninterval ||
            'MONTHLY',
          subscription_status:
            profile.subscriptionStatus ||
            profile.subscriptionstatus ||
            'ACTIVE',
          full_data: JSON.stringify(profile),
        });

        // Set initials separately if not already set
        if (computedInitials) {
          logger.debug('Setting computed initials:', computedInitials);
          setUserInitials(computedInitials);
        }
      } catch (error) {
        // Handle any errors gracefully
        logger.warn('Error in fetchUserProfile:', error);

        try {
          // If API call fails, still use locally stored data if available
          const cookieBusinessName = getBusinessNameFromCookies();
          const storageBusinessName = getBusinessNameFromStorage();

          // Get user details from cookies
          const getCookie = (name) => {
            try {
              const value = `; ${document.cookie}`;
              const parts = value.split(`; ${name}=`);
              if (parts.length === 2) return parts.pop().split(';').shift();
              return null;
            } catch (e) {
              return null;
            }
          };

          const firstName =
            getCookie('first_name') ||
            getCookie('firstName') ||
            getCookie('given_name');
          const lastName =
            getCookie('last_name') ||
            getCookie('lastName') ||
            getCookie('family_name');
          const email = getCookie('email') || getCookie('userEmail');

          if (
            cookieBusinessName ||
            storageBusinessName ||
            firstName ||
            lastName ||
            email
          ) {
            setProfileData((prevData) => ({
              ...(prevData || {}),
              business_name:
                cookieBusinessName || storageBusinessName || "",
              subscription_type: userData?.subscription_type || 'free',
              userData: {
                ...(prevData?.userData || {}),
                first_name: firstName || '',
                last_name: lastName || '',
                email: email || '',
              },
            }));

            // Set fallback initials
            if (firstName || lastName || email) {
              const first = firstName ? firstName.charAt(0).toUpperCase() : '';
              const last = lastName ? lastName.charAt(0).toUpperCase() : '';
              const initials =
                first + last || (email ? email.charAt(0).toUpperCase() : '');
              if (initials) {
                setUserInitials(initials);
              }
            }
          }
        } catch (fallbackError) {
          logger.error('Error using fallback data:', fallbackError);
        }
      }
    };

    fetchUserProfile();
  }, [userData?.subscription_type]);

  // Initialize userInitials from userData directly when component mounts
  useEffect(() => {
    if (!userInitials && userData) {
      const firstName =
        userData.first_name || userData.firstName || userData.given_name;
      const lastName =
        userData.last_name || userData.lastName || userData.family_name;
      const email = userData.email || localStorage.getItem('authUser');

      if (firstName && lastName) {
        const first = firstName.charAt(0).toUpperCase();
        const last = lastName.charAt(0).toUpperCase();
        setUserInitials(first + last);
        console.log('Initializing userInitials from userData:', first + last);
      } else if (firstName) {
        // Try to extract last initial from email if available
        if (email && email.includes('@')) {
          const namePart = email.split('@')[0];
          if (
            namePart.includes('.') &&
            !namePart.startsWith('.') &&
            !namePart.endsWith('.')
          ) {
            const parts = namePart.split('.');
            if (parts.length >= 2 && parts[1].length > 0) {
              const initials = `${firstName.charAt(0).toUpperCase()}${parts[1].charAt(0).toUpperCase()}`;
              setUserInitials(initials);
              console.log(
                'Initializing userInitials from firstName and email:',
                initials
              );
              return;
            }
          }
        }
        const initial = firstName.charAt(0).toUpperCase();
        setUserInitials(initial);
        console.log('Initializing userInitials from firstName:', initial);
      } else if (lastName) {
        const initial = lastName.charAt(0).toUpperCase();
        setUserInitials(initial);
        console.log('Initializing userInitials from lastName:', initial);
      } else if (email) {
        // Try to extract initials from email if in format "first.last@domain.com"
        if (email.includes('@')) {
          const namePart = email.split('@')[0];
          if (
            namePart.includes('.') &&
            !namePart.startsWith('.') &&
            !namePart.endsWith('.')
          ) {
            const parts = namePart.split('.');
            if (parts.length >= 2) {
              const initials = `${parts[0].charAt(0).toUpperCase()}${parts[1].charAt(0).toUpperCase()}`;
              setUserInitials(initials);
              console.log(
                'Initializing userInitials from email parts:',
                initials
              );
              return;
            }
          }
        }
        const initial = email.charAt(0).toUpperCase();
        setUserInitials(initial);
        console.log('Initializing userInitials from email:', initial);
      } else {
        // Try to extract email from cookies as last resort
        const getCookieEmail = () => {
          const cookies = document.cookie.split(';');
          for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'email' || name.includes('email')) {
              return value;
            }
          }
          return null;
        };

        const cookieEmail = getCookieEmail();
        if (cookieEmail) {
          // Try to extract initials from email if in format "first.last@domain.com"
          if (cookieEmail.includes('@')) {
            const namePart = cookieEmail.split('@')[0];
            if (
              namePart.includes('.') &&
              !namePart.startsWith('.') &&
              !namePart.endsWith('.')
            ) {
              const parts = namePart.split('.');
              if (parts.length >= 2) {
                const initials = `${parts[0].charAt(0).toUpperCase()}${parts[1].charAt(0).toUpperCase()}`;
                setUserInitials(initials);
                console.log(
                  'Initializing userInitials from cookie email parts:',
                  initials
                );
                return;
              }
            }
          }
          const initial = cookieEmail.charAt(0).toUpperCase();
          setUserInitials(initial);
          console.log('Initializing userInitials from cookie email:', initial);
        }
      }
    }
  }, [userData, userInitials]);

  // Additional tenant check to ensure we're showing the correct user initials
  useEffect(() => {
    const fetchCorrectUserDetails = async () => {
      try {
        // Define getCookie function to fix the "cookies is not defined" error
        const getCookie = (name) => {
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) return parts.pop().split(';').shift();
          return null;
        };

        // First check if we should try to get user details from tenant record
        const effectiveTenantId =
          tenantId ||
          localStorage.getItem('tenantId') ||
          getCookie('businessid');

        if (userData) {
          // Log what we received from parent component - helps debug issues
          logger.debug('[AppBar] User data from parent:', {
            first_name: userData.first_name,
            last_name: userData.last_name,
            email: userData.email,
            businessName: userData.businessName,
          });

          // Format tenant ID for database compatibility
          const formatTenantId = (id) => {
            if (!id) return null;
            return id.replace(/-/g, '_');
          };
        }

        if (!effectiveTenantId || effectiveTenantId === '(not found)') {
          logger.debug(
            '[AppBar] No tenant ID found - skipping record verification'
          );
          return;
        }

        logger.debug(
          '[AppBar] Fetching user profile with tenant ID:',
          effectiveTenantId
        );

        // Make API request to fetch profile data
        const authToken = localStorage.getItem('authToken');
        const idToken = getCookie('idToken');
        const cognitoToken = getCookie('CognitoIdentityServiceProvider');

        const authTokenHeader =
          authToken ||
          idToken ||
          (cognitoToken && cognitoToken.includes('idToken'))
            ? { Authorization: `Bearer ${authToken || idToken}` }
            : {};

        const requestInfo = {
          url: `/api/user/profile?tenantId=${effectiveTenantId}`,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            ...authTokenHeader,
          },
        };

        logger.debug('[AppBar] Making API request to:', requestInfo);
        const response = await fetch(requestInfo.url, {
          headers: requestInfo.headers,
        });

        if (response.ok) {
          const profileData = await response.json();
          logger.debug(
            '[AppBar] Fetched profile data with tenant ID:',
            profileData
          );

          // Log specifically what attributes we found for debugging
          logger.info('[AppBar] User profile attributes with tenant ID:', {
            firstName: profileData.firstName || profileData.first_name,
            lastName: profileData.lastName || profileData.last_name,
            email: profileData.email,
            businessName: profileData.businessName || profileData.business_name,
            subscriptionType:
              profileData.subscriptionType || profileData.subscription_type,
            tenantId: effectiveTenantId,
          });

          if (profileData) {
            // Extract first and last name
            const firstName =
              profileData.firstName ||
              profileData.first_name ||
              profileData.given_name;
            const lastName =
              profileData.lastName ||
              profileData.last_name ||
              profileData.family_name;
            const profileEmail = profileData.email;

            // If missing name info but have email, try to extract from email format
            let extractedFirst = firstName;
            let extractedLast = lastName;

            if (
              (!extractedFirst || !extractedLast) &&
              profileEmail &&
              profileEmail.includes('@')
            ) {
              const namePart = profileEmail.split('@')[0];
              if (namePart.includes('.')) {
                const parts = namePart.split('.');
                if (parts.length >= 2) {
                  // Capitalize first letter of each name part
                  if (!extractedFirst) {
                    extractedFirst =
                      parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
                  }
                  if (!extractedLast) {
                    extractedLast =
                      parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
                  }
                  logger.info(
                    '[AppBar] Extracted name from email in profile data:',
                    {
                      email: profileEmail,
                      extractedFirst,
                      extractedLast,
                    }
                  );
                }
              }
            }

            if (
              firstName ||
              lastName ||
              profileEmail ||
              extractedFirst ||
              extractedLast
            ) {
              let initials = '';

              if (firstName && lastName) {
                const first = firstName.charAt(0).toUpperCase();
                const last = lastName.charAt(0).toUpperCase();
                initials = first + last;
              } else if (extractedFirst && extractedLast) {
                const first = extractedFirst.charAt(0).toUpperCase();
                const last = extractedLast.charAt(0).toUpperCase();
                initials = first + last;
              } else if (firstName) {
                // Always try to get both initials, even if only firstName is available
                initials = firstName.charAt(0).toUpperCase();
                // Try to extract last initial from email if possible
                if (profileEmail && profileEmail.includes('@')) {
                  const namePart = profileEmail.split('@')[0];
                  // Check if email contains both names (first.last@domain.com)
                  if (
                    namePart.includes('.') &&
                    !namePart.startsWith('.') &&
                    !namePart.endsWith('.')
                  ) {
                    const parts = namePart.split('.');
                    if (parts.length >= 2 && parts[1].length > 0) {
                      initials += parts[1].charAt(0).toUpperCase();
                    }
                  }
                }
              } else if (lastName) {
                initials = lastName.charAt(0).toUpperCase();
              } else if (profileEmail) {
                // Try to extract initials from email (first.last@domain.com format)
                const email = profileEmail;
                if (email.includes('@')) {
                  const namePart = email.split('@')[0];
                  if (namePart.includes('.')) {
                    const parts = namePart.split('.');
                    if (parts.length >= 2) {
                      initials = `${parts[0].charAt(0).toUpperCase()}${parts[1].charAt(0).toUpperCase()}`;
                    } else {
                      initials = email.charAt(0).toUpperCase();
                    }
                  } else {
                    initials = email.charAt(0).toUpperCase();
                  }
                } else {
                  initials = email.charAt(0).toUpperCase();
                }
              }

              if (initials) {
                setUserInitials(initials);
                logger.info(
                  '[AppBar] Setting initials from tenant-specific profile:',
                  initials
                );
              }

              // Also update the profile data
              setProfileData((prevData) => ({
                ...(prevData || {}),
                userData: {
                  ...profileData,
                  first_name: firstName || extractedFirst || '',
                  last_name: lastName || extractedLast || '',
                  email: profileEmail || '',
                },
                business_name:
                  profileData.businessName || profileData.business_name || '',
                subscription_type:
                  profileData.subscriptionType ||
                  profileData.subscription_type ||
                  'free',
                // Store the tenant ID for consistency checks
                tenant_id: effectiveTenantId,
              }));

              // Update userData with real information, not mock data
              if (userData) {
                userData.first_name =
                  firstName || extractedFirst || userData.first_name || '';
                userData.last_name =
                  lastName || extractedLast || userData.last_name || '';
                userData.email = profileEmail || userData.email;
              }
            }
          }
        } else {
          logger.warn(
            `[AppBar] Failed to fetch user profile: ${response.status} ${response.statusText}`
          );
        }
      } catch (error) {
        logger.error(
          '[AppBar] Error fetching tenant-specific user details:',
          error
        );
      }
    };

    // Only fetch if we have userData (authenticated)
    if (userData) {
      fetchCorrectUserDetails();
    }
  }, [userData]);

  // Directly calculate initials from userData if needed - prioritize real user data
  const directInitials = useMemo(() => {
    // Already have initials from authenticated user data
    if (userInitials) return userInitials;

    // Check profileData first as it is more likely to have the correct user data
    if (profileData?.userData) {
      const profileFirstName =
        profileData.userData.first_name ||
        profileData.userData.firstName ||
        profileData.userData.given_name;
      const profileLastName =
        profileData.userData.last_name ||
        profileData.userData.lastName ||
        profileData.userData.family_name;

      if (profileFirstName && profileLastName) {
        return `${profileFirstName.charAt(0).toUpperCase()}${profileLastName.charAt(0).toUpperCase()}`;
      } else if (profileFirstName) {
        // Try to get last initial from email if available
        const profileEmail = profileData.userData.email;
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
      const profileEmail = profileData.userData.email;
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
        userData.first_name || userData.firstName || userData.given_name;
      const lastName =
        userData.last_name || userData.lastName || userData.family_name;

      if (firstName && lastName) {
        return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
      } else if (firstName) {
        // Try to get last initial from email if available
        const email = userData.email;
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
      const email = userData.email;
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
    return 'D';
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
    return {
      business_name:
        isValidProfileData && profileData?.business_name
          ? profileData.business_name
          : userData?.business_name ||
            userData?.['custom:businessname'] ||
            (typeof window !== 'undefined' &&
              localStorage.getItem('businessName')) ||
            'Default Business',

      subscription_type:
        isValidProfileData && profileData?.subscription_type
          ? profileData.subscription_type
          : userData?.subscription_type ||
            userData?.['custom:subscription'] ||
            (typeof window !== 'undefined' &&
              localStorage.getItem('subscriptionType')) ||
            'free',
    };
  }, [isValidProfileData, profileData, userData]);

  const getSubscriptionLabel = (type) => {
    if (!type) return 'Free Plan';

    // Normalize the type to handle case variations
    const normalizedType =
      typeof type === 'string' ? type.toString().toLowerCase() : 'free';

    // Only log this once per session by using the debug level
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
    // First check our state which should have been set by now
    if (businessName) {
      return businessName;
    }
    
    // Fallback to profileData
    if (profileData?.business_name) {
      return profileData.business_name;
    }
    
    // Try localStorage again as final fallback
    const storedName = localStorage.getItem('tenantName') || 
                       localStorage.getItem('businessName');
    if (storedName && storedName !== 'undefined' && storedName !== 'null') {
      return storedName;
    }
    
    return 'Dashboard';
  }, [businessName, profileData]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: animationStyles }} />
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
              width={140}
              height={40}
              className="object-contain"
              priority
            />
          </div>
          
          {/* Controls on the right */}
          <div className="flex items-center h-full ml-auto">
            {/* Business name and Subscription type display */}
            {userData && (
              <div className="flex items-center">
                {/* Business name */}
                <div className="text-white hidden md:flex items-center mr-3">
                  <span className="font-semibold">{effectiveBusinessName}</span>
                  <span className="mx-2 h-4 w-px bg-white/30"></span>
                </div>
                
                <div
                  onClick={handleSubscriptionClick}
                  className={`flex items-center px-3 py-1.5 cursor-pointer text-white rounded hover:shadow-md transition-shadow ${
                    businessData.subscription_type === 'professional'
                      ? 'bg-purple-600'
                      : businessData.subscription_type === 'enterprise'
                        ? 'bg-indigo-600'
                        : 'bg-blue-600'
                  }`}
                >
                  {/* Display business name on mobile inside the subscription button */}
                  <span className="whitespace-nowrap text-xs md:hidden mr-1">
                    {effectiveBusinessName}:
                  </span>
                  <span className="whitespace-nowrap text-xs inline-block">
                    {displayLabel}
                  </span>
                  {businessData.subscription_type === 'free' && (
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
            )}

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
              onClick={handleClick}
              aria-controls={openMenu ? 'user-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={openMenu ? 'true' : undefined}
              className="flex items-center justify-center text-white hover:bg-white/10 p-0.5 rounded-full"
            >
              <div className="w-8 h-8 rounded-full bg-primary-main text-white flex items-center justify-center text-sm font-medium border-2 border-white">
                {displayInitials ||
                  (() => {
                    // Final fallback - calculate initials directly at render time
                    const firstName =
                      effectiveUserData?.first_name ||
                      effectiveUserData?.firstName ||
                      '';
                    const lastName =
                      effectiveUserData?.last_name ||
                      effectiveUserData?.lastName ||
                      '';
                    const email = effectiveUserData?.email || '';

                    if (firstName && lastName) {
                      return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
                    } else if (firstName && email) {
                      // Try to extract last initial from email
                      if (email.includes('@')) {
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
                    } else if (email) {
                      return email.charAt(0).toUpperCase();
                    }
                    
                    return 'U';
                  })()}
              </div>
            </button>
            
            {/* User menu */}
            {openMenu && (
              <div
                ref={userMenuRef}
                id="user-menu"
                className="absolute right-4 mt-2 top-14 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50"
              >
                {/* ... keep the existing menu content ... */}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Add the subscription popup */}
      <SubscriptionPopup
        open={showSubscriptionPopup}
        onClose={() => setShowSubscriptionPopup(false)}
      />

      {/* ... keep the existing create menu popup ... */}
    </>
  );
};

export default DashAppBar;
