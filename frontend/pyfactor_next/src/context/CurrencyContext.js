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
      refreshCurrency: () => {},
      isLoading: false
    };
  }
  return context;
};

export const CurrencyProvider = ({ children }) => {
  // Always start with USD default until database loads
  const [currency, setCurrency] = useState({
    code: 'USD',
    name: 'US Dollar',
    symbol: '$'
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load currency preferences on mount - ALWAYS from database
  useEffect(() => {
    const loadCurrency = async () => {
      try {
        console.log('🔄 [CurrencyContext] Loading currency from DATABASE...');
        console.log('🔄 [CurrencyContext] NOT using localStorage on initial load');
        
        const response = await fetch('/api/currency/preferences-optimized/');
        
        if (response.ok) {
          // Check if response is JSON
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            
            console.log('🔄 [CurrencyContext] Database response:', data);
            
            if (data.success && data.preferences) {
              const newCurrency = {
                code: data.preferences.currency_code || 'USD',
                name: data.preferences.currency_name || 'US Dollar',
                symbol: data.preferences.currency_symbol || '$'
              };
              
              console.log('🔄 [CurrencyContext] Setting currency from DATABASE:', newCurrency);
              setCurrency(newCurrency);
              
              // Update localStorage AFTER loading from database
              localStorage.setItem('dott_currency', JSON.stringify(newCurrency));
              console.log('🔄 [CurrencyContext] Updated localStorage with database value');
            }
          } else {
            console.error('🔄 [CurrencyContext] Backend returned non-JSON response');
            // Still use USD default, don't fall back to localStorage
            const defaultCurrency = {
              code: 'USD',
              name: 'US Dollar',
              symbol: '$'
            };
            setCurrency(defaultCurrency);
          }
        } else {
          console.error('🔄 [CurrencyContext] Failed to load from database, using USD default');
          // Use USD default, don't fall back to localStorage
          const defaultCurrency = {
            code: 'USD',
            name: 'US Dollar',
            symbol: '$'
          };
          setCurrency(defaultCurrency);
        }
      } catch (error) {
        console.error('🔄 [CurrencyContext] Error loading currency:', error);
        // Keep USD default
      } finally {
        setIsLoading(false);
      }
    };

    loadCurrency();
  }, []);

  const updateCurrency = (newCurrency) => {
    console.log('🎯 [CurrencyContext] === UPDATE CURRENCY RECEIVED ===');
    console.log('🎯 [CurrencyContext] Input currency data:', newCurrency);
    console.log('🎯 [CurrencyContext] Timestamp:', new Date().toISOString());
    
    const updatedCurrency = {
      code: newCurrency.currency_code || newCurrency.code,
      name: newCurrency.currency_name || newCurrency.name,
      symbol: newCurrency.currency_symbol || newCurrency.symbol || '$'
    };
    
    console.log('🎯 [CurrencyContext] Setting new currency state:', updatedCurrency);
    setCurrency(updatedCurrency);
    
    // Store in localStorage for persistence across tabs
    console.log('🎯 [CurrencyContext] Storing in localStorage:', updatedCurrency);
    localStorage.setItem('dott_currency', JSON.stringify(updatedCurrency));
    
    // Trigger a custom event for debugging
    window.dispatchEvent(new CustomEvent('currency-updated', {
      detail: updatedCurrency
    }));
    
    console.log('🎯 [CurrencyContext] Currency update complete');
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

  // Function to refresh currency from database
  const refreshCurrency = async () => {
    console.log('🔄 [CurrencyContext] Refreshing currency from database...');
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/currency/preferences-optimized/');
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          
          if (data.success && data.preferences) {
            const newCurrency = {
              code: data.preferences.currency_code || 'USD',
              name: data.preferences.currency_name || 'US Dollar',
              symbol: data.preferences.currency_symbol || '$'
            };
            
            console.log('🔄 [CurrencyContext] Refreshed currency from database:', newCurrency);
            setCurrency(newCurrency);
            localStorage.setItem('dott_currency', JSON.stringify(newCurrency));
          }
        }
      }
    } catch (error) {
      console.error('🔄 [CurrencyContext] Error refreshing currency:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    currency,
    updateCurrency,
    refreshCurrency,
    isLoading
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};