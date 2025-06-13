import React, { useState } from 'react';
import { useCurrencyDetection } from '@/hooks/useCurrencyDetection';

export default function CurrencySelector() {
  const { currency, changeCurrency, availableCurrencies } = useCurrencyDetection();
  const [isOpen, setIsOpen] = useState(false);

  // Popular currencies to show at the top
  const popularCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY'];
  const otherCurrencies = availableCurrencies.filter(c => !popularCurrencies.includes(c));

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="font-medium">{currency}</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-20 max-h-96 overflow-y-auto">
            <div className="py-1">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Popular Currencies
              </div>
              {popularCurrencies.map((curr) => (
                <button
                  key={curr}
                  onClick={() => {
                    changeCurrency(curr);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                    currency === curr ? 'bg-blue-50 text-blue-700 font-medium' : ''
                  }`}
                >
                  {curr} - {getCurrencyName(curr)}
                </button>
              ))}
              
              {otherCurrencies.length > 0 && (
                <>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-t mt-2">
                    Other Currencies
                  </div>
                  {otherCurrencies.sort().map((curr) => (
                    <button
                      key={curr}
                      onClick={() => {
                        changeCurrency(curr);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                        currency === curr ? 'bg-blue-50 text-blue-700 font-medium' : ''
                      }`}
                    >
                      {curr} - {getCurrencyName(curr)}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Helper function to get currency names
function getCurrencyName(code) {
  const names = {
    USD: 'US Dollar',
    EUR: 'Euro',
    GBP: 'British Pound',
    CAD: 'Canadian Dollar',
    AUD: 'Australian Dollar',
    INR: 'Indian Rupee',
    JPY: 'Japanese Yen',
    CNY: 'Chinese Yuan',
    BRL: 'Brazilian Real',
    MXN: 'Mexican Peso',
    CHF: 'Swiss Franc',
    SEK: 'Swedish Krona',
    NOK: 'Norwegian Krone',
    DKK: 'Danish Krone',
    NZD: 'New Zealand Dollar',
    SGD: 'Singapore Dollar',
    HKD: 'Hong Kong Dollar',
    ZAR: 'South African Rand',
    AED: 'UAE Dirham',
    KRW: 'South Korean Won',
    THB: 'Thai Baht',
    PHP: 'Philippine Peso',
    MYR: 'Malaysian Ringgit',
    IDR: 'Indonesian Rupiah',
    VND: 'Vietnamese Dong',
    PLN: 'Polish Złoty',
    CZK: 'Czech Koruna',
    HUF: 'Hungarian Forint',
    RON: 'Romanian Leu',
    TRY: 'Turkish Lira',
    ILS: 'Israeli Shekel',
    CLP: 'Chilean Peso',
    ARS: 'Argentine Peso',
    COP: 'Colombian Peso',
    PEN: 'Peruvian Sol',
    UYU: 'Uruguayan Peso',
  };
  return names[code] || code;
}