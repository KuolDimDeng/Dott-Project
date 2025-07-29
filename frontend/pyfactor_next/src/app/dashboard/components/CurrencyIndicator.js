import React, { useState, useEffect } from 'react';
import { CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { getCurrencyInfo } from '@/utils/currencyFormatter';

const CurrencyIndicator = () => {
  const [currencyData, setCurrencyData] = useState({
    code: 'USD',
    symbol: '$',
    name: 'US Dollar'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCurrencyPreferences();
  }, []);

  const loadCurrencyPreferences = async () => {
    try {
      const response = await fetch('/api/currency/preferences');
      const data = await response.json();
      
      if (data.success) {
        const { currency_code, currency_name, currency_symbol } = data.preferences;
        setCurrencyData({
          code: currency_code,
          symbol: currency_symbol,
          name: currency_name
        });
      }
    } catch (error) {
      console.error('Error loading currency preferences:', error);
      // Keep default USD
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center text-white/70 text-sm">
        <CurrencyDollarIcon className="h-5 w-5 mr-1.5" />
        <span>...</span>
      </div>
    );
  }

  return (
    <div 
      className="flex items-center text-white/90 text-sm hover:text-white cursor-default"
      title={`Business Currency: ${currencyData.name}`}
    >
      <CurrencyDollarIcon className="h-5 w-5 mr-1.5" />
      <span className="font-medium">{currencyData.code}</span>
    </div>
  );
};

export default CurrencyIndicator;