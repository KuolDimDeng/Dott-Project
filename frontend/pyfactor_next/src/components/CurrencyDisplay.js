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
  
  // Debug logging
  console.log('💰 [CurrencyDisplay] === RENDER ===');
  console.log('💰 [CurrencyDisplay] Currency from context:', currency);
  console.log('💰 [CurrencyDisplay] Is loading:', isLoading);
  console.log('💰 [CurrencyDisplay] Props:', { showName, showSymbol, className, fallback });
  console.log('💰 [CurrencyDisplay] Timestamp:', new Date().toISOString());
  console.log('💰 [CurrencyDisplay] Component location:', new Error().stack.split('\n')[3]); // Track where it's being rendered from
  
  // Always show something, even while loading
  const displayCurrency = currency || { code: fallback, name: `${fallback} Currency`, symbol: '$' };
  console.log('💰 [CurrencyDisplay] Display currency:', displayCurrency);

  // Don't wait for loading - show cached/default immediately
  if (!displayCurrency) {
    console.log('💰 [CurrencyDisplay] No display currency, showing fallback:', fallback);
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
  
  const finalText = displayText.join(' ') || displayCurrency.code || fallback;
  console.log('💰 [CurrencyDisplay] Final display text:', finalText);

  return (
    <span className={className} title={`Business Currency: ${displayCurrency.name} (${displayCurrency.code})`}>
      {finalText}
    </span>
  );
};

export default CurrencyDisplay;