import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');
    
    // Get client IP for geo-location
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip');
    
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
        },
      }
    );

    const result = await response.json();
    
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
          yearly: 144.00,
          monthly_display: '$15.00',
          yearly_display: '$144.00'
        },
        enterprise: {
          monthly: 45.00,
          yearly: 432.00,
          monthly_display: '$45.00',
          yearly_display: '$432.00'
        }
      }
    });
  }
}