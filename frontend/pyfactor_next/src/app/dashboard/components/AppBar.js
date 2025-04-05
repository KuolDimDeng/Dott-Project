'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import DashboardLanguageSelector from './LanguageSelector';
import { getSubscriptionPlanColor } from '@/utils/userAttributes';
import { useNotification } from '@/context/NotificationContext';
import { logger } from '@/utils/logger';
import { Avatar } from '@mui/material';

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
  const { notifySuccess, notifyError, notifyInfo, notifyWarning } = useNotification();
  // Add state for profile data from API
  const [profileData, setProfileData] = useState(null);
  const [userInitials, setUserInitials] = useState('');

  // Create a ref for the dropdown menu and button
  const userMenuRef = useRef(null);
  const profileButtonRef = useRef(null);

  // Helper function to consistently generate initials from user data
  const generateInitialsFromNames = useCallback((firstNameValue, lastNameValue, emailValue) => {
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
        if (emailParts.length >= 2 && emailParts[0].length > 0 && emailParts[1].length > 0) {
          return `${emailParts[0].charAt(0).toUpperCase()}${emailParts[1].charAt(0).toUpperCase()}`;
        }
      }
      return emailValue.charAt(0).toUpperCase();
    }
    
    return '';
  }, []);

  // Update initials whenever user data changes
  useEffect(() => {
    if (userData) {
      const firstName = userData.first_name || userData.firstName || userData.given_name;
      const lastName = userData.last_name || userData.lastName || userData.family_name;
      const email = userData.email;
      
      const initials = generateInitialsFromNames(firstName, lastName, email);
      if (initials) {
        logger.info('[AppBar] Setting initials from userData:', { firstName, lastName, email, initials });
        setUserInitials(initials);
      }
    }
  }, [userData, generateInitialsFromNames]);

  // Update initials when profile data changes
  useEffect(() => {
    if (profileData?.userData) {
      const firstName = profileData.userData.first_name || profileData.userData.firstName || profileData.userData.given_name;
      const lastName = profileData.userData.last_name || profileData.userData.lastName || profileData.userData.family_name;
      const email = profileData.userData.email;
      
      const initials = generateInitialsFromNames(firstName, lastName, email);
      if (initials) {
        logger.info('[AppBar] Setting initials from profileData:', { firstName, lastName, email, initials });
        setUserInitials(initials);
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
      
      const businessName = getCookie('businessName');
      console.log('Raw businessName cookie value:', businessName);
      
      if (businessName) {
        // Check if the value is already decoded or needs decoding
        const needsDecoding = businessName.includes('%');
        
        // Decode URL-encoded values (like %20 for spaces)
        const decodedName = needsDecoding ? decodeURIComponent(businessName) : businessName;
        
        // Check if we have a double-encoded value (contains %25 which is % encoded)
        const isDoubleEncoded = businessName.includes('%25');
        
        console.log('[AppBar] Cookie analysis:', { 
          original: businessName, 
          decoded: decodedName,
          needsDecoding,
          isDoubleEncoded
        });
        
        // If double-encoded, we need to decode twice
        const finalName = isDoubleEncoded 
          ? decodeURIComponent(decodeURIComponent(businessName))
          : decodedName;
          
        logger.debug('[AppBar] Found business name in cookies. Final value:', finalName);
        return finalName;
      }
      
      // Try alternative cookie names
      const alternateName = getCookie('custom:businessname') || getCookie('business_name');
      if (alternateName) {
        // Decode URL-encoded values (like %20 for spaces)
        const decodedName = decodeURIComponent(alternateName);
        logger.debug('[AppBar] Found business name in alternate cookies:', alternateName, 'decoded:', decodedName);
        return decodedName;
      }
    } catch (e) {
      logger.error('[AppBar] Error reading cookies:', e);
    }
    return null;
  };
  
  // Get business name from localStorage as fallback
  const getBusinessNameFromStorage = () => {
    try {
      // Check for business info in localStorage
      const storedInfo = localStorage.getItem('businessInfo');
      if (storedInfo) {
        const parsedInfo = JSON.parse(storedInfo);
        if (parsedInfo.businessName) {
          // Decode URL-encoded values if present
          const decodedName = parsedInfo.businessName.includes('%') ? 
            decodeURIComponent(parsedInfo.businessName) : 
            parsedInfo.businessName;
          logger.debug('[AppBar] Found business name in localStorage:', decodedName);
          return decodedName;
        }
      }
      
      // Try alternative storage keys
      const alternateName = localStorage.getItem('businessName');
      if (alternateName) {
        // Decode URL-encoded values if present
        const decodedName = alternateName.includes('%') ? 
          decodeURIComponent(alternateName) : 
          alternateName;
        logger.debug('[AppBar] Found business name in alternate storage:', decodedName);
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
        // Check for business name in cookies or localStorage first
        const cookieBusinessName = getBusinessNameFromCookies();
        const storageBusinessName = getBusinessNameFromStorage();
        const locallyStoredName = cookieBusinessName || storageBusinessName;
        
        // Check for cookie-based user information
        const getCookie = (name) => {
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) return parts.pop().split(';').shift();
          return null;
        };
        
        // Get user details from cookies
        const firstName = getCookie('first_name') || getCookie('firstName') || getCookie('given_name');
        const lastName = getCookie('last_name') || getCookie('lastName') || getCookie('family_name');
        const email = getCookie('email') || getCookie('userEmail');
        
        // Generate initials from cookie data if available
        let initials = '';
        if (firstName && lastName) {
          const first = firstName.charAt(0).toUpperCase();
          const last = lastName.charAt(0).toUpperCase();
          initials = first + last;
          logger.info('[AppBar] Generated initials from cookies:', { firstName, lastName, initials });
        } else if (firstName) {
          // Try to extract last initial from email or username
          const lastInitial = email && email.includes('@') && email.split('@')[0].includes('.') ? 
                              email.split('@')[0].split('.')[1].charAt(0).toUpperCase() : '';
          
          if (lastInitial) {
            initials = `${firstName.charAt(0).toUpperCase()}${lastInitial}`;
            logger.info('[AppBar] Generated initials from first name and email:', { firstName, email, initials });
          } else {
            initials = firstName.charAt(0).toUpperCase();
            logger.info('[AppBar] Only first initial available from cookies:', { firstName, initials });
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
          const tenantId = localStorage.getItem('tenantId') || 
                          getCookie('tenantId') || 
                          getCookie('custom:businessid');
          
          const url = tenantId ? 
            `/api/user/profile?tenantId=${encodeURIComponent(tenantId)}` : 
            '/api/user/profile';
          
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
              businessName: data.profile?.businessName || data.profile?.business_name,
              subscriptionType: data.profile?.subscriptionType || data.profile?.subscription_type
            });
            
            // Use profile data to update user information
            if (data.profile) {
              const profileFirstName = data.profile.firstName || data.profile.first_name;
              const profileLastName = data.profile.lastName || data.profile.last_name;
              const profileEmail = data.profile.email;
              
              // Extract real user information and override any mock data
              setProfileData({
                business_name: data.profile.businessName || data.profile.business_name || locallyStoredName || 'My Business',
                subscription_type: data.profile.subscription_type || data.profile.subscriptionType || 'free',
                email: profileEmail,
                first_name: profileFirstName || '',
                last_name: profileLastName || '',
                tenant_id: data.profile.tenantId
              });
              
              // Generate initials from profile data
              if (profileFirstName && profileLastName) {
                const initials = `${profileFirstName.charAt(0).toUpperCase()}${profileLastName.charAt(0).toUpperCase()}`;
                logger.info('[AppBar] Setting initials from profile data:', initials);
                setUserInitials(initials);
              } else if (profileFirstName && profileEmail && profileEmail.includes('.') && profileEmail.includes('@')) {
                // Try to extract initials from email (kuol.dimdeng@outlook.com -> KD)
                const nameParts = profileEmail.split('@')[0].split('.');
                if (nameParts.length >= 2 && nameParts[1].length > 0) {
                  const initials = `${profileFirstName.charAt(0).toUpperCase()}${nameParts[1].charAt(0).toUpperCase()}`;
                  logger.info('[AppBar] Setting initials from profile name + email parts:', initials);
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
                tenantId: data.profile.tenantId
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
            setProfileData(prevData => ({
              ...(prevData || {}),
              business_name: locallyStoredName || 'My Business',
              subscription_type: userData?.subscription_type || 'free',
              userData: {
                ...(prevData?.userData || {}),
                first_name: firstName || '',
                last_name: lastName || '',
                email: email || ''
              }
            }));
            
            // Set initials if we have name data
            if (!initials) {
              const first = firstName ? firstName.charAt(0).toUpperCase() : '';
              const last = lastName ? lastName.charAt(0).toUpperCase() : '';
              const userInitials = (first + last) || (email ? email.charAt(0).toUpperCase() : '');
              if (userInitials) {
                logger.debug('Setting initials from fallback data:', userInitials);
                setUserInitials(userInitials);
              }
            }
          }
          return;
        }
        
        // Process API data if available
        const profile = profileApiData;
        // Prioritize locally stored business name over API data
        const businessName = locallyStoredName || profile.businessName || profile.businessname || 'My Business';
        const subscriptionType = profile.subscriptionPlan || profile.subplan || 'free';
        const accountStatus = profile.accountStatus || profile.acctstatus || 'ACTIVE';
        
        // Generate initials from name parts
        let firstInitial = '';
        let lastInitial = '';
        
        // Use cookie data first if available
        if (firstName) {
          firstInitial = firstName.charAt(0).toUpperCase();
        } else if (profile.firstName || profile.firstname || profile.given_name) {
          const profileFirstName = profile.firstName || profile.firstname || profile.given_name;
          firstInitial = profileFirstName.charAt(0).toUpperCase();
        }
        
        if (lastName) {
          lastInitial = lastName.charAt(0).toUpperCase();
        } else if (profile.lastName || profile.lastname || profile.family_name) {
          const profileLastName = profile.lastName || profile.lastname || profile.family_name;
          lastInitial = profileLastName.charAt(0).toUpperCase();
        }
        
        // If we don't have first/last name, try to use full name
        if ((!firstInitial || !lastInitial) && (profile.fullName || profile.name)) {
          const fullName = profile.fullName || profile.name;
          const nameParts = fullName.split(' ');
          
          // Only set if we don't already have an initial
          if (!firstInitial && nameParts.length > 0 && nameParts[0]) {
            firstInitial = nameParts[0].charAt(0).toUpperCase();
          }
          
          if (!lastInitial && nameParts.length > 1 && nameParts[nameParts.length - 1]) {
            lastInitial = nameParts[nameParts.length - 1].charAt(0).toUpperCase();
          }
        }
        
        // If we still don't have initials, use email
        if (!firstInitial && !lastInitial) {
          if (email || profile.email) {
            firstInitial = (email || profile.email).charAt(0).toUpperCase();
          }
        }
        
        const computedInitials = firstInitial && lastInitial ? `${firstInitial}${lastInitial}` : firstInitial || '';
        
        logger.info('User profile data:', {
          initials: computedInitials,
          firstName: firstName || profile.firstName || profile.firstname,
          lastName: lastName || profile.lastName || profile.lastname,
          fullName: profile.fullName || profile.name,
          businessName,
          subscriptionType,
          accountStatus
        });
        
        // Update state with user data
        setProfileData({
          userData: {
            ...profile,
            first_name: firstName || profile.firstName || profile.firstname || '',
            last_name: lastName || profile.lastName || profile.lastname || '',
            email: email || profile.email || '',
          },
          business_name: businessName,
          subscription_type: subscriptionType,
          account_status: accountStatus,
          business_type: profile.businessType || profile.businesstype,
          business_country: profile.businessCountry || profile.businesscountry,
          created_at: profile.created_at || profile.created,
          payment_verified: profile.paymentVerified || profile.payverified === 'TRUE',
          subscription_interval: profile.subscriptionInterval || profile.subscriptioninterval || 'MONTHLY',
          subscription_status: profile.subscriptionStatus || profile.subscriptionstatus || 'ACTIVE',
          full_data: JSON.stringify(profile)
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
          
          const firstName = getCookie('first_name') || getCookie('firstName') || getCookie('given_name');
          const lastName = getCookie('last_name') || getCookie('lastName') || getCookie('family_name');
          const email = getCookie('email') || getCookie('userEmail');
          
          if (cookieBusinessName || storageBusinessName || firstName || lastName || email) {
            setProfileData(prevData => ({
              ...(prevData || {}),
              business_name: cookieBusinessName || storageBusinessName || 'My Business',
              subscription_type: userData?.subscription_type || 'free',
              userData: {
                ...(prevData?.userData || {}),
                first_name: firstName || '',
                last_name: lastName || '',
                email: email || ''
              }
            }));
            
            // Set fallback initials
            if (firstName || lastName || email) {
              const first = firstName ? firstName.charAt(0).toUpperCase() : '';
              const last = lastName ? lastName.charAt(0).toUpperCase() : '';
              const initials = (first + last) || (email ? email.charAt(0).toUpperCase() : '');
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
      const firstName = userData.first_name || userData.firstName || userData.given_name;
      const lastName = userData.last_name || userData.lastName || userData.family_name;
      const email = userData.email || localStorage.getItem('authUser');
      
      if (firstName && lastName) {
        const first = firstName.charAt(0).toUpperCase();
        const last = lastName.charAt(0).toUpperCase();
        setUserInitials(first + last);
        console.log("Initializing userInitials from userData:", first + last);
      } else if (firstName) {
        // Try to extract last initial from email if available
        if (email && email.includes('@')) {
          const namePart = email.split('@')[0];
          if (namePart.includes('.') && !namePart.startsWith('.') && !namePart.endsWith('.')) {
            const parts = namePart.split('.');
            if (parts.length >= 2 && parts[1].length > 0) {
              const initials = `${firstName.charAt(0).toUpperCase()}${parts[1].charAt(0).toUpperCase()}`;
              setUserInitials(initials);
              console.log("Initializing userInitials from firstName and email:", initials);
              return;
            }
          }
        }
        const initial = firstName.charAt(0).toUpperCase();
        setUserInitials(initial);
        console.log("Initializing userInitials from firstName:", initial);
      } else if (lastName) {
        const initial = lastName.charAt(0).toUpperCase();
        setUserInitials(initial);
        console.log("Initializing userInitials from lastName:", initial);
      } else if (email) {
        // Try to extract initials from email if in format "first.last@domain.com"
        if (email.includes('@')) {
          const namePart = email.split('@')[0];
          if (namePart.includes('.') && !namePart.startsWith('.') && !namePart.endsWith('.')) {
            const parts = namePart.split('.');
            if (parts.length >= 2) {
              const initials = `${parts[0].charAt(0).toUpperCase()}${parts[1].charAt(0).toUpperCase()}`;
              setUserInitials(initials);
              console.log("Initializing userInitials from email parts:", initials);
              return;
            }
          }
        }
        const initial = email.charAt(0).toUpperCase();
        setUserInitials(initial);
        console.log("Initializing userInitials from email:", initial);
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
            if (namePart.includes('.') && !namePart.startsWith('.') && !namePart.endsWith('.')) {
              const parts = namePart.split('.');
              if (parts.length >= 2) {
                const initials = `${parts[0].charAt(0).toUpperCase()}${parts[1].charAt(0).toUpperCase()}`;
                setUserInitials(initials);
                console.log("Initializing userInitials from cookie email parts:", initials);
                return;
              }
            }
          }
          const initial = cookieEmail.charAt(0).toUpperCase();
          setUserInitials(initial);
          console.log("Initializing userInitials from cookie email:", initial);
        }
      }
    }
  }, [userData, userInitials]);

  // Additional tenant check to ensure we're showing the correct user initials
  useEffect(() => {
    const fetchCorrectUserDetails = async () => {
      try {
        // Extract businessName from cookies
        const cookieBusinessName = getBusinessNameFromCookies();
        // Moved to a higher scope to be used throughout the function
        const businessNameFromStorage = localStorage.getItem('businessName') || localStorage.getItem('businessname');
        
        // Get Tenant ID from multiple sources
        const tenantIdFromStorage = localStorage.getItem('tenantId');
        const tenantIdFromCookie = (() => {
          const value = `; ${document.cookie}`;
          const parts = value.split(`; tenantId=`);
          if (parts.length === 2) return parts.pop().split(';').shift();
          return null;
        })();
        const tenantIdFromUserData = userData?.tenantId || userData?.['custom:businessid'];
        
        const effectiveTenantId = tenantIdFromStorage || tenantIdFromCookie || tenantIdFromUserData;
        logger.debug('[AppBar] Using tenant ID:', effectiveTenantId);
        
        // Get email from userData or storage
        const email = userData?.email || localStorage.getItem('email') || localStorage.getItem('userEmail');
        
        // Extract name parts from email if available (e.g., kuol.dimdeng@outlook.com -> Kuol Dimdeng)
        let firstName = userData?.first_name || userData?.firstName;
        let lastName = userData?.last_name || userData?.lastName;
        
        // If we don't have first/last name but have email, try to extract from email format
        if ((!firstName || !lastName) && email && email.includes('@')) {
          const namePart = email.split('@')[0];
          if (namePart.includes('.')) {
            const parts = namePart.split('.');
            if (parts.length >= 2) {
              // Capitalize first letter for better display
              const extractedFirst = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
              const extractedLast = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
              
              firstName = firstName || extractedFirst;
              lastName = lastName || extractedLast;
              
              logger.info('[AppBar] Extracted name from email format:', { 
                email, 
                extractedFirst, 
                extractedLast 
              });
            } else {
              // For emails without period separator (like kuoldimdeng@outlook.com)
              // Try to intelligently split the name if it looks like a combined name
              if (namePart.length > 3) {
                // Look for potential name patterns
                const match = namePart.match(/([a-z]+)([A-Z][a-z]+)/);
                if (match && match.length >= 3) {
                  // CamelCase pattern detected (e.g., kuolDimdeng)
                  const extractedFirst = match[1].charAt(0).toUpperCase() + match[1].slice(1);
                  const extractedLast = match[2];
                  
                  firstName = firstName || extractedFirst;
                  lastName = lastName || extractedLast;
                  
                  logger.info('[AppBar] Extracted name from camelCase email:', {
                    email,
                    extractedFirst,
                    extractedLast
                  });
                } else {
                  // For simple names without separators, use intelligent splitting
                  // This is a best effort approach for cases like "kuoldimdeng"
                  // For simplicity, we'll assume first name is first half, last name is second half
                  // More sophisticated approaches could use name dictionaries or ML
                  const midPoint = Math.floor(namePart.length / 2);
                  const extractedFirst = namePart.substring(0, midPoint).charAt(0).toUpperCase() + 
                                        namePart.substring(0, midPoint).slice(1).toLowerCase();
                  const extractedLast = namePart.substring(midPoint).charAt(0).toUpperCase() + 
                                        namePart.substring(midPoint).slice(1).toLowerCase();
                  
                  firstName = firstName || extractedFirst;
                  lastName = lastName || extractedLast;
                  
                  logger.info('[AppBar] Split combined email name:', {
                    email,
                    extractedFirst,
                    extractedLast
                  });
                }
              } else {
                // For very short email names, just use as first name
                firstName = firstName || (namePart.charAt(0).toUpperCase() + namePart.slice(1));
                
                logger.info('[AppBar] Using email name as first name:', {
                  email,
                  firstName
                });
              }
            }
          }
        }
        
        // If we have first/last name or email, use it for initials
        if (firstName || lastName || email) {
          let initials = '';
          
          if (firstName && lastName) {
            initials = `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
          } else if (firstName) {
            // Always try to get both initials, even if we only have first name
            initials = firstName.charAt(0).toUpperCase();
            // Try to get last initial from email or other sources
            if (email && email.includes('@')) {
              const namePart = email.split('@')[0];
              // Check if email contains both names (e.g., first.last@domain.com)
              if (namePart.includes('.') && !namePart.startsWith('.') && !namePart.endsWith('.')) {
                const parts = namePart.split('.');
                if (parts.length >= 2 && parts[1].length > 0) {
                  initials += parts[1].charAt(0).toUpperCase();
                }
              }
            }
          } else if (lastName) {
            initials = lastName.charAt(0).toUpperCase();
          } else if (email) {
            initials = email.charAt(0).toUpperCase();
            // Try to extract a second initial from email if possible
            if (email.includes('@')) {
              const namePart = email.split('@')[0];
              if (namePart.includes('.') && !namePart.startsWith('.') && !namePart.endsWith('.')) {
                const parts = namePart.split('.');
                if (parts.length >= 2) {
                  initials = `${parts[0].charAt(0).toUpperCase()}${parts[1].charAt(0).toUpperCase()}`;
                }
              }
            }
          }
          
          // Log when we set initials
          if (initials) {
            logger.debug('[AppBar] Setting initials from userData:', initials);
            setUserInitials(initials);
          }
        }
        
        // If no tenant ID found, try using saved business name as fallback
        if ((!effectiveTenantId || effectiveTenantId === "(not found)") && (cookieBusinessName || businessNameFromStorage)) {
          const businessName = cookieBusinessName || businessNameFromStorage;
          logger.debug('[AppBar] Found business name in alternate storage:', businessName);
          // Update profile data with business name even without tenant ID
          setProfileData(prevData => ({
            ...(prevData || {}),
            business_name: businessName,
            userData: {
              ...(prevData?.userData || {}),
              first_name: firstName || '',
              last_name: lastName || '',
              email: email || ''
            }
          }));
        }
        
        if (!effectiveTenantId || effectiveTenantId === "(not found)") {
          logger.debug('[AppBar] No tenant ID found - skipping record verification');
          return;
        }
        
        logger.debug('[AppBar] Fetching user profile with tenant ID:', effectiveTenantId);
        
        // Make API request to fetch profile data
        const authTokenHeader = localStorage.getItem('authToken') || 
                               cookies.authToken || 
                               cookies.idToken || 
                               (cookies.CognitoIdentityServiceProvider && 
                                cookies.CognitoIdentityServiceProvider.includes('idToken')) ?
                               { Authorization: `Bearer ${localStorage.getItem('authToken') || cookies.authToken || cookies.idToken}` } : {};
        
        const requestInfo = {
          url: `/api/user/profile?tenantId=${effectiveTenantId}`,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            ...authTokenHeader
          }
        };
        
        logger.debug('[AppBar] Making API request to:', requestInfo);
        const response = await fetch(requestInfo.url, { headers: requestInfo.headers });
        
        if (response.ok) {
          const profileData = await response.json();
          logger.debug('[AppBar] Fetched profile data with tenant ID:', profileData);
          
          // Log specifically what attributes we found for debugging
          logger.info('[AppBar] User profile attributes with tenant ID:', {
            firstName: profileData.firstName || profileData.first_name,
            lastName: profileData.lastName || profileData.last_name,
            email: profileData.email,
            businessName: profileData.businessName || profileData.business_name,
            subscriptionType: profileData.subscriptionType || profileData.subscription_type,
            tenantId: effectiveTenantId
          });
          
          if (profileData) {
            // Extract first and last name
            const firstName = profileData.firstName || profileData.first_name || profileData.given_name;
            const lastName = profileData.lastName || profileData.last_name || profileData.family_name;
            const profileEmail = profileData.email;
            
            // If missing name info but have email, try to extract from email format
            let extractedFirst = firstName;
            let extractedLast = lastName;
            
            if ((!extractedFirst || !extractedLast) && profileEmail && profileEmail.includes('@')) {
              const namePart = profileEmail.split('@')[0];
              if (namePart.includes('.')) {
                const parts = namePart.split('.');
                if (parts.length >= 2) {
                  // Capitalize first letter of each name part
                  if (!extractedFirst) {
                    extractedFirst = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
                  }
                  if (!extractedLast) {
                    extractedLast = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
                  }
                  logger.info('[AppBar] Extracted name from email in profile data:', { 
                    email: profileEmail, 
                    extractedFirst, 
                    extractedLast 
                  });
                }
              }
            }
            
            if (firstName || lastName || profileEmail || extractedFirst || extractedLast) {
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
                  if (namePart.includes('.') && !namePart.startsWith('.') && !namePart.endsWith('.')) {
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
                logger.info('[AppBar] Setting initials from tenant-specific profile:', initials);
              }
              
              // Also update the profile data
              setProfileData(prevData => ({
                ...(prevData || {}),
                userData: {
                  ...profileData,
                  first_name: firstName || extractedFirst || '',
                  last_name: lastName || extractedLast || '',
                  email: profileEmail || ''
                },
                business_name: profileData.businessName || profileData.business_name || '',
                subscription_type: profileData.subscriptionType || profileData.subscription_type || 'free',
                // Store the tenant ID for consistency checks
                tenant_id: effectiveTenantId
              }));
              
              // Update userData with real information, not mock data
              if (userData) {
                userData.first_name = firstName || extractedFirst || userData.first_name || '';
                userData.last_name = lastName || extractedLast || userData.last_name || '';
                userData.email = profileEmail || userData.email;
              }
            }
          }
        } else {
          logger.warn(`[AppBar] Failed to fetch user profile: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        logger.error('[AppBar] Error fetching tenant-specific user details:', error);
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
      const profileFirstName = profileData.userData.first_name || 
                               profileData.userData.firstName || 
                               profileData.userData.given_name;
      const profileLastName = profileData.userData.last_name ||
                              profileData.userData.lastName || 
                              profileData.userData.family_name;
      
      if (profileFirstName && profileLastName) {
        return `${profileFirstName.charAt(0).toUpperCase()}${profileLastName.charAt(0).toUpperCase()}`;
      } else if (profileFirstName) {
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
      const firstName = userData.first_name || userData.firstName || userData.given_name;
      const lastName = userData.last_name || userData.lastName || userData.family_name;
      
      if (firstName && lastName) {
        return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
      } else if (firstName) {
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
    return 'U';
  }, [userInitials, profileData, userData]);
  
  // Combine profile data with user data for display
  const effectiveUserData = useMemo(() => {
    return {
      ...(userData || {}),
      ...(profileData?.userData || {})
    };
  }, [userData, profileData]);
  
  // Determine which initials to display
  const displayInitials = userInitials || directInitials;
  
  // Log the final initials that will be displayed
  useEffect(() => {
    logger.info('[AppBar] Final initials display:', {
      displayInitials,
      userInitialsState: userInitials,
      calculatedInitials: directInitials,
      userData: userData ? {
        first_name: userData.first_name || userData.firstName || userData.given_name,
        last_name: userData.last_name || userData.lastName || userData.family_name
      } : 'No userData',
      profileData: profileData?.userData ? {
        first_name: profileData.userData.first_name || profileData.userData.firstName,
        last_name: profileData.userData.last_name || profileData.userData.lastName
      } : 'No profileData'
    });

    // Force both initials if we clearly have first and last name but only showing one initial
    if (displayInitials && displayInitials.length === 1) {
      const firstName = userData?.first_name || userData?.firstName || 
                       userData?.given_name || profileData?.userData?.first_name || 
                       profileData?.userData?.firstName || profileData?.userData?.given_name;
      
      const lastName = userData?.last_name || userData?.lastName || 
                      userData?.family_name || profileData?.userData?.last_name || 
                      profileData?.userData?.lastName || profileData?.userData?.family_name;
      
      if (firstName && lastName) {
        const newInitials = `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
        logger.info('[AppBar] Forcing both initials:', { from: displayInitials, to: newInitials });
        setUserInitials(newInitials);
      }
    }
  }, [displayInitials, userInitials, directInitials, userData, profileData]);

  // Tenant ID validation to ensure we're showing the right data
  const authenticatedTenantId = userData?.['custom:businessid'] || userData?.tenantId || userData?.businessId;
  const profileTenantId = profileData?.tenant_id;
  
  // If we have both tenant IDs and they don't match, log a warning
  if (authenticatedTenantId && profileTenantId && authenticatedTenantId !== profileTenantId) {
    logger.warn('[AppBar] Tenant ID mismatch:', {
      authenticated: authenticatedTenantId,
      profile: profileTenantId
    });
  }
  
  // Only use profile data if it's for the authenticated tenant
  const isValidProfileData = !authenticatedTenantId || !profileTenantId || authenticatedTenantId === profileTenantId;
  
  // Prioritize tenant-specific data for business name with added fallbacks
  const effectiveBusinessName = isValidProfileData && profileData?.business_name 
    ? profileData.business_name 
    : userData?.business_name || userData?.['custom:businessname'] || 
      (typeof window !== 'undefined' && localStorage.getItem('businessName')) || 
      'My Business';
  
  const effectiveSubscriptionType = isValidProfileData && profileData?.subscription_type 
    ? profileData.subscription_type 
    : userData?.subscription_type || userData?.['custom:subscription'] || 
      (typeof window !== 'undefined' && localStorage.getItem('subscriptionType')) || 
      'free';
  
  // Log the generated initials and input data for debugging
  logger.debug("[AppBar] Final initials calculation:", {
    displayInitials,
    userInitials,
    directInitials,
    isValidProfileData,
    userData: userData ? {
      first_name: userData?.first_name,
      last_name: userData?.last_name,
      email: userData?.email,
      tenantId: authenticatedTenantId
    } : 'No userData available',
    profileData: profileData ? {
      first_name: profileData?.userData?.first_name,
      last_name: profileData?.userData?.last_name,
      email: profileData?.userData?.email,
      business_name: profileData?.business_name,
      subscription_type: profileData?.subscription_type,
      tenant_id: profileTenantId
    } : 'No profileData available'
  });

  // Also log a tenant ID consistency check
  const tenant1 = userData?.tenantId || userData?.['custom:businessid'] || userData?.businessId;
  const tenant2 = profileData?.userData?.tenantId || profileData?.userData?.['custom:businessid'] || profileData?.userData?.businessId;
  
  logger.info("[AppBar] Tenant ID consistency check:", {
    fromUserData: tenant1 || '(not available)',
    fromProfileData: tenant2 || '(not available)',
    match: tenant1 && tenant2 ? (tenant1 === tenant2 ? 'Yes' : 'No') : 'Cannot compare (missing data)'
  });
  
  // For debugging, log what initials should be directly
  const fullName = `${userData?.first_name || ''} ${userData?.last_name || ''}`;
  logger.info("[AppBar] User full name:", fullName);
  
  // Double-check that we're using both initials if available
  if (userData?.first_name && userData?.last_name) {
    const expectedInitials = `${userData.first_name.charAt(0).toUpperCase()}${userData.last_name.charAt(0).toUpperCase()}`;
    logger.info('[AppBar] Expected initials from user full name:', expectedInitials);
    if (userInitials !== expectedInitials) {
      logger.warn('[AppBar] Initials mismatch:', { current: userInitials, expected: expectedInitials });
      // Force update of initials
      setUserInitials(expectedInitials);
    }
  } else if (profileData?.userData?.first_name && profileData?.userData?.last_name) {
    const expectedInitials = `${profileData.userData.first_name.charAt(0).toUpperCase()}${profileData.userData.last_name.charAt(0).toUpperCase()}`;
    logger.info('[AppBar] Expected initials from profile data:', expectedInitials);
    if (userInitials !== expectedInitials) {
      logger.warn('[AppBar] Initials mismatch:', { current: userInitials, expected: expectedInitials });
      // Force update of initials
      setUserInitials(expectedInitials);
    }
  }

  // Define getSubscriptionLabel function before using it
  const getSubscriptionLabel = (type) => {
    if (!type) return 'Free Plan';
    
    // Normalize the type to handle case variations
    const normalizedType = typeof type === 'string' ? type.toString().toLowerCase() : 'free';
    
    logger.info('Normalized subscription type:', normalizedType);
    
    // Enhanced matching to handle more variations
    if (normalizedType.includes('pro')) {
      return 'Professional Plan';
    } else if (normalizedType.includes('ent')) {
      return 'Enterprise Plan';
    } else {
      return 'Free Plan';
    }
  };
  
  const displayLabel = getSubscriptionLabel(effectiveSubscriptionType);
  
  const [subscriptionMenuOpen, setSubscriptionMenuOpen] = useState(false);
  const router = useRouter();

  const handleSubscriptionClick = () => {
    // Logic to navigate to subscription page
    router.push('/onboarding/subscription');
  };

  const handleShowNotification = (type) => {
    switch(type) {
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
          {effectiveUserData && (
            <div className="hidden md:flex items-center justify-between h-auto bg-primary-main text-white px-4 py-2 rounded">
              <div className="flex items-center justify-between">
                <span className="whitespace-nowrap text-white mr-2 font-medium">
                  {effectiveBusinessName}
                </span>
                <div
                  onClick={handleSubscriptionClick}
                  className={`flex items-center p-2 ml-2 cursor-pointer text-white rounded hover:shadow-md transition-shadow ${
                    effectiveSubscriptionType === 'professional' 
                      ? 'bg-purple-600'
                      : effectiveSubscriptionType === 'enterprise'
                      ? 'bg-indigo-600'
                      : 'bg-blue-600'
                  }`}
                >
                  <span className="whitespace-nowrap text-xs inline-block">
                    {displayLabel}
                  </span>
                  {effectiveSubscriptionType === 'free' && (
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
          
          {/* Notification button */}
          <button
            className="hidden sm:flex items-center justify-center p-2 text-white hover:bg-white/10 rounded-full mr-2"
            onClick={() => handleShowNotification('info')}
            title="Show Notification"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
          
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
            ref={profileButtonRef}
            onClick={handleClick}
            aria-controls={openMenu ? 'user-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={openMenu ? 'true' : undefined}
            className="flex items-center justify-center text-white hover:bg-white/10 p-0.5 rounded-full"
          >
            <Avatar 
              sx={{ 
                bgcolor: 'primary.main', 
                color: 'white',
                width: 32,
                height: 32,
                fontSize: '1rem'
              }}
            >
              {displayInitials || (() => {
                // Final fallback - calculate initials directly at render time
                const firstName = effectiveUserData?.first_name || effectiveUserData?.firstName || '';
                const lastName = effectiveUserData?.last_name || effectiveUserData?.lastName || '';
                
                if (firstName && lastName) {
                  return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
                } else if (firstName) {
                  return firstName.charAt(0).toUpperCase();
                } else if (lastName) {
                  return lastName.charAt(0).toUpperCase();
                } else if (effectiveUserData?.email) {
                  const email = effectiveUserData.email;
                  const namePart = email.split('@')[0];
                  if (namePart.includes('.')) {
                    const parts = namePart.split('.');
                    if (parts.length >= 2) {
                      return `${parts[0].charAt(0).toUpperCase()}${parts[1].charAt(0).toUpperCase()}`;
                    }
                  }
                  return email.charAt(0).toUpperCase();
                } else {
                  return 'User';
                }
              })()}
            </Avatar>
          </button>
          
          {/* User dropdown menu */}
          {openMenu && (
            <div 
              ref={userMenuRef}
              className="absolute top-16 right-4 w-64 bg-white rounded-lg shadow-lg border border-gray-200 mt-1 z-50"
              style={{ maxWidth: 'calc(100vw - 2rem)' }}
            >
              {effectiveUserData && (
                <div>
                  {/* Header with user info */}
                  <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                    <div className="flex items-center mb-2">
                      <div className="w-10 h-10 rounded-full bg-primary-main text-white border-2 border-white flex items-center justify-center text-base font-medium mr-3">
                        {displayInitials || (() => {
                          // Final fallback - calculate initials directly at render time
                          const firstName = effectiveUserData?.first_name || effectiveUserData?.firstName || '';
                          const lastName = effectiveUserData?.last_name || effectiveUserData?.lastName || '';
                          
                          if (firstName && lastName) {
                            return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
                          } else if (firstName) {
                            return firstName.charAt(0).toUpperCase();
                          } else if (lastName) {
                            return lastName.charAt(0).toUpperCase();
                          } else if (effectiveUserData?.email) {
                            const email = effectiveUserData.email;
                            const namePart = email.split('@')[0];
                            if (namePart.includes('.')) {
                              const parts = namePart.split('.');
                              if (parts.length >= 2) {
                                return `${parts[0].charAt(0).toUpperCase()}${parts[1].charAt(0).toUpperCase()}`;
                              }
                            }
                            return email.charAt(0).toUpperCase();
                          } else {
                            return 'User';
                          }
                        })()}
                      </div>
                      <div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold">
                            {/* Display full name when available */}
                            {(() => {
                              const firstName = effectiveUserData?.first_name || effectiveUserData?.firstName || '';
                              const lastName = effectiveUserData?.last_name || effectiveUserData?.lastName || '';
                              
                              if (firstName && lastName) {
                                return `${firstName} ${lastName}`;
                              } else if (firstName) {
                                return firstName;
                              } else if (lastName) {
                                return lastName;
                              } else if (effectiveUserData?.email) {
                                // If no name available, show the email
                                return effectiveUserData.email;
                              } else {
                                return 'User';
                              }
                            })()}
                          </span>
                          <span className="text-xs text-gray-500">
                            {/* Show the email as secondary text if we also have a name */}
                            {(() => {
                              const firstName = effectiveUserData?.first_name || effectiveUserData?.firstName;
                              const lastName = effectiveUserData?.last_name || effectiveUserData?.lastName;
                              
                              // Only show email as secondary if we have a name to show as primary
                              if ((firstName || lastName) && effectiveUserData?.email) {
                                return effectiveUserData.email;
                              }
                              
                              // Otherwise show business name if available
                              const businessName = profileData?.business_name || 
                                                  localStorage.getItem('businessName') ||
                                                  localStorage.getItem('businessname');
                              if (businessName) {
                                return businessName;
                              }
                              
                              // Fallback to subscription info
                              const subscription = profileData?.subscription_type || 
                                                 effectiveUserData?.subscription_type || 
                                                 effectiveUserData?.subscriptionType;
                              if (subscription) {
                                return `${subscription.charAt(0).toUpperCase()}${subscription.slice(1)} Plan`;
                              }
                              
                              return '';
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Subscription info */}
                    <div 
                      className={`flex items-center p-2 rounded mt-2 cursor-pointer ${
                        effectiveSubscriptionType === 'professional' 
                          ? 'bg-purple-600'
                          : effectiveSubscriptionType === 'enterprise'
                          ? 'bg-indigo-600' 
                          : 'bg-blue-600'
                      }`}
                      onClick={handleSubscriptionClick}
                    >
                      <span className="text-white text-sm flex-1">
                        {displayLabel}
                      </span>
                      {effectiveSubscriptionType === 'free' && (
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
                    
                    {profileData?.subscription_status && profileData.subscription_status !== 'ACTIVE' && (
                      <div className="mt-2 text-xs bg-yellow-100 text-yellow-800 p-2 rounded">
                        Subscription status: {profileData.subscription_status}
                      </div>
                    )}
                    {profileData?.business_name && (
                      <div className="mt-2 text-xs text-gray-700">
                        Business: {profileData.business_name}
                        {profileData?.business_type && ` (${profileData.business_type})`}
                      </div>
                    )}
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
                    <span className="text-sm text-primary-dark font-medium">My Account</span>
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
                    <span className="text-sm text-primary-dark font-medium">Settings</span>
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
                    <span className="text-sm text-primary-dark font-medium">Help Center</span>
                  </div>
                  
                  <div className="border-t border-gray-200">
                    <button
                      onClick={handleLogout}
                      className="w-full bg-red-600 hover:bg-red-700 text-white py-2 font-medium flex items-center justify-center rounded"
                    >
                      <svg className="w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign out {effectiveUserData?.email ? `(${effectiveUserData.email})` : ''}
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
