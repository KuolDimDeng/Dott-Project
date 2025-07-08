import { useState, useEffect } from 'react';

// Currency symbols mapping
const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$',
  INR: '₹',
  JPY: '¥',
  CNY: '¥',
  BRL: 'R$',
  MXN: '$',
  CHF: 'Fr',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  NZD: 'NZ$',
  SGD: 'S$',
  HKD: 'HK$',
  ZAR: 'R',
  AED: 'د.إ',
  KES: 'KSh',
  // Add more as needed
};

// Approximate exchange rates (you should fetch these from an API in production)
// These are rough estimates for display purposes only
const EXCHANGE_RATES = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.36,
  AUD: 1.52,
  INR: 83.12,
  JPY: 149.50,
  CNY: 7.24,
  BRL: 4.97,
  MXN: 17.15,
  CHF: 0.88,
  SEK: 10.44,
  NOK: 10.63,
  DKK: 6.85,
  NZD: 1.63,
  SGD: 1.34,
  HKD: 7.82,
  ZAR: 18.92,
  AED: 3.67,
  KES: 153.50,
};

// Country to currency mapping
const COUNTRY_CURRENCY = {
  US: 'USD',
  GB: 'GBP',
  EU: 'EUR',
  CA: 'CAD',
  AU: 'AUD',
  IN: 'INR',
  JP: 'JPY',
  CN: 'CNY',
  BR: 'BRL',
  MX: 'MXN',
  CH: 'CHF',
  SE: 'SEK',
  NO: 'NOK',
  DK: 'DKK',
  NZ: 'NZD',
  SG: 'SGD',
  HK: 'HKD',
  ZA: 'ZAR',
  AE: 'AED',
  KE: 'KES',
  // European countries
  DE: 'EUR',
  FR: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  AT: 'EUR',
  IE: 'EUR',
  PT: 'EUR',
  FI: 'EUR',
  GR: 'EUR',
};

export function useCurrencyDetection() {
  const [currency, setCurrency] = useState('USD');
  const [symbol, setSymbol] = useState('$');
  const [exchangeRate, setExchangeRate] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [detectedCountry, setDetectedCountry] = useState(null);

  useEffect(() => {
    const detectCurrency = async () => {
      try {
        // Try multiple methods to detect user's location/currency
        
        // Method 1: Browser language
        const browserLang = navigator.language || navigator.languages[0];
        const countryFromLang = browserLang.split('-')[1]?.toUpperCase();
        
        // Method 2: Timezone-based detection
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        let countryFromTimezone = null;
        
        // Simple timezone to country mapping (partial list)
        if (timezone.includes('London')) countryFromTimezone = 'GB';
        else if (timezone.includes('New_York') || timezone.includes('Los_Angeles')) countryFromTimezone = 'US';
        else if (timezone.includes('Toronto')) countryFromTimezone = 'CA';
        else if (timezone.includes('Sydney')) countryFromTimezone = 'AU';
        else if (timezone.includes('Tokyo')) countryFromTimezone = 'JP';
        else if (timezone.includes('Paris') || timezone.includes('Berlin')) countryFromTimezone = 'EU';
        else if (timezone.includes('Mumbai') || timezone.includes('Kolkata')) countryFromTimezone = 'IN';
        
        // Method 3: IP-based geolocation (free service)
        let countryFromIP = null;
        try {
          const geoResponse = await fetch('https://ipapi.co/json/');
          if (geoResponse.ok) {
            const contentType = geoResponse.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const geoData = await geoResponse.json();
              // Validate the response has expected fields
              if (geoData && geoData.country_code) {
                countryFromIP = geoData.country_code;
                setDetectedCountry(geoData.country_name);
              }
            }
          }
        } catch (error) {
          console.warn('Geolocation detection failed:', error);
        }
        
        // Determine country (priority: IP > timezone > language)
        const detectedCountryCode = countryFromIP || countryFromTimezone || countryFromLang || 'US';
        
        // Get currency for country
        const detectedCurrency = COUNTRY_CURRENCY[detectedCountryCode] || 'USD';
        const detectedSymbol = CURRENCY_SYMBOLS[detectedCurrency] || '$';
        const detectedRate = EXCHANGE_RATES[detectedCurrency] || 1;
        
        setCurrency(detectedCurrency);
        setSymbol(detectedSymbol);
        setExchangeRate(detectedRate);
        
        // Store in localStorage for faster subsequent loads
        localStorage.setItem('detectedCurrency', detectedCurrency);
        localStorage.setItem('detectedCountry', detectedCountryCode);
        
      } catch (error) {
        console.error('Currency detection error:', error);
        // Fall back to USD
        setCurrency('USD');
        setSymbol('$');
        setExchangeRate(1);
      } finally {
        setIsLoading(false);
      }
    };

    // Check localStorage first
    const savedCurrency = localStorage.getItem('detectedCurrency');
    if (savedCurrency && CURRENCY_SYMBOLS[savedCurrency]) {
      setCurrency(savedCurrency);
      setSymbol(CURRENCY_SYMBOLS[savedCurrency]);
      setExchangeRate(EXCHANGE_RATES[savedCurrency] || 1);
      setIsLoading(false);
    } else {
      detectCurrency();
    }
  }, []);

  const convertPrice = (usdPrice) => {
    const convertedPrice = Math.round(usdPrice * exchangeRate);
    
    // Format based on currency
    if (currency === 'JPY' || currency === 'KRW') {
      // No decimal places for these currencies
      return Math.round(convertedPrice);
    }
    
    return convertedPrice;
  };

  const formatPrice = (usdPrice) => {
    const converted = convertPrice(usdPrice);
    
    // Special formatting for certain currencies
    if (currency === 'INR') {
      // Indian numbering system
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(converted);
    }
    
    if (currency === 'JPY') {
      return `${symbol}${converted.toLocaleString()}`;
    }
    
    // Default formatting
    return `${symbol}${converted.toFixed(2)}`;
  };

  const changeCurrency = (newCurrency) => {
    if (CURRENCY_SYMBOLS[newCurrency]) {
      setCurrency(newCurrency);
      setSymbol(CURRENCY_SYMBOLS[newCurrency]);
      setExchangeRate(EXCHANGE_RATES[newCurrency] || 1);
      localStorage.setItem('detectedCurrency', newCurrency);
    }
  };

  return {
    currency,
    symbol,
    exchangeRate,
    isLoading,
    detectedCountry,
    convertPrice,
    formatPrice,
    changeCurrency,
    availableCurrencies: Object.keys(CURRENCY_SYMBOLS),
  };
}