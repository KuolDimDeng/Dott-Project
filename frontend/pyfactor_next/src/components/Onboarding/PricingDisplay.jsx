import React from 'react';
import { useCurrencyDetection } from '@/hooks/useCurrencyDetection';

export default function PricingDisplay({ 
  plan, 
  usdPrice, 
  billingCycle, 
  isSelected = false,
  showOriginal = true 
}) {
  const { 
    currency, 
    symbol, 
    formatPrice, 
    isLoading, 
    detectedCountry 
  } = useCurrencyDetection();

  // Calculate annual savings if applicable
  const annualSavings = billingCycle === 'yearly' && plan !== 'free' ? {
    professional: 180 - 290, // Monthly * 12 - Yearly
    enterprise: 420 - 990,
  }[plan.toLowerCase()] : 0;

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-20"></div>
      </div>
    );
  }

  const localPrice = formatPrice(usdPrice);
  const isUSD = currency === 'USD';

  return (
    <div className={`price-display ${isSelected ? 'font-bold' : ''}`}>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-semibold">
          {localPrice}
        </span>
        <span className="text-gray-600 text-sm">
          /{billingCycle === 'monthly' ? 'month' : 'year'}
        </span>
      </div>
      
      {/* Show USD price if not in USD */}
      {!isUSD && showOriginal && (
        <div className="text-xs text-gray-500 mt-1">
          (${usdPrice} USD)
        </div>
      )}
      
      {/* Show savings for annual plans */}
      {annualSavings < 0 && (
        <div className="text-sm text-green-600 mt-1">
          Save {formatPrice(Math.abs(annualSavings))} per year
        </div>
      )}
      
      {/* Currency notice */}
      {!isUSD && (
        <div className="text-xs text-gray-400 mt-2">
          * Prices shown in {currency} for {detectedCountry || 'your region'}
        </div>
      )}
    </div>
  );
}