import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { CURRENCIES } from '../utils/currencyUtils';

const CurrencyContext = createContext();

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    console.log('💰 [useCurrency] WARNING: No CurrencyContext found, returning defaults');
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
  console.log('💰 [useCurrency] Context found, currency:', context.currency);
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
    console.log('💰 [CurrencyContext] === CURRENCY LOAD START ===');
    console.log('💰 [CurrencyContext] Initial state:', { currency, isLoading });
    
    try {
      // Try to load from AsyncStorage first for offline support
      console.log('💰 [CurrencyContext] Checking AsyncStorage for cached currency...');
      const cachedCurrency = await AsyncStorage.getItem('user_currency');
      if (cachedCurrency) {
        const parsed = JSON.parse(cachedCurrency);
        // Update symbol from CURRENCIES mapping if available
        if (parsed.code && CURRENCIES[parsed.code]) {
          parsed.symbol = CURRENCIES[parsed.code].symbol;
        }
        console.log('💰 [CurrencyContext] ✅ Found cached currency:', parsed);
        setCurrency(parsed);
      } else {
        console.log('💰 [CurrencyContext] ⚠️ No cached currency found');
      }

      // Then fetch from API to get latest
      console.log('💰 [CurrencyContext] Fetching from API: /users/me/');
      const response = await api.get('/users/me/');
      
      console.log('💰 [CurrencyContext] API Response received');
      console.log('💰 [CurrencyContext] Response data keys:', Object.keys(response.data || {}));
      console.log('💰 [CurrencyContext] Currency fields in response:');
      console.log('  - preferred_currency_code:', response.data?.preferred_currency_code);
      console.log('  - preferred_currency_name:', response.data?.preferred_currency_name);
      console.log('  - preferred_currency_symbol:', response.data?.preferred_currency_symbol);
      console.log('  - country:', response.data?.country);
      console.log('  - country_name:', response.data?.country_name);
      
      if (response.data) {
        const currencyCode = response.data.preferred_currency_code || 'USD';
        
        // Use proper symbol from CURRENCIES mapping if available
        const currencyData = CURRENCIES[currencyCode];
        const newCurrency = {
          code: currencyCode,
          name: response.data.preferred_currency_name || currencyData?.name || 'US Dollar',
          symbol: currencyData?.symbol || response.data.preferred_currency_symbol || '$'
        };
        
        console.log('💰 [CurrencyContext] Constructed currency object:', newCurrency);
        console.log('💰 [CurrencyContext] Using defaults?', {
          code: !response.data.preferred_currency_code,
          name: !response.data.preferred_currency_name,
          symbol: !response.data.preferred_currency_symbol
        });
        
        setCurrency(newCurrency);
        await AsyncStorage.setItem('user_currency', JSON.stringify(newCurrency));
        console.log('💰 [CurrencyContext] ✅ Currency updated and cached');
      } else {
        console.log('💰 [CurrencyContext] ⚠️ No data in API response');
      }
    } catch (error) {
      console.error('💰 [CurrencyContext] ❌ Error loading currency:', error);
      console.error('💰 [CurrencyContext] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      // Keep default or cached currency
    } finally {
      setIsLoading(false);
      console.log('💰 [CurrencyContext] === CURRENCY LOAD END ===');
      console.log('💰 [CurrencyContext] Final currency state:', currency);
    }
  };

  const updateCurrency = async (newCurrency) => {
    try {
      setIsLoading(true);
      
      // Update in backend
      const response = await api.patch('/users/me/', {
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