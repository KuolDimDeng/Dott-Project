import { NextResponse } from 'next/server';

/**
 * GET /api/exchange-rate
 * Fetch current exchange rate between two currencies
 * Uses environment variable CURRENCY_API_KEY if available
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to') || 'USD';

  if (!from) {
    return NextResponse.json(
      { error: 'Missing "from" currency parameter' },
      { status: 400 }
    );
  }

  try {
    // Check if we have a currency API key
    const apiKey = process.env.CURRENCY_API_KEY || process.env.NEXT_PUBLIC_CURRENCY_API_KEY;
    
    if (apiKey) {
      // Use a real exchange rate API (e.g., exchangerate-api.com, currencyapi.com)
      const apiUrl = `https://api.currencyapi.com/v3/latest?apikey=${apiKey}&base_currency=${to}&currencies=${from}`;
      
      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/json',
        },
        // Cache for 1 hour to reduce API calls
        next: { revalidate: 3600 }
      });

      if (response.ok) {
        const data = await response.json();
        // The rate returned is how many of 'from' currency equals 1 'to' currency
        const rate = data.data[from]?.value || 1;
        
        return NextResponse.json({
          from,
          to,
          rate,
          timestamp: new Date().toISOString(),
          source: 'live'
        });
      }
    }

    // Fallback: Use a free API or return error
    // Try using exchangerate-api.com free tier (no key needed for basic)
    const fallbackUrl = `https://api.exchangerate-api.com/v4/latest/${to}`;
    
    const fallbackResponse = await fetch(fallbackUrl, {
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    
    if (fallbackResponse.ok) {
      const data = await fallbackResponse.json();
      const rate = data.rates[from] || 1;
      
      return NextResponse.json({
        from,
        to,
        rate,
        timestamp: new Date().toISOString(),
        source: 'fallback'
      });
    }

    // If all APIs fail, return error
    return NextResponse.json(
      { 
        error: 'Unable to fetch exchange rate',
        from,
        to,
        fallback: true
      },
      { status: 503 }
    );
    
  } catch (error) {
    console.error('Exchange rate API error:', error);
    return NextResponse.json(
      { 
        error: 'Exchange rate service unavailable',
        message: error.message 
      },
      { status: 500 }
    );
  }
}