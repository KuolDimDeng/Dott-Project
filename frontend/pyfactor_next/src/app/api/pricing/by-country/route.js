import { NextResponse } from 'next/server';
import { getBackendUrl } from '@/utils/backend-url';
import { getDiscountPercentage, isDevelopingCountry } from '@/utils/developingCountries';

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
    
    // Build query params - ALWAYS include country parameter
    const params = new URLSearchParams();
    
    // Force country parameter to be sent
    const countryToSend = country || cfCountry || 'US';
    params.append('country', countryToSend);
    
    // Use production API URL directly if local backend is unavailable
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const backendUrl = `${apiUrl}/api/onboarding/api/pricing/by-country/?${params}`;
    console.log('🎯 [Pricing API] Backend URL:', backendUrl);
    console.log('🎯 [Pricing API] Params sent to backend:', params.toString());
    console.log('🎯 [Pricing API] Country parameter details:', {
      queryCountry: country,
      cfCountry: cfCountry,
      countryToSend: countryToSend,
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
        'CF-IPCountry': countryToSend, // Always send the country
        'X-Country-Code': countryToSend, // Add explicit country header
        'X-Country-Override': country || '', // Original requested country
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
          'CF-IPCountry': countryToSend,
          'X-Country-Code': countryToSend
        }
      });
      
      // Manual fallback for developing country pricing
      if (country && isDevelopingCountry(country) && result.discount_percentage === 0) {
        const discount = getDiscountPercentage(country);
        console.log('🎯 [Pricing API] APPLYING MANUAL DISCOUNT for', country, ':', discount, '%');
        
        // Apply discount manually
        result.country_code = country.toUpperCase();
        result.discount_percentage = discount;
        
        // Calculate discounted prices
        const discountMultiplier = 1 - (discount / 100);
        
        // Update pricing with discount
        if (result.pricing) {
          result.pricing.professional = {
            monthly: 35.00 * discountMultiplier,
            six_month: 175.00 * discountMultiplier,  // 17% discount
            yearly: 336.00 * discountMultiplier,      // 20% discount
            monthly_display: `$${(35.00 * discountMultiplier).toFixed(2)}`,
            six_month_display: `$${(175.00 * discountMultiplier).toFixed(2)}`,
            yearly_display: `$${(336.00 * discountMultiplier).toFixed(2)}`
          };
          result.pricing.enterprise = {
            monthly: 95.00 * discountMultiplier,
            six_month: 475.00 * discountMultiplier,  // 17% discount
            yearly: 912.00 * discountMultiplier,      // 20% discount
            monthly_display: `$${(95.00 * discountMultiplier).toFixed(2)}`,
            six_month_display: `$${(475.00 * discountMultiplier).toFixed(2)}`,
            yearly_display: `$${(912.00 * discountMultiplier).toFixed(2)}`
          };
        }
        
        console.log('🎯 [Pricing API] Manual discount applied:', result);
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
          monthly: 35.00,
          six_month: 175.00,
          yearly: 336.00,
          monthly_display: '$35.00',
          six_month_display: '$175.00',
          yearly_display: '$336.00'
        },
        enterprise: {
          monthly: 95.00,
          six_month: 475.00,
          yearly: 912.00,
          monthly_display: '$95.00',
          six_month_display: '$475.00',
          yearly_display: '$912.00'
        }
      }
    });
  }
}