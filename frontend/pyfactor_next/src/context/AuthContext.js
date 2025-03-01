'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, signIn, signOut, fetchUserAttributes, updateUserAttributes, fetchAuthSession } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { persistenceService, STORAGE_KEYS } from '@/services/persistenceService';
import { logger } from '@/utils/logger';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser && mounted) {
          // Get session tokens and attributes
          const { tokens } = await fetchAuthSession();
          const attributes = await fetchUserAttributes();
          const userData = { ...currentUser, ...attributes };
          
          // Set auth cookies
          if (tokens?.idToken?.toString()) {
            document.cookie = `idToken=${tokens.idToken.toString()}; path=/`;
          }
          if (tokens?.accessToken?.toString()) {
            document.cookie = `accessToken=${tokens.accessToken.toString()}; path=/`;
          }
          
          // Get onboarding status and set cookie
          const onboardingStatus = attributes.onboardingStatus || attributes['custom:onboarding'] || 'NOT_STARTED';
          document.cookie = `onboardingStep=${onboardingStatus.toLowerCase().replace('_', '-')}; path=/`;
          
          // Get persisted onboarding data
          const onboardingData = await persistenceService.getData(STORAGE_KEYS.ONBOARDING_DATA);
          
          // If we have persisted data and it's newer than Cognito, sync back to Cognito
          if (onboardingData?.timestamp > Number(attributes['custom:lastUpdated'] || 0)) {
            await updateUserAttributes({
              userAttributes: {
                'custom:onboarding': onboardingData.currentStep,
                'custom:lastUpdated': onboardingData.timestamp.toString()
              }
            });
            userData['custom:onboarding'] = onboardingData.currentStep;
          }
          
          setUser(userData);
        }
      } catch (error) {
        logger.error('Auth check error:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    const handleAuthChange = async ({ payload: { event, data } }) => {
      try {
        switch (event) {
          case 'signedIn':
            await checkAuth();
            break;
          case 'signedOut':
            setUser(null);
            // Clear cookies
            document.cookie = 'idToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            document.cookie = 'onboardingStep=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            // Clear persisted data on sign out
            persistenceService.clearData(STORAGE_KEYS.ONBOARDING_DATA);
            break;
          case 'tokenRefresh':
            // Get new session tokens
            const { tokens } = await fetchAuthSession();
            // Update cookies with new tokens
            if (tokens?.idToken?.toString()) {
              document.cookie = `idToken=${tokens.idToken.toString()}; path=/`;
            }
            if (tokens?.accessToken?.toString()) {
              document.cookie = `accessToken=${tokens.accessToken.toString()}; path=/`;
            }
            logger.debug('Tokens refreshed successfully');
            break;
        }
      } catch (error) {
        logger.error('Auth event handling error:', error);
      }
    };

    const unsubscribe = Hub.listen('auth', handleAuthChange);
    checkAuth();

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const value = {
    user,
    loading,
    login: async (credentials) => {
      const { username, password } = credentials;
      await signIn({ username, password });
    },
    logout: async () => {
      await signOut();
    },
    updateAttributes: async (attributes) => {
      if (user) {
        try {
          // Extract essential attributes for Cognito
          const cognitoAttributes = {
            'custom:onboarding': attributes['custom:onboarding'],
            'custom:subplan': attributes['custom:subplan'],
            'custom:setupdone': attributes['custom:setupdone'],
            'custom:lastUpdated': Date.now().toString()
          };

          // Update Cognito with essential attributes
          await updateUserAttributes({
            userAttributes: cognitoAttributes
          });

          // Store detailed data in persistence layer
          if (attributes.businessInfo) {
            await persistenceService.saveData(
              STORAGE_KEYS.BUSINESS_INFO_DRAFT,
              attributes.businessInfo
            );
          }

          if (attributes.subscription) {
            await persistenceService.saveSubscriptionData(
              attributes.subscription
            );
          }

          if (attributes.payment) {
            await persistenceService.saveData(
              STORAGE_KEYS.PAYMENT_DATA,
              attributes.payment
            );
          }

          // Save current step in onboarding data and update cookie
          if (attributes['custom:onboarding']) {
            const onboardingStep = attributes['custom:onboarding'];
            await persistenceService.saveData(STORAGE_KEYS.ONBOARDING_DATA, {
              currentStep: onboardingStep,
              timestamp: Date.now()
            });
            document.cookie = `onboardingStep=${onboardingStep.toLowerCase().replace('_', '-')}; path=/`;
          }

          // Refresh user state
          const newAttributes = await fetchUserAttributes();
          const businessInfo = await persistenceService.getData(STORAGE_KEYS.BUSINESS_INFO_DRAFT);
          const subscription = await persistenceService.getData(STORAGE_KEYS.SUBSCRIPTION_DATA);
          const payment = await persistenceService.getData(STORAGE_KEYS.PAYMENT_DATA);

          setUser(prev => ({
            ...prev,
            ...newAttributes,
            businessInfo,
            subscription,
            payment
          }));
        } catch (error) {
          logger.error('Failed to update attributes:', error);
          throw error;
        }
      }
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}