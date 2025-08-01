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
          console.error('🔄 [CurrencyContext] Failed to load from database, trying localStorage fallback');
          // Try localStorage fallback before defaulting to USD
          try {
            const localCurrency = localStorage.getItem('dott_currency');
            if (localCurrency) {
              const parsedCurrency = JSON.parse(localCurrency);
              console.log('🔄 [CurrencyContext] Using localStorage fallback:', parsedCurrency);
              setCurrency({
                code: parsedCurrency.code || 'USD',
                name: parsedCurrency.name || 'US Dollar',
                symbol: parsedCurrency.symbol || '$'
              });
            } else {
              console.log('🔄 [CurrencyContext] No localStorage fallback, using USD default');
              setCurrency({
                code: 'USD',
                name: 'US Dollar',
                symbol: '$'
              });
            }
          } catch (localError) {
            console.error('🔄 [CurrencyContext] localStorage fallback failed:', localError);
            setCurrency({
              code: 'USD',
              name: 'US Dollar',
              symbol: '$'
            });
          }
        }
      } catch (error) {
        console.error('🔄 [CurrencyContext] Error loading currency:', error);
        // Try localStorage fallback before defaulting to USD
        try {
          const localCurrency = localStorage.getItem('dott_currency');
          if (localCurrency) {
            const parsedCurrency = JSON.parse(localCurrency);
            console.log('🔄 [CurrencyContext] Using localStorage fallback after error:', parsedCurrency);
            setCurrency({
              code: parsedCurrency.code || 'USD',
              name: parsedCurrency.name || 'US Dollar',
              symbol: parsedCurrency.symbol || '$'
            });
          } else {
            console.log('🔄 [CurrencyContext] No localStorage fallback, keeping USD default');
          }
        } catch (localError) {
          console.error('🔄 [CurrencyContext] localStorage fallback failed after error:', localError);
        }
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
    console.log('🎯 [CurrencyContext] Current state before update:', currency);
    
    const updatedCurrency = {
      code: newCurrency.currency_code || newCurrency.code,
      name: newCurrency.currency_name || newCurrency.name,
      symbol: newCurrency.currency_symbol || newCurrency.symbol || '$'
    };
    
    console.log('🎯 [CurrencyContext] Normalized currency object:', updatedCurrency);
    console.log('🎯 [CurrencyContext] About to call setCurrency...');
    
    // Force update by creating new object with timestamp to ensure re-render
    setCurrency(prevCurrency => {
      console.log('🎯 [CurrencyContext] === STATE UPDATER CALLED ===');
      console.log('🎯 [CurrencyContext] Previous state:', prevCurrency);
      console.log('🎯 [CurrencyContext] New state:', updatedCurrency);
      
      const newState = { 
        ...updatedCurrency,
        // Add timestamp to force re-render
        _lastUpdated: Date.now()
      };
      
      console.log('🎯 [CurrencyContext] Final state with timestamp:', newState);
      return newState;
    });
    
    // Store in localStorage for persistence across tabs
    console.log('🎯 [CurrencyContext] Storing in localStorage:', updatedCurrency);
    localStorage.setItem('dott_currency', JSON.stringify(updatedCurrency));
    
    // Trigger a custom event for debugging
    console.log('🎯 [CurrencyContext] Dispatching currency-updated event...');
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

  // Debug log when context value changes
  useEffect(() => {
    console.log('🔄 [CurrencyProvider] Context value updated:', {
      currency,
      isLoading,
      timestamp: new Date().toISOString()
    });
  }, [currency, isLoading]);

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};