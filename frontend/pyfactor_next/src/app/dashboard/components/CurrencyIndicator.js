import React from 'react';
import { useCurrency } from '@/context/CurrencyContext';

const CurrencyIndicator = () => {
  const { currency, isLoading } = useCurrency();

  // Show loading state while currency loads from database
  if (isLoading && !currency?.code) {
    return (
      <div className="flex items-center text-white/70 text-base">
        <span>...</span>
      </div>
    );
  }

  // Show empty if no currency loaded
  const displayCurrency = currency || { code: '', name: '', symbol: '' };
  
  // Don't render if no currency code
  if (!displayCurrency.code) {
    return (
      <div className="flex items-center text-white/70 text-base">
        <span></span>
      </div>
    );
  }

  // Clean up currency code by removing duplicates (e.g., "SSP SSP" -> "SSP")
  const cleanCurrencyCode = displayCurrency.code ? 
    displayCurrency.code.split(' ')[0].trim().toUpperCase() : '';

  return (
    <div 
      className="flex items-center text-white/90 text-base hover:text-white cursor-default"
      title={`Business Currency: ${displayCurrency.name}`}
    >
      <span className="font-medium">{cleanCurrencyCode}</span>
    </div>
  );
};

export default CurrencyIndicator;