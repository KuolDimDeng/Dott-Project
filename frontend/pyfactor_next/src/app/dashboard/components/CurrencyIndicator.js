import React, { useEffect } from 'react';
import { useCurrency } from '@/context/CurrencyContext';

const CurrencyIndicator = () => {
  const { currency, isLoading } = useCurrency();

  console.log('💰 [CurrencyIndicator] === COMPONENT RENDER ===');
  console.log('💰 [CurrencyIndicator] Render timestamp:', new Date().toISOString());
  console.log('💰 [CurrencyIndicator] Currency received:', currency);
  console.log('💰 [CurrencyIndicator] Is loading:', isLoading);
  console.log('💰 [CurrencyIndicator] Currency code:', currency?.code);
  console.log('💰 [CurrencyIndicator] Currency name:', currency?.name);
  console.log('💰 [CurrencyIndicator] Currency symbol:', currency?.symbol);

  // Track when currency prop changes
  useEffect(() => {
    console.log('💰 [CurrencyIndicator] === CURRENCY PROP CHANGED ===');
    console.log('💰 [CurrencyIndicator] New currency value:', currency);
    console.log('💰 [CurrencyIndicator] Change timestamp:', new Date().toISOString());
  }, [currency]);

  // Track when loading state changes
  useEffect(() => {
    console.log('💰 [CurrencyIndicator] === LOADING STATE CHANGED ===');
    console.log('💰 [CurrencyIndicator] New loading state:', isLoading);
  }, [isLoading]);

  // Listen for currency updates
  useEffect(() => {
    console.log('💰 [CurrencyIndicator] Setting up currency-updated event listener');
    
    const handleCurrencyUpdate = (event) => {
      console.log('💰 [CurrencyIndicator] === CUSTOM EVENT RECEIVED ===');
      console.log('💰 [CurrencyIndicator] Event detail:', event.detail);
      console.log('💰 [CurrencyIndicator] Current context currency:', currency);
    };
    
    window.addEventListener('currency-updated', handleCurrencyUpdate);
    
    return () => {
      console.log('💰 [CurrencyIndicator] Removing currency-updated event listener');
      window.removeEventListener('currency-updated', handleCurrencyUpdate);
    };
  }, [currency]);

  // Show loading state while currency loads from database
  if (isLoading && !currency) {
    return (
      <div className="flex items-center text-white/70 text-base">
        <span>...</span>
      </div>
    );
  }

  // Always show something, even if still loading
  const displayCurrency = currency || { code: 'USD', name: 'US Dollar', symbol: '$' };

  return (
    <div 
      className="flex items-center text-white/90 text-base hover:text-white cursor-default"
      title={`Business Currency: ${displayCurrency.name}`}
    >
      <span className="font-medium">{displayCurrency.code}</span>
    </div>
  );
};

export default CurrencyIndicator;