import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import api from '../services/api';
import { userApi } from '../services/userApi';
import { phoneAuthService } from '../services/phoneAuthApi';
import walletService from '../services/walletService';
import ENV, { getSessionBaseUrl } from '../config/environment';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userMode, setUserMode] = useState('consumer'); // 'business' or 'consumer'
  const [sessionToken, setSessionToken] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  // Fetch complete user profile from backend
  const fetchUserProfile = async () => {
    try {
      console.log('🔄 === FETCH USER PROFILE START ===');
      const sessionId = await AsyncStorage.getItem('sessionId');
      console.log('Session ID for profile fetch:', sessionId);
      
      const response = await userApi.getCurrentUser();
      console.log('👤 === USER PROFILE RESPONSE ===');
      console.log('Full response:', JSON.stringify(response, null, 2));
      console.log('Response type:', typeof response);
      console.log('Response keys:', response ? Object.keys(response) : 'null response');
      
      // Handle different response formats
      let userData = null;
      if (response && response.success && response.data) {
        userData = response.data;
      } else if (response && response.id) {
        // Direct user object response
        userData = response;
      } else if (response && response.user) {
        // Wrapped user response
        userData = response.user;
      }
      
      if (userData && userData.id) {
        console.log('🔍 User ID:', userData.id);
        console.log('🔍 User email:', userData.email);
        console.log('🔍 User role:', userData.role);
        console.log('🔍 Has business:', userData.has_business);
        
        // Also extract business information from the response
        if (response.businessName || response.business_name || response.tenant?.name) {
          userData.business_name = response.businessName || response.business_name || response.tenant?.name;
          userData.business_type = response.businessType || response.business_type;
          userData.business_city = response.business_city || response.city;
          userData.business_country = response.business_country || response.country;
          userData.business_country_name = response.business_country_name || response.country_name;
          console.log('🏢 Business name added:', userData.business_name);
          console.log('🏢 Business type added:', userData.business_type);
        }
        
        // Update stored user data with complete profile
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        
        setUser(userData);
        
        // Initialize wallet after successful profile fetch
        try {
          await walletService.initializeWallet();
          console.log('💰 Wallet initialized successfully');
        } catch (walletError) {
          console.error('⚠️ Failed to initialize wallet:', walletError);
        }
        
        return userData;
      }
      
      console.log('⚠️ No valid user data found in response');
      return null;
    } catch (error) {
      console.error('❌ Error fetching user profile:', error);
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      return null;
    }
  };

  const loadUser = async () => {
    try {
      // Set a timeout to prevent infinite loading
      const loadTimeout = setTimeout(() => {
        console.log('⏰ Auth loading timeout, setting isLoading to false');
        setIsLoading(false);
      }, 10000); // 10 seconds timeout

      const userData = await AsyncStorage.getItem('userData');
      const mode = await AsyncStorage.getItem('userMode');
      const sessionId = await AsyncStorage.getItem('sessionId');
      const storedToken = await AsyncStorage.getItem('sessionToken');
      
      if (userData && sessionId) {
        const parsedUser = JSON.parse(userData);
        setSessionToken(storedToken || sessionId);
        
        // Check if cached data has required fields, if not, clear it
        if (!('has_business' in parsedUser) || !('role' in parsedUser)) {
          console.log('🔄 Cached user data is incomplete, clearing and fetching fresh data...');
          await AsyncStorage.removeItem('userData');
          // Try to fetch fresh profile
          const refreshedUser = await fetchUserProfile();
          if (!refreshedUser) {
            // If fetch fails, logout to force fresh login
            console.log('⚠️ Could not fetch complete user profile, forcing re-login');
            await logout();
          }
        } else {
          setUser(parsedUser);
          setUserMode(mode || 'consumer');
          
          // Try to refresh user profile if session exists
          const refreshedUser = await fetchUserProfile();
          if (!refreshedUser) {
            // If profile fetch fails but we have complete cached data, use it
            console.log('Using cached user data with has_business:', parsedUser.has_business);
          }
        }
      }
      
      clearTimeout(loadTimeout);
    } catch (error) {
      console.error('Load user error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password, token = null) => {
    try {
      let response;
      
      console.log('🔐 Login attempt:', { email, hasPassword: !!password, hasToken: !!token });
      
      if (token) {
        // Phone/OTP login with token
        console.log('📱 Attempting phone/OTP login');
        response = await api.post('/auth/session-v2', {
          token: token,
          type: 'mobile'
        });
      } else {
        // Email/password login - authenticate with Auth0 first
        console.log('📧 Attempting Auth0 authentication for:', email);
        
        // Step 1: Authenticate with Auth0 to get access token
        const auth0Response = await fetch(`https://${ENV.auth0Domain}/oauth/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            grant_type: 'password',
            username: email,
            password: password,
            client_id: ENV.auth0ClientId,
            audience: ENV.auth0Audience,
            scope: 'openid profile email offline_access'
          })
        });
        
        const auth0Data = await auth0Response.json();
        console.log('Auth0 response status:', auth0Response.status);
        
        if (!auth0Response.ok) {
          console.error('Auth0 error:', auth0Data);
          return { 
            success: false, 
            message: auth0Data.error_description || 'Invalid email or password' 
          };
        }
        
        console.log('✅ Auth0 authentication successful, creating backend session...');
        console.log('Access token received:', auth0Data.access_token?.substring(0, 20) + '...');
        
        // Step 2: Create session on backend using Auth0 access token
        const publicApi = axios.create({
          baseURL: getSessionBaseUrl(),
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${auth0Data.access_token}`,
            // Cloudflare headers
            'Origin': 'https://app.dottapps.com',
            'User-Agent': 'DottAppNative/1.0',
            // Bypass Cloudflare cache for auth requests
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          // Important for Cloudflare
          withCredentials: false // Mobile apps don't need cookies
        });
        
        console.log('🔵 === SESSION CREATION START ===');
        console.log('Creating session at:', publicApi.defaults.baseURL + '/api/sessions/create/');
        console.log('Auth0 token being sent:', auth0Data.access_token.substring(0, 20) + '...');
        
        try {
          response = await publicApi.post('/api/sessions/create/', {
            // Send empty body - backend will create session from Auth0 token
          });
        } catch (sessionError) {
          console.error('🔴 Session creation failed:', sessionError.response?.data || sessionError.message);
          console.error('Session error status:', sessionError.response?.status);
          throw sessionError;
        }
        
        console.log('🟢 === SESSION CREATION RESPONSE ===');
        console.log('Full response data:', JSON.stringify(response.data, null, 2));
        console.log('Response keys:', Object.keys(response.data));
        console.log('Session ID:', response.data?.session_id || response.data?.session_token);
        console.log('Has user object:', !!response.data?.user);
        
        if (response.data?.user) {
          console.log('🔍 User object keys:', Object.keys(response.data.user));
          console.log('🔍 User ID:', response.data.user.id);
          console.log('🔍 User email:', response.data.user.email);
          console.log('🔍 Has business field exists:', 'has_business' in response.data.user);
          console.log('🔍 Has business value:', response.data.user.has_business);
          console.log('🔍 Role field exists:', 'role' in response.data.user);
          console.log('🔍 Role value:', response.data.user.role);
        } else {
          console.log('⚠️ No user object in response');
        }
        console.log('🔵 === SESSION CREATION END ===');
        
        // Transform response to match expected format
        if (response.data.session_token) {
          response.data.session_id = response.data.session_token;
          response.data.success = true;
        }
        
        // Extract business information from session response
        if (response.data.businessName || response.data.business_name || response.data.tenant?.name) {
          console.log('🏢 Business info in session response:', {
            businessName: response.data.businessName || response.data.business_name || response.data.tenant?.name,
            businessType: response.data.businessType || response.data.business_type,
            tenant: response.data.tenant
          });
        }
      }
      
      console.log('✅ Login response:', response.data);
      
      if (response.data.success) {
        const sessionId = response.data.session_id || response.data.sid;
        
        if (sessionId) {
          await AsyncStorage.setItem('sessionId', sessionId);
          await AsyncStorage.setItem('sessionToken', sessionId);
          setSessionToken(sessionId);
        }
        
        // Fetch complete user profile with role and has_business
        console.log('🔄 Fetching complete user profile after login...');
        const completeUserData = await fetchUserProfile();
        
        if (completeUserData) {
          // Use complete profile data
          const mode = completeUserData.has_business ? 'business' : 'consumer';
          
          // Initialize wallet after successful login
          try {
            await walletService.initializeWallet();
            console.log('💰 Wallet initialized after login');
          } catch (walletError) {
            console.error('⚠️ Failed to initialize wallet after login:', walletError);
          }
          
          return { success: true, mode };
        } else {
          // Fallback to session response data
          const userData = response.data.user || response.data.data?.user;
          
          // Add business information from response
          if (response.data.businessName || response.data.business_name || response.data.tenant?.name) {
            userData.business_name = response.data.businessName || response.data.business_name || response.data.tenant?.name;
            userData.business_type = response.data.businessType || response.data.business_type;
            userData.business_city = response.data.business_city || response.data.city;
            userData.business_country = response.data.business_country || response.data.country;
            userData.business_country_name = response.data.business_country_name || response.data.country_name;
          }
          
          await AsyncStorage.setItem('userData', JSON.stringify(userData));
          
          const mode = userData.has_business ? 'business' : 'consumer';
          await AsyncStorage.setItem('userMode', mode);
          
          setUser(userData);
          setUserMode(mode);
          
          return { success: true, mode };
        }
      }
      return { success: false, message: response.data.message || 'Invalid credentials' };
    } catch (error) {
      console.error('❌ Login error:', error);
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        baseURL: error.config?.baseURL
      });
      const errorMessage = error.response?.data?.message || error.response?.data?.detail || 'Authentication failed. Please try again.';
      
      // Special handling for staging environment issuer errors
      if (errorMessage.includes('Invalid issuer')) {
        return { 
          success: false, 
          message: 'Server configuration is being updated. Please try again in a few minutes or contact support.' 
        };
      }
      
      return { success: false, message: errorMessage };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove(['userToken', 'userData', 'userMode', 'sessionId', 'sessionToken']);
      setUser(null);
      setUserMode('consumer');
      setSessionToken(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await fetchUserProfile();
      if (userData) {
        setUser(userData);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error refreshing user:', error);
      return false;
    }
  };

  const switchMode = async (mode) => {
    await AsyncStorage.setItem('userMode', mode);
    setUserMode(mode);
  };

  // Phone Authentication Methods
  const sendOTP = async (phoneNumber) => {
    try {
      console.log('📱 Sending OTP to:', phoneNumber);
      const result = await phoneAuthService.sendOTP(phoneNumber);
      
      if (result.success) {
        console.log('✅ OTP sent successfully');
        return { 
          success: true, 
          message: result.message,
          expires_in: result.expires_in 
        };
      } else {
        console.error('❌ Failed to send OTP:', result.message);
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('❌ OTP send error:', error);
      return { 
        success: false, 
        message: 'Failed to send verification code. Please try again.' 
      };
    }
  };

  const verifyOTP = async (phoneNumber, otpCode) => {
    try {
      console.log('📱 Verifying OTP for:', phoneNumber);
      const result = await phoneAuthService.verifyOTP(phoneNumber, otpCode);
      
      if (result.success && result.data) {
        console.log('✅ OTP verified successfully');
        
        // Store session token
        const sessionId = result.data.token;
        if (sessionId) {
          await AsyncStorage.setItem('sessionId', sessionId);
          await AsyncStorage.setItem('sessionToken', sessionId);
          setSessionToken(sessionId);
          console.log('💾 Session token stored');
        }
        
        // Store user data with business information
        const userData = result.data.user;
        // Add business information if available
        if (result.data.businessName || result.data.business_name) {
          userData.business_name = result.data.businessName || result.data.business_name;
          userData.business_type = result.data.businessType || result.data.business_type;
        }
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        
        // Set user mode based on onboarding status
        const mode = userData.has_business ? 'business' : 'consumer';
        await AsyncStorage.setItem('userMode', mode);
        
        // Update state
        setUser(userData);
        setUserMode(mode);
        
        console.log('👤 User authenticated:', {
          email: userData.email,
          phone: userData.phone_number,
          mode: mode,
          onboarding_completed: userData.onboarding_completed
        });
        
        return { 
          success: true, 
          message: result.message,
          user: userData,
          requires_onboarding: result.data.requires_onboarding
        };
      } else {
        console.error('❌ OTP verification failed:', result.message);
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('❌ OTP verification error:', error);
      return { 
        success: false, 
        message: 'Verification failed. Please try again.' 
      };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      userMode,
      isLoading,
      sessionToken,
      login,
      logout,
      switchMode,
      fetchUserProfile,
      refreshUser,
      sendOTP,
      verifyOTP,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);