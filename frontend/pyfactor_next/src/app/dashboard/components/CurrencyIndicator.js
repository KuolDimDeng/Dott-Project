import React, { useEffect } from 'react';
import { useCurrency } from '@/context/CurrencyContext';

const CurrencyIndicator = () => {
  const { currency, isLoading } = useCurrency();

  console.log('💰 [CurrencyIndicator] Rendering with currency:', currency);
  console.log('💰 [CurrencyIndicator] Is loading:', isLoading);

  // Listen for currency updates
  useEffect(() => {
    const handleCurrencyUpdate = (event) => {
      console.log('💰 [CurrencyIndicator] Currency update event received:', event.detail);
    };
    
    window.addEventListener('currency-updated', handleCurrencyUpdate);
    
    return () => {
      window.removeEventListener('currency-updated', handleCurrencyUpdate);
    };
  }, []);

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