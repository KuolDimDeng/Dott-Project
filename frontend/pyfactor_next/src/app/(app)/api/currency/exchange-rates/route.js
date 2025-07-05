import { NextResponse } from 'next/server';

// Cache exchange rates for 1 hour to avoid excessive API calls
let ratesCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

export async function GET(request) {
  try {
    // Check if we have cached rates
    if (ratesCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
      return NextResponse.json(ratesCache);
    }

    // You can use various free APIs for exchange rates:
    // Option 1: exchangerate-api.com (free tier available)
    // Option 2: fixer.io (requires API key)
    // Option 3: currencyapi.com (requires API key)
    // Option 4: Use hardcoded rates as fallback

    // For now, using hardcoded rates as a reliable fallback
    // In production, you'd want to use a real API
    const rates = {
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
      KRW: 1325.50,
      THB: 35.42,
      PHP: 55.85,
      MYR: 4.65,
      IDR: 15650,
      VND: 24425,
      PLN: 4.01,
      CZK: 22.45,
      HUF: 352.15,
      RON: 4.57,
      TRY: 29.85,
      ILS: 3.65,
      CLP: 975.50,
      ARS: 825.00,
      COP: 3950.00,
      PEN: 3.75,
      UYU: 39.15,
    };

    // If you have an API key for a real exchange rate service, use it here:
    /*
    try {
      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/USD`);
      if (response.ok) {
        const data = await response.json();
        rates = data.rates;
      }
    } catch (error) {
      console.warn('Failed to fetch live rates, using cached rates');
    }
    */

    // Cache the rates
    ratesCache = { rates, timestamp: new Date().toISOString() };
    cacheTimestamp = Date.now();

    return NextResponse.json(ratesCache);
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exchange rates' },
      { status: 500 }
    );
  }
}