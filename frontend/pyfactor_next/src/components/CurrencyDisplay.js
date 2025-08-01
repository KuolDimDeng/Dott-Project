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
  
  // Always show something, even while loading
  const displayCurrency = currency || { code: fallback, name: `${fallback} Currency`, symbol: '$' };

  // Don't wait for loading - show cached/default immediately
  if (!displayCurrency) {
    return (
      <span className={className}>
        {fallback}
      </span>
    );
  }

  const displayText = [];
  
  if (showSymbol && displayCurrency.symbol) {
    displayText.push(displayCurrency.symbol);
  }
  
  if (showName && displayCurrency.name) {
    displayText.push(displayCurrency.name);
  } else if (!showSymbol || !displayCurrency.symbol) {
    // Show code if no symbol or name
    displayText.push(displayCurrency.code);
  }

  return (
    <span className={className} title={`Business Currency: ${displayCurrency.name} (${displayCurrency.code})`}>
      {displayText.join(' ') || displayCurrency.code || fallback}
    </span>
  );
};

export default CurrencyDisplay;