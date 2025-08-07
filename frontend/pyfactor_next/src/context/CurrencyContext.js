'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

const CurrencyContext = createContext();

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    // Return empty currency if context is not available
    return {
      currency: {
        code: '',
        name: '',
        symbol: ''
      },
      updateCurrency: () => {},
      refreshCurrency: () => {},
      isLoading: false
    };
  }
  return context;
};

export const CurrencyProvider = ({ children }) => {
  // Start with empty currency until database loads
  const [currency, setCurrency] = useState({
    code: '',
    name: '',
    symbol: ''
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load currency preferences on mount - ALWAYS from database
  useEffect(() => {
    const loadCurrency = async () => {
      // Skip loading currency on admin pages
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
        console.log('💰 [CurrencyContext] Skipping currency load on admin page');
        setIsLoading(false);
        return;
      }
      
      console.log('💰 [CurrencyContext] === LOADING CURRENCY START ===');
      
      try {
        // Use direct API endpoint without proxy
        const response = await fetch('/api/currency/preferences');
        console.log('💰 [CurrencyContext] API Response status:', response.status);
        
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            console.log('💰 [CurrencyContext] API Response data:', data);
            
            if (data.success && data.preferences) {
              const newCurrency = {
                code: data.preferences.currency_code || '',
                name: data.preferences.currency_name || '',
                symbol: data.preferences.currency_symbol || ''
              };
              
              console.log('💰 [CurrencyContext] Setting currency to:', newCurrency);
              
              // Only set if we have a valid currency code
              if (newCurrency.code) {
                setCurrency(newCurrency);
                // Update localStorage AFTER loading from database
                localStorage.setItem('dott_currency', JSON.stringify(newCurrency));
              } else {
                console.warn('💰 [CurrencyContext] No currency code in response');
              }
            } else {
              console.warn('💰 [CurrencyContext] Response missing success or preferences:', data);
            }
          } else {
            console.warn('💰 [CurrencyContext] Response not JSON:', contentType);
          }
        } else {
          console.warn('💰 [CurrencyContext] API returned non-OK status:', response.status);
          // Try localStorage fallback
          try {
            const localCurrency = localStorage.getItem('dott_currency');
            if (localCurrency) {
              const parsedCurrency = JSON.parse(localCurrency);
              setCurrency({
                code: parsedCurrency.code || '',
                name: parsedCurrency.name || '',
                symbol: parsedCurrency.symbol || ''
              });
              console.log('💰 [CurrencyContext] Loaded from localStorage:', parsedCurrency);
            }
          } catch (error) {
            // Keep empty currency
            console.warn('💰 [CurrencyContext] Error loading from localStorage:', error);
          }
        }
      } catch (error) {
        // Try localStorage fallback
        try {
          const localCurrency = localStorage.getItem('dott_currency');
          if (localCurrency) {
            const parsedCurrency = JSON.parse(localCurrency);
            setCurrency({
              code: parsedCurrency.code || '',
              name: parsedCurrency.name || '',
              symbol: parsedCurrency.symbol || ''
            });
          }
        } catch (localError) {
          // Keep empty currency
          console.warn('💰 [CurrencyContext] Error in fallback:', localError);
        }
      } finally {
        setIsLoading(false);
        console.log('💰 [CurrencyContext] === LOADING CURRENCY END ===');
        console.log('💰 [CurrencyContext] Final currency:', currency);
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
      // Use direct API endpoint without proxy
      const response = await fetch('/api/currency/preferences');
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          
          if (data.success && data.preferences) {
            const newCurrency = {
              code: data.preferences.currency_code || '',
              name: data.preferences.currency_name || '',
              symbol: data.preferences.currency_symbol || ''
            };
            
            console.log('💰 [CurrencyContext] Refreshed from API:', newCurrency);
            
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