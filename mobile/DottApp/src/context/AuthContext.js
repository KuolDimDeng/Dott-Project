import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      
      if (response.data.success) {
        const userData = response.data.data.user;
        const token = response.data.data.token;
        
        await AsyncStorage.setItem('userToken', token);
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        
        // Set mode based on business status
        const mode = userData.has_business ? 'business' : 'consumer';
        await AsyncStorage.setItem('userMode', mode);
        
        setUser(userData);
        setUserMode(mode);
        
        return { success: true, mode };
      }
      return { success: false, message: response.data.message };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Login failed' };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove(['userToken', 'userData', 'userMode']);
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