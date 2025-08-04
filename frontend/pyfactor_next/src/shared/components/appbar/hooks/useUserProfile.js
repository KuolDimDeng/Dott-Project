'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCookie, getBusinessNameFromCookies } from '../utils/cookieHelpers';

/**
 * useUserProfile - Hook for managing user profile data
 * Handles initials generation and profile updates
 */
export const useUserProfile = (userData, propProfileData) => {
  const [profileData, setProfileData] = useState(propProfileData || null);
  const [userInitials, setUserInitials] = useState('');

  // Generate initials from user data
  const generateInitials = useCallback((firstName, lastName, email) => {
    if (!firstName && !lastName && !email) return '';

    if (firstName && lastName) {
      return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
    } else if (firstName) {
      // Try to extract second initial from email
      if (email && email.includes('@')) {
        const emailName = email.split('@')[0];
        if (emailName.includes('.')) {
          const emailParts = emailName.split('.');
          if (emailParts.length >= 2 && emailParts[1].length > 0) {
            return `${firstName.charAt(0).toUpperCase()}${emailParts[1].charAt(0).toUpperCase()}`;
          }
        }
      }
      return firstName.substring(0, 2).toUpperCase();
    } else if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    
    return '??';
  }, []);

  // Update profile data
  useEffect(() => {
    if (userData) {
      setProfileData(userData);
      
      const initials = generateInitials(
        userData.first_name,
        userData.last_name,
        userData.email
      );
      
      setUserInitials(initials);
    }
  }, [userData, generateInitials]);

  // Get business name
  const businessName = getBusinessNameFromCookies() || profileData?.business_name || '';

  return {
    profileData,
    userInitials,
    businessName,
    setProfileData
  };
};
