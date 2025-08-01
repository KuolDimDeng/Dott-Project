'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

const CurrencyContext = createContext();

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    // Return default USD if context is not available
    return {
      currency: {
        code: 'USD',
        name: 'US Dollar',
        symbol: '$'
      },
      updateCurrency: () => {},
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

  // Load currency preferences on mount
  useEffect(() => {
    const loadCurrency = async () => {
      try {
        console.log('[CurrencyContext] Loading currency preferences...');
        
        const response = await fetch('/api/currency/preferences-optimized/');
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.preferences) {
            const newCurrency = {
              code: data.preferences.currency_code || 'USD',
              name: data.preferences.currency_name || 'US Dollar',
              symbol: data.preferences.currency_symbol || '$'
            };
            
            console.log('[CurrencyContext] Currency loaded:', newCurrency);
            setCurrency(newCurrency);
          }
        } else {
          console.warn('[CurrencyContext] Failed to load currency, using USD default');
        }
      } catch (error) {
        console.error('[CurrencyContext] Error loading currency:', error);
        // Keep USD default
      } finally {
        setIsLoading(false);
      }
    };

    loadCurrency();
  }, []);

  const updateCurrency = (newCurrency) => {
    console.log('[CurrencyContext] Updating currency:', newCurrency);
    setCurrency({
      code: newCurrency.currency_code || newCurrency.code,
      name: newCurrency.currency_name || newCurrency.name,
      symbol: newCurrency.currency_symbol || newCurrency.symbol || '$'
    });
    
    // Store in localStorage for persistence across tabs
    localStorage.setItem('dott_currency', JSON.stringify({
      code: newCurrency.currency_code || newCurrency.code,
      name: newCurrency.currency_name || newCurrency.name,
      symbol: newCurrency.currency_symbol || newCurrency.symbol || '$'
    }));
  };

  // Listen for storage changes (when currency is updated in another tab)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'dott_currency' && e.newValue) {
        try {
          const newCurrency = JSON.parse(e.newValue);
          console.log('[CurrencyContext] Currency updated from another tab:', newCurrency);
          setCurrency(newCurrency);
        } catch (error) {
          console.error('[CurrencyContext] Error parsing currency from storage:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const value = {
    currency,
    updateCurrency,
    isLoading
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};