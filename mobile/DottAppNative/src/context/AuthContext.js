import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import api from '../services/api';
import { userApi } from '../services/userApi';
import ENV, { getSessionBaseUrl } from '../config/environment';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userMode, setUserMode] = useState('consumer'); // 'business' or 'consumer'

  useEffect(() => {
    loadUser();
  }, []);

  // Fetch complete user profile from backend
  const fetchUserProfile = async () => {
    try {
      console.log('🔄 Fetching complete user profile...');
      const response = await userApi.getCurrentUser();
      console.log('👤 Complete user profile response:', JSON.stringify(response, null, 2));
      
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
        
        // Update stored user data with complete profile
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        
        // Set mode based on business status
        const mode = userData.has_business ? 'business' : 'consumer';
        await AsyncStorage.setItem('userMode', mode);
        
        setUser(userData);
        setUserMode(mode);
        
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
      const userData = await AsyncStorage.getItem('userData');
      const mode = await AsyncStorage.getItem('userMode');
      const sessionId = await AsyncStorage.getItem('sessionId');
      
      if (userData && sessionId) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setUserMode(mode || 'consumer');
        
        // Try to refresh user profile if session exists
        const refreshedUser = await fetchUserProfile();
        if (!refreshedUser) {
          // If profile fetch fails but we have cached data, use it
          console.log('Using cached user data');
        }
      }
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
        
        console.log('Creating session at:', publicApi.defaults.baseURL + '/api/auth/session-v2');
        
        response = await publicApi.post('/api/auth/session-v2', {
          // Send empty body - backend will create session from Auth0 token
        });
        
        console.log('Backend session response:', response.data);
        console.log('🔍 DEBUG - User data received:', JSON.stringify(response.data.user, null, 2));
        console.log('🔍 DEBUG - Has business field:', response.data.user?.has_business);
        console.log('🔍 DEBUG - User role:', response.data.user?.role);
        
        // Transform response to match expected format
        if (response.data.session_token) {
          response.data.session_id = response.data.session_token;
          response.data.success = true;
        }
      }
      
      console.log('✅ Login response:', response.data);
      
      if (response.data.success) {
        const sessionId = response.data.session_id || response.data.sid;
        
        if (sessionId) {
          await AsyncStorage.setItem('sessionId', sessionId);
        }
        
        // Fetch complete user profile with role and has_business
        console.log('🔄 Fetching complete user profile after login...');
        const completeUserData = await fetchUserProfile();
        
        if (completeUserData) {
          // Use complete profile data
          const mode = completeUserData.has_business ? 'business' : 'consumer';
          return { success: true, mode };
        } else {
          // Fallback to session response data
          const userData = response.data.user || response.data.data?.user;
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
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const switchMode = async (mode) => {
    await AsyncStorage.setItem('userMode', mode);
    setUserMode(mode);
  };

  return (
    <AuthContext.Provider value={{
      user,
      userMode,
      isLoading,
      login,
      logout,
      switchMode,
      fetchUserProfile,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);