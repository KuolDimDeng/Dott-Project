import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { CURRENCIES, COUNTRY_CURRENCY_MAP } from '../utils/currencyUtils';

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
      const isExplicitlySet = await AsyncStorage.getItem('user_currency_explicit');
      
      if (cachedCurrency) {
        const parsed = JSON.parse(cachedCurrency);
        // Update symbol from CURRENCIES mapping if available
        if (parsed.code && CURRENCIES[parsed.code]) {
          parsed.symbol = CURRENCIES[parsed.code].symbol;
        }
        console.log('💰 [CurrencyContext] ✅ Found cached currency:', parsed);
        console.log('💰 [CurrencyContext] Explicitly set?', isExplicitlySet === 'true');
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
        const country = response.data.country;
        const apiCurrencyCode = response.data.preferred_currency_code;
        
        // Check if user has explicitly set a preference locally
        const isExplicitlySet = await AsyncStorage.getItem('user_currency_explicit');
        
        let currencyCode;
        if (isExplicitlySet === 'true' && cachedCurrency) {
          // User has explicitly set a preference, respect it
          const parsed = JSON.parse(cachedCurrency);
          currencyCode = parsed.code;
          console.log('💰 [CurrencyContext] Using explicitly set currency preference:', currencyCode);
        } else {
          // Check if this is likely a default USD that should be overridden
          // If the country has its own currency but API returns USD, use country currency
          const countryDefaultCurrency = COUNTRY_CURRENCY_MAP[country];
          const isLikelyDefault = apiCurrencyCode === 'USD' && 
                                 countryDefaultCurrency && 
                                 countryDefaultCurrency !== 'USD';
          
          if (isLikelyDefault) {
            // API returned USD but country has its own currency, use country default
            currencyCode = countryDefaultCurrency;
            console.log('💰 [CurrencyContext] Overriding default USD with country currency:', currencyCode, 'for country:', country);
          } else if (apiCurrencyCode) {
            // Use the API-provided currency (either explicit preference or appropriate default)
            currencyCode = apiCurrencyCode;
            console.log('💰 [CurrencyContext] Using API currency preference:', currencyCode);
          } else {
            // No currency from API, use country default or USD
            currencyCode = countryDefaultCurrency || 'USD';
            console.log('💰 [CurrencyContext] No API currency, using country default:', currencyCode, 'for country:', country);
          }
        }
        
        // Use proper symbol from CURRENCIES mapping if available
        const currencyData = CURRENCIES[currencyCode];
        const newCurrency = {
          code: currencyCode,
          name: currencyData?.name || response.data.preferred_currency_name || 'US Dollar',
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
      
      // Save to local storage immediately for better UX
      setCurrency(newCurrency);
      await AsyncStorage.setItem('user_currency', JSON.stringify(newCurrency));
      await AsyncStorage.setItem('user_currency_explicit', 'true'); // Mark as explicitly set
      
      console.log('💰 [CurrencyContext] Currency updated locally to:', newCurrency);
      
      // Try to update backend (might fail but local change persists)
      try {
        const response = await api.post('/users/preferences/', {
          preferred_currency_code: newCurrency.code,
          preferred_currency_name: newCurrency.name,
          preferred_currency_symbol: newCurrency.symbol
        });
        console.log('💰 [CurrencyContext] Backend update successful');
      } catch (apiError) {
        console.log('💰 [CurrencyContext] Backend update failed, but local currency saved:', apiError.message);
        // Don't throw - local update succeeded
      }
      
      return true; // Success
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