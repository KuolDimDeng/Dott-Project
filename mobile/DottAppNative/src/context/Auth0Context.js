import React, { createContext, useState, useContext, useEffect } from 'react';
import Auth0 from 'react-native-auth0';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { AUTH0_CONFIG, API_CONFIG } from '../config/auth0';

// Initialize Auth0
const auth0 = new Auth0({
  domain: AUTH0_CONFIG.domain,
  clientId: AUTH0_CONFIG.clientId,
});

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userMode, setUserMode] = useState('consumer');
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('userData');
      const storedSession = await AsyncStorage.getItem('sessionId');
      const mode = await AsyncStorage.getItem('userMode');
      
      if (storedUser && storedSession) {
        setUser(JSON.parse(storedUser));
        setSessionId(storedSession);
        setUserMode(mode || 'consumer');
      }
    } catch (error) {
      console.error('Load user error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async () => {
    try {
      console.log('🔐 Starting Auth0 login with PKCE...');
      
      // Use Auth0's built-in login with PKCE
      // This opens a secure browser window for authentication
      const credentials = await auth0.webAuth.authorize({
        scope: AUTH0_CONFIG.scope,
        audience: AUTH0_CONFIG.audience,
        customScheme: AUTH0_CONFIG.customScheme,
      });
      
      console.log('✅ Auth0 authentication successful');
      console.log('Access token received:', credentials.accessToken?.substring(0, 20) + '...');
      
      // Get user info from Auth0
      const userInfo = await auth0.auth.userInfo({ token: credentials.accessToken });
      console.log('User info:', userInfo);
      
      // Create session on backend
      const sessionResponse = await createBackendSession(credentials.accessToken);
      
      if (sessionResponse.success) {
        // Store user data and session
        await AsyncStorage.setItem('userData', JSON.stringify(sessionResponse.user));
        await AsyncStorage.setItem('sessionId', sessionResponse.sessionId);
        await AsyncStorage.setItem('accessToken', credentials.accessToken);
        await AsyncStorage.setItem('refreshToken', credentials.refreshToken || '');
        
        const mode = sessionResponse.user.has_business ? 'business' : 'consumer';
        await AsyncStorage.setItem('userMode', mode);
        
        setUser(sessionResponse.user);
        setSessionId(sessionResponse.sessionId);
        setUserMode(mode);
        
        return { success: true, mode };
      }
      
      return { success: false, message: 'Failed to create session' };
    } catch (error) {
      console.error('❌ Login error:', error);
      return { 
        success: false, 
        message: error.message || 'Authentication failed' 
      };
    }
  };

  const loginWithPassword = async (email, password) => {
    try {
      console.log('🔐 Starting password authentication...');
      
      // For password login, use the password-realm grant
      // This is still secure when properly configured
      const credentials = await auth0.auth.passwordRealm({
        username: email,
        password: password,
        realm: 'Username-Password-Authentication',
        scope: AUTH0_CONFIG.scope,
        audience: AUTH0_CONFIG.audience,
      });
      
      console.log('✅ Password authentication successful');
      
      // Create session on backend
      const sessionResponse = await createBackendSession(credentials.accessToken);
      
      if (sessionResponse.success) {
        // Store user data and session
        await AsyncStorage.setItem('userData', JSON.stringify(sessionResponse.user));
        await AsyncStorage.setItem('sessionId', sessionResponse.sessionId);
        await AsyncStorage.setItem('accessToken', credentials.accessToken);
        await AsyncStorage.setItem('refreshToken', credentials.refreshToken || '');
        
        const mode = sessionResponse.user.has_business ? 'business' : 'consumer';
        await AsyncStorage.setItem('userMode', mode);
        
        setUser(sessionResponse.user);
        setSessionId(sessionResponse.sessionId);
        setUserMode(mode);
        
        return { success: true, mode };
      }
      
      return { success: false, message: 'Failed to create session' };
    } catch (error) {
      console.error('❌ Password login error:', error);
      return { 
        success: false, 
        message: error.error_description || error.message || 'Invalid credentials' 
      };
    }
  };

  const createBackendSession = async (accessToken) => {
    try {
      console.log('📡 Creating backend session...');
      
      const response = await axios.post(
        `${API_CONFIG.baseURL}${API_CONFIG.sessionEndpoint}`,
        {}, // Empty body - backend creates session from token
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          }
        }
      );
      
      console.log('Backend session created:', response.data);
      
      return {
        success: true,
        user: response.data.user || response.data.data?.user,
        sessionId: response.data.session_token || response.data.session_id || response.data.sid,
      };
    } catch (error) {
      console.error('Backend session error:', error.response?.data || error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Session creation failed'
      };
    }
  };

  const refreshToken = async () => {
    try {
      const storedRefreshToken = await AsyncStorage.getItem('refreshToken');
      if (!storedRefreshToken) {
        throw new Error('No refresh token available');
      }
      
      const credentials = await auth0.auth.refreshToken({
        refreshToken: storedRefreshToken,
        scope: AUTH0_CONFIG.scope,
      });
      
      await AsyncStorage.setItem('accessToken', credentials.accessToken);
      if (credentials.refreshToken) {
        await AsyncStorage.setItem('refreshToken', credentials.refreshToken);
      }
      
      return credentials.accessToken;
    } catch (error) {
      console.error('Token refresh error:', error);
      // If refresh fails, user needs to login again
      await logout();
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Clear Auth0 session
      await auth0.webAuth.clearSession({
        customScheme: AUTH0_CONFIG.customScheme,
      });
      
      // Clear local storage
      await AsyncStorage.multiRemove([
        'userData',
        'sessionId',
        'accessToken',
        'refreshToken',
        'userMode'
      ]);
      
      setUser(null);
      setSessionId(null);
      setUserMode('consumer');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if Auth0 logout fails, clear local data
      await AsyncStorage.multiRemove([
        'userData',
        'sessionId',
        'accessToken',
        'refreshToken',
        'userMode'
      ]);
      
      setUser(null);
      setSessionId(null);
      setUserMode('consumer');
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
      sessionId,
      login,
      loginWithPassword,
      logout,
      refreshToken,
      switchMode,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);