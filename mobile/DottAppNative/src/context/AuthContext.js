import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import api from '../services/api';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userMode, setUserMode] = useState('consumer'); // 'business' or 'consumer'

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      const mode = await AsyncStorage.getItem('userMode');
      if (userData) {
        setUser(JSON.parse(userData));
        setUserMode(mode || 'consumer');
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
        // Using custom domain for Auth0
        const auth0Response = await fetch('https://auth.dottapps.com/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            grant_type: 'password',
            username: email,
            password: password,
            client_id: 'vltTnrxcC2ZMjlFel04Xeo7PlufLMEiG', // Native app client ID with Password grant enabled
            audience: 'https://api.dottapps.com',
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
          baseURL: 'https://api.dottapps.com',
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
        
        console.log('Creating session at:', publicApi.defaults.baseURL + '/api/sessions/create/');
        
        response = await publicApi.post('/api/sessions/create/', {
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
        const userData = response.data.user || response.data.data?.user;
        const sessionId = response.data.session_id || response.data.sid;
        
        if (sessionId) {
          await AsyncStorage.setItem('sessionId', sessionId);
        }
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        
        // Set mode based on business status
        const mode = userData.has_business ? 'business' : 'consumer';
        await AsyncStorage.setItem('userMode', mode);
        
        setUser(userData);
        setUserMode(mode);
        
        return { success: true, mode };
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
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);