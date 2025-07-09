import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    console.log('🚨 [Debug API] Starting Kenya pricing debug');
    
    // Test backend debug endpoint
    const debugUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/onboarding/api/debug/kenya-pricing/?country=KE`;
    console.log('🚨 [Debug API] Calling backend debug URL:', debugUrl);
    
    const debugResponse = await fetch(debugUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const debugData = await debugResponse.json();
    console.log('🚨 [Debug API] Backend debug response:', debugData);
    
    // Also test the main pricing endpoint
    const pricingUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/onboarding/api/pricing/by-country/?country=KE`;
    console.log('🚨 [Debug API] Calling pricing URL:', pricingUrl);
    
    const pricingResponse = await fetch(pricingUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'CF-IPCountry': 'KE',
        'X-Country-Code': 'KE',
      },
    });
    
    const pricingData = await pricingResponse.json();
    console.log('🚨 [Debug API] Pricing response:', pricingData);
    
    return NextResponse.json({
      debug: debugData,
      pricing: pricingData,
      expected_pricing: {
        professional: {
          monthly: 7.50,
          six_month: 39.00,
          yearly: 72.00
        },
        enterprise: {
          monthly: 22.50,
          six_month: 117.00,
          yearly: 216.00
        }
      },
      test_results: {
        kenya_in_db: debugData.kenya_in_db,
        discount_correct: debugData.discount_lookup === 50,
        pricing_correct: pricingData.discount_percentage === 50
      }
    });
    
  } catch (error) {
    console.error('🚨 [Debug API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}