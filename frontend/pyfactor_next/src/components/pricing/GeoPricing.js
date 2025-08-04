'use client';

import React, { useEffect, useState } from 'react';
import { formatCurrency } from '@/utils/formatters';

const GeoPricing = ({ 
  basePrice = 0, 
  currency = 'USD', 
  exchangeRate = 1,
  className = '',
  showOriginal = false 
}) => {
  const [displayPrice, setDisplayPrice] = useState(basePrice);
  const [displayCurrency, setDisplayCurrency] = useState(currency || 'USD');
  
  useEffect(() => {
    // Ensure we have valid values
    const validCurrency = currency || 'USD';
    const validRate = exchangeRate || 1;
    const validPrice = basePrice || 0;
    
    setDisplayCurrency(validCurrency);
    setDisplayPrice(validPrice * validRate);
  }, [basePrice, currency, exchangeRate]);

  // Handle the bind error by ensuring function context
  const handlePriceFormat = () => {
    try {
      return formatCurrency(displayPrice, displayCurrency);
    } catch (error) {
      console.error('[GeoPricing] Format error:', error);
      return `${displayCurrency} ${displayPrice.toFixed(2)}`;
    }
  };

  return (
    <div className={`geo-pricing ${className}`}>
      <span className="price">{handlePriceFormat()}</span>
      {showOriginal && currency !== 'USD' && (
        <span className="original-price text-sm text-gray-500 ml-2">
          (USD ${basePrice.toFixed(2)})
        </span>
      )}
    </div>
  );
};

export default GeoPricing;