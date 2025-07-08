import { NextResponse } from 'next/server';

export const revalidate = 3600; // Revalidate every hour

// Country to currency mapping for pricing display
const countryCurrencyMap = {
  'KE': 'KES', // Kenya Shilling
  'NG': 'NGN', // Nigerian Naira
  'ZA': 'ZAR', // South African Rand
  'GH': 'GHS', // Ghanaian Cedi
  'UG': 'UGX', // Ugandan Shilling
  'TZ': 'TZS', // Tanzanian Shilling
  'EG': 'EGP', // Egyptian Pound
  'MA': 'MAD', // Moroccan Dirham
  'IN': 'INR', // Indian Rupee
  'BR': 'BRL', // Brazilian Real
  'MX': 'MXN', // Mexican Peso
  'AR': 'ARS', // Argentine Peso
  'CO': 'COP', // Colombian Peso
  'PE': 'PEN', // Peruvian Sol
  'CL': 'CLP', // Chilean Peso
  'PH': 'PHP', // Philippine Peso
  'ID': 'IDR', // Indonesian Rupiah
  'VN': 'VND', // Vietnamese Dong
  'TH': 'THB', // Thai Baht
  'MY': 'MYR', // Malaysian Ringgit
  'GB': 'GBP', // British Pound
  'EU': 'EUR', // Euro (for EU countries)
  'FR': 'EUR', // France - Euro
  'DE': 'EUR', // Germany - Euro
  'ES': 'EUR', // Spain - Euro
  'IT': 'EUR', // Italy - Euro
  'NL': 'EUR', // Netherlands - Euro
  'JP': 'JPY', // Japanese Yen
  'CN': 'CNY', // Chinese Yuan
  'KR': 'KRW', // South Korean Won
  'AU': 'AUD', // Australian Dollar
  'CA': 'CAD', // Canadian Dollar
  'NZ': 'NZD', // New Zealand Dollar
  'CH': 'CHF', // Swiss Franc
  'SE': 'SEK', // Swedish Krona
  'NO': 'NOK', // Norwegian Krone
  'DK': 'DKK', // Danish Krone
  'SG': 'SGD', // Singapore Dollar
  'HK': 'HKD', // Hong Kong Dollar
  'TR': 'TRY', // Turkish Lira
  'RU': 'RUB', // Russian Ruble
  'PL': 'PLN', // Polish Zloty
  'AE': 'AED', // UAE Dirham
  'SA': 'SAR', // Saudi Riyal
};

// Currency formatting preferences
const currencyFormats = {
  'KES': { symbol: 'KSh', decimals: 0 }, // Kenya doesn't use decimals
  'NGN': { symbol: '₦', decimals: 0 },
  'ZAR': { symbol: 'R', decimals: 2 },
  'GHS': { symbol: 'GH₵', decimals: 2 },
  'UGX': { symbol: 'USh', decimals: 0 },
  'TZS': { symbol: 'TSh', decimals: 0 },
  'INR': { symbol: '₹', decimals: 0 },
  'JPY': { symbol: '¥', decimals: 0 },
  'KRW': { symbol: '₩', decimals: 0 },
  'IDR': { symbol: 'Rp', decimals: 0 },
  'VND': { symbol: '₫', decimals: 0 },
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country') || 'US';
  const targetCurrency = countryCurrencyMap[country] || 'USD';
  const baseCurrency = searchParams.get('base') || 'USD';
  
  console.log(`🌍 [ExchangeRate API] Request received - Country: ${country}, Target Currency: ${targetCurrency}, Base: ${baseCurrency}`);
  
  try {
    // If requesting USD, no conversion needed
    if (targetCurrency === 'USD' && baseCurrency === 'USD') {
      return NextResponse.json({
        success: true,
        rate: 1,
        currency: 'USD',
        source: 'Direct',
        format: { symbol: '$', decimals: 2 }
      });
    }

    // Try Wise API first (public endpoint)
    try {
      const wiseUrl = `https://api.wise.com/v1/rates?source=${baseCurrency}&target=${targetCurrency}`;
      console.log(`🌍 [ExchangeRate API] Calling Wise API: ${wiseUrl}`);
      
      const wiseResponse = await fetch(wiseUrl, {
        headers: {
          'Accept': 'application/json',
        }
      });
      
      console.log(`🌍 [ExchangeRate API] Wise API response status: ${wiseResponse.status}`);

      if (wiseResponse.ok) {
        const wiseData = await wiseResponse.json();
        console.log('🌍 [ExchangeRate API] Wise API data:', wiseData);
        const rate = wiseData[0]?.rate || 1;
        
        const result = {
          success: true,
          rate: rate,
          currency: targetCurrency,
          source: 'Wise',
          format: currencyFormats[targetCurrency] || { symbol: targetCurrency, decimals: 2 },
          disclaimer: 'Exchange rate is estimated and may vary. Source: Wise.'
        };
        
        console.log('🌍 [ExchangeRate API] Returning Wise result:', result);
        return NextResponse.json(result);
      } else {
        console.warn(`🌍 [ExchangeRate API] Wise API failed with status: ${wiseResponse.status}`);
      }
    } catch (wiseError) {
      console.error('🌍 [ExchangeRate API] Wise API error:', wiseError.message);
      console.log('🌍 [ExchangeRate API] Falling back to exchangerate-api');
    }

    // Fallback to exchangerate-api.com
    const fallbackUrl = `https://v6.exchangerate-api.com/v6/41fc0bfadd338697395e482f/latest/${baseCurrency}`;
    console.log(`🌍 [ExchangeRate API] Calling fallback API: ${fallbackUrl}`);
    
    const response = await fetch(fallbackUrl);
    console.log(`🌍 [ExchangeRate API] Fallback API response status: ${response.status}`);
    
    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`🌍 [ExchangeRate API] Fallback API conversion rates available:`, Object.keys(data.conversion_rates || {}).length);
    
    const rate = data.conversion_rates[targetCurrency] || 1;
    console.log(`🌍 [ExchangeRate API] Rate for ${targetCurrency}: ${rate}`);
    
    const result = {
      success: true,
      rate: rate,
      currency: targetCurrency,
      source: 'ExchangeRate-API',
      format: currencyFormats[targetCurrency] || { symbol: targetCurrency, decimals: 2 },
      disclaimer: 'Exchange rate is estimated and may vary. Actual rates depend on payment provider.'
    };
    
    console.log('🌍 [ExchangeRate API] Returning fallback result:', result);
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('🌍 [ExchangeRate API] Critical error:', error);
    const errorResult = {
      success: false,
      rate: 1,
      currency: targetCurrency,
      source: 'Default',
      format: { symbol: targetCurrency, decimals: 2 },
      error: 'Unable to fetch exchange rate'
    };
    console.log('🌍 [ExchangeRate API] Returning error result:', errorResult);
    return NextResponse.json(errorResult);
  }
}