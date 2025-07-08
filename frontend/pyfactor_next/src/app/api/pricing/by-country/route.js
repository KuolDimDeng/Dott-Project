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
    
    // Log for debugging
    console.log('[Pricing API] Request details:', {
      country: country,
      cfIp,
      cfCountry,
      forwarded,
      realIp,
      finalIp: ip,
      backendUrl: `${process.env.NEXT_PUBLIC_API_URL}/onboarding/api/pricing/by-country/?${params}`
    });
    
    // Build query params
    const params = new URLSearchParams();
    if (country) {
      params.append('country', country);
    }
    
    // Forward to Django backend (public endpoint)
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/onboarding/api/pricing/by-country/?${params}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': ip || '',
          'X-Real-IP': ip || '',
          'CF-Connecting-IP': cfIp || '',
          'CF-IPCountry': cfCountry || '',
        },
      }
    );

    const result = await response.json();
    
    console.log('[Pricing API] Backend response:', {
      status: response.status,
      country_code: result.country_code,
      discount_percentage: result.discount_percentage,
      currency: result.currency
    });
    
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