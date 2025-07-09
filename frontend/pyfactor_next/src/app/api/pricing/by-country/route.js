import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');
    
    // Get client IP for geo-location (Cloudflare aware)
    const cfIp = request.headers.get('cf-connecting-ip');
    const cfCountry = request.headers.get('cf-ipcountry') || request.headers.get('x-cf-country');
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = cfIp || (forwarded ? forwarded.split(',')[0] : realIp);
    
    // Enhanced debugging
    console.log('🎯 [Pricing API] === REQUEST START ===');
    console.log('🎯 [Pricing API] Full URL:', request.url);
    console.log('🎯 [Pricing API] Method:', request.method);
    console.log('🎯 [Pricing API] Search params object:', Object.fromEntries(searchParams.entries()));
    console.log('🎯 [Pricing API] Country from query:', country);
    console.log('🎯 [Pricing API] Country type:', typeof country);
    console.log('🎯 [Pricing API] Country length:', country ? country.length : 'null');
    console.log('🎯 [Pricing API] Is 2-letter code?:', country && country.length === 2);
    console.log('🎯 [Pricing API] All headers:', {
      cfIp,
      cfCountry,
      forwarded,
      realIp,
      finalIp: ip,
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer')
    });
    
    // Build query params
    const params = new URLSearchParams();
    if (country) {
      params.append('country', country);
    }
    
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/onboarding/api/pricing/by-country/?${params}`;
    console.log('🎯 [Pricing API] Backend URL:', backendUrl);
    console.log('🎯 [Pricing API] Params sent to backend:', params.toString());
    console.log('🎯 [Pricing API] Country parameter details:', {
      queryCountry: country,
      cfCountry: cfCountry,
      headerValue: cfCountry || country || ''
    });
    
    // Forward to Django backend (public endpoint)
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': ip || '',
        'X-Real-IP': ip || '',
        'CF-Connecting-IP': cfIp || '',
        'CF-IPCountry': cfCountry || country || '', // Use country param as fallback
        'X-Country-Code': country || '', // Add explicit country header
      },
    });

    // Check if response is JSON before parsing
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('🎯 [Pricing API] Backend returned non-JSON response');
      throw new Error('Backend returned invalid response format');
    }
    
    const result = await response.json();
    
    console.log('🎯 [Pricing API] Backend raw response:', result);
    console.log('🎯 [Pricing API] === RESPONSE ANALYSIS ===');
    console.log('🎯 [Pricing API] Status:', response.status);
    console.log('🎯 [Pricing API] Country detected:', result.country_code);
    console.log('🎯 [Pricing API] Discount %:', result.discount_percentage);
    console.log('🎯 [Pricing API] Currency:', result.currency);
    console.log('🎯 [Pricing API] Has pricing data:', !!result.pricing);
    
    if (result.country_code !== country && country) {
      console.warn('🎯 [Pricing API] ⚠️ MISMATCH: Requested', country, 'but got', result.country_code);
      console.warn('🎯 [Pricing API] Backend might be ignoring country parameter');
      
      // Log the exact request we sent to backend
      console.log('🎯 [Pricing API] Request sent to backend:', {
        url: backendUrl,
        headers: {
          'CF-IPCountry': cfCountry || country || '',
          'X-Country-Code': country || ''
        }
      });
      
      // If backend returns US pricing for Kenya, override with hardcoded Kenya pricing
      if (country === 'KE' && result.country_code === 'US') {
        console.log('🎯 [Pricing API] Applying Kenya pricing override');
        return NextResponse.json({
          country_code: 'KE',
          discount_percentage: 50,
          currency: 'KES',
          pricing: {
            professional: {
              monthly: 7.50,
              six_month: 37.50,
              yearly: 72.00,
              monthly_display: '$7.50',
              six_month_display: '$37.50',
              yearly_display: '$72.00'
            },
            enterprise: {
              monthly: 22.50,
              six_month: 112.50,
              yearly: 216.00,
              monthly_display: '$22.50',
              six_month_display: '$112.50',
              yearly_display: '$216.00'
            }
          }
        }, {
          headers: {
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        });
      }
    }
    
    if (!response.ok) {
      return NextResponse.json(
        { error: result.error || 'Failed to get pricing' },
        { status: response.status }
      );
    }

    // Add cache headers for performance
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
    
  } catch (error) {
    console.error('Error getting pricing by country:', error);
    
    // Return default US pricing on error
    return NextResponse.json({
      country_code: 'US',
      discount_percentage: 0,
      pricing: {
        professional: {
          monthly: 15.00,
          six_month: 78.00,
          yearly: 144.00,
          monthly_display: '$15.00',
          six_month_display: '$78.00',
          yearly_display: '$144.00'
        },
        enterprise: {
          monthly: 45.00,
          six_month: 234.00,
          yearly: 432.00,
          monthly_display: '$45.00',
          six_month_display: '$234.00',
          yearly_display: '$432.00'
        }
      }
    });
  }
}