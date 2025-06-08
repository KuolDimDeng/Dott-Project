/**
 * auth0Hooks.js
 * 
 * This file provides wrapper functions around Auth0 hooks to make them compatible
 * with the previous Amplify-based authentication system.
 */

import { useAuth0 } from '@auth0/auth0-react';

export const useAuth0User = () => {
  const { user, isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();
  
  const getCurrentUser = async () => {
    if (!isAuthenticated) return null;
    return user;
  };
  
  const fetchUserAttributes = async () => {
    if (!isAuthenticated) return {};
    return {
      sub: user?.sub,
      email: user?.email,
      email_verified: user?.email_verified,
      name: user?.name,
      given_name: user?.given_name,
      family_name: user?.family_name,
      ...user
    };
  };
  
  const fetchAuthSession = async (options = {}) => {
    try {
      const accessToken = await getAccessTokenSilently();
      return {
        tokens: {
          accessToken: {
            toString: () => accessToken
          },
          idToken: {
            toString: () => user?.id_token || '',
            payload: user
          }
        }
      };
    } catch (error) {
      console.error('Error fetching Auth0 session:', error);
      return { tokens: null };
    }
  };
  
  return {
    getCurrentUser,
    fetchUserAttributes,
    fetchAuthSession,
    isAuthenticated,
    isLoading,
    user
  };
};
