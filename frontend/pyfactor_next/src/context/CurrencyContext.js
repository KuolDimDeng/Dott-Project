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
        // Use backend proxy endpoint
      const response = await fetch('/api/backend/users/api/currency/preferences');
        
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
              
              setCurrency(newCurrency);
              
              // Update localStorage AFTER loading from database
              localStorage.setItem('dott_currency', JSON.stringify(newCurrency));
            }
          }
        } else {
          // Try localStorage fallback
          try {
            const localCurrency = localStorage.getItem('dott_currency');
            if (localCurrency) {
              const parsedCurrency = JSON.parse(localCurrency);
              setCurrency({
                code: parsedCurrency.code || 'USD',
                name: parsedCurrency.name || 'US Dollar',
                symbol: parsedCurrency.symbol || '$'
              });
            }
          } catch (error) {
            // Keep default USD
          }
        }
      } catch (error) {
        // Try localStorage fallback
        try {
          const localCurrency = localStorage.getItem('dott_currency');
          if (localCurrency) {
            const parsedCurrency = JSON.parse(localCurrency);
            setCurrency({
              code: parsedCurrency.code || 'USD',
              name: parsedCurrency.name || 'US Dollar',
              symbol: parsedCurrency.symbol || '$'
            });
          }
        } catch (localError) {
          // Keep default USD
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadCurrency();
  }, []);

  const updateCurrency = (newCurrency) => {
    const updatedCurrency = {
      code: newCurrency.currency_code || newCurrency.code,
      name: newCurrency.currency_name || newCurrency.name,
      symbol: newCurrency.currency_symbol || newCurrency.symbol || '$'
    };
    
    // Update state
    setCurrency(updatedCurrency);
    
    // Store in localStorage for persistence
    localStorage.setItem('dott_currency', JSON.stringify(updatedCurrency));
    
    // Trigger a custom event for other components
    window.dispatchEvent(new CustomEvent('currency-updated', {
      detail: updatedCurrency
    }));
  };

  // Listen for storage changes (when currency is updated in another tab)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'dott_currency' && e.newValue) {
        try {
          const newCurrency = JSON.parse(e.newValue);
          setCurrency(newCurrency);
        } catch (error) {
          // Ignore parse errors
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Function to refresh currency from database
  const refreshCurrency = async () => {
    setIsLoading(true);
    
    try {
      // Use backend proxy endpoint
      const response = await fetch('/api/backend/users/api/currency/preferences');
      
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
            
            setCurrency(newCurrency);
            localStorage.setItem('dott_currency', JSON.stringify(newCurrency));
          }
        }
      }
    } catch (error) {
      // Ignore errors, keep current currency
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