import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const CurrencyContext = createContext();

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    return {
      currency: {
        code: 'USD',
        name: 'US Dollar',
        symbol: '$'
      },
      updateCurrency: () => {},
      refreshCurrency: () => {},
      isLoading: false
    };
  }
  return context;
};

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrency] = useState({
    code: 'USD',
    name: 'US Dollar',
    symbol: '$'
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCurrency();
  }, []);

  const loadCurrency = async () => {
    console.log('💰 [CurrencyContext] Loading currency preference...');
    
    try {
      // Try to load from AsyncStorage first for offline support
      const cachedCurrency = await AsyncStorage.getItem('user_currency');
      if (cachedCurrency) {
        const parsed = JSON.parse(cachedCurrency);
        setCurrency(parsed);
        console.log('💰 [CurrencyContext] Loaded from cache:', parsed);
      }

      // Then fetch from API to get latest
      const response = await api.get('/api/users/profile/');
      if (response.data) {
        const newCurrency = {
          code: response.data.preferred_currency_code || 'USD',
          name: response.data.preferred_currency_name || 'US Dollar',
          symbol: response.data.preferred_currency_symbol || '$'
        };
        
        setCurrency(newCurrency);
        await AsyncStorage.setItem('user_currency', JSON.stringify(newCurrency));
        console.log('💰 [CurrencyContext] Updated from API:', newCurrency);
      }
    } catch (error) {
      console.error('💰 [CurrencyContext] Error loading currency:', error);
      // Keep default or cached currency
    } finally {
      setIsLoading(false);
    }
  };

  const updateCurrency = async (newCurrency) => {
    try {
      setIsLoading(true);
      
      // Update in backend
      const response = await api.patch('/api/users/profile/', {
        preferred_currency_code: newCurrency.code,
        preferred_currency_name: newCurrency.name,
        preferred_currency_symbol: newCurrency.symbol
      });
      
      if (response.data) {
        setCurrency(newCurrency);
        await AsyncStorage.setItem('user_currency', JSON.stringify(newCurrency));
        console.log('💰 [CurrencyContext] Currency updated:', newCurrency);
      }
    } catch (error) {
      console.error('💰 [CurrencyContext] Error updating currency:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCurrency = () => {
    loadCurrency();
  };

  const formatAmount = (amount) => {
    // Format amount with currency symbol
    return `${currency.symbol}${parseFloat(amount).toFixed(2)}`;
  };

  const value = {
    currency,
    updateCurrency,
    refreshCurrency,
    formatAmount,
    isLoading
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

export default CurrencyContext;