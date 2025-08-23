import { NextResponse } from 'next/server';
import { isDevelopingCountry } from '@/utils/developingCountries';

export async function GET(request) {
  try {
    // Get user's country from IP or default to US
    const country = request.headers.get('CF-IPCountry') || 
                   request.headers.get('X-Country-Code') || 
                   'US';
    
    // Check if country gets discount
    const hasDiscount = isDevelopingCountry(country);
    const discountPercentage = hasDiscount ? 50 : 0;
    
    // Base prices in USD
    const basePrices = {
      basic: { monthly: 0, annual: 0 },
      professional: { monthly: 15, annual: 144 },
      enterprise: { monthly: 45, annual: 432 }
    };
    
    // Apply discount if applicable
    const prices = {
      basic: {
        monthly: '$0',
        annual: '$0'
      },
      professional: {
        monthly: hasDiscount ? '$7.50' : '$15',
        annual: hasDiscount ? '$72' : '$144'
      },
      enterprise: {
        monthly: hasDiscount ? '$22.50' : '$45',
        annual: hasDiscount ? '$216' : '$432'
      }
    };
    
    return NextResponse.json({
      prices,
      hasDiscount,
      discountPercentage,
      country,
      basePrices
    });
    
  } catch (error) {
    console.error('[Pricing API] Error:', error);
    
    // Return default pricing on error
    return NextResponse.json({
      prices: {
        basic: { monthly: '$0', annual: '$0' },
        professional: { monthly: '$15', annual: '$144' },
        enterprise: { monthly: '$45', annual: '$432' }
      },
      hasDiscount: false,
      discountPercentage: 0,
      country: 'US',
      basePrices: {
        basic: { monthly: 0, annual: 0 },
        professional: { monthly: 15, annual: 144 },
        enterprise: { monthly: 45, annual: 432 }
      }
    });
  }
}