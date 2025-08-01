'use client';

import React from 'react';
import { useCurrency } from '@/context/CurrencyContext';

/**
 * Simple currency display component that shows the current business currency
 * Can be used in headers, dashboards, etc.
 */
const CurrencyDisplay = ({ 
  showName = false, 
  showSymbol = true, 
  className = '',
  fallback = 'USD' 
}) => {
  const { currency, isLoading } = useCurrency();

  if (isLoading) {
    return (
      <span className={`text-gray-500 ${className}`}>
        {fallback}
      </span>
    );
  }

  const displayText = [];
  
  if (showSymbol && currency.symbol) {
    displayText.push(currency.symbol);
  }
  
  if (showName && currency.name) {
    displayText.push(currency.name);
  } else if (!showSymbol || !currency.symbol) {
    // Show code if no symbol or name
    displayText.push(currency.code);
  }

  return (
    <span className={className} title={`Business Currency: ${currency.name} (${currency.code})`}>
      {displayText.join(' ') || fallback}
    </span>
  );
};

export default CurrencyDisplay;