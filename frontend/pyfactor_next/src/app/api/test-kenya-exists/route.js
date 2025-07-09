import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🚨 [Test Kenya] Checking if Kenya exists in backend database...');
    
    // Call the backend debug endpoint
    const debugUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/onboarding/api/debug/kenya-pricing/?country=KE`;
    console.log('🚨 [Test Kenya] Calling:', debugUrl);
    
    const response = await fetch(debugUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('🚨 [Test Kenya] Response status:', response.status);
    
    if (!response.ok) {
      console.error('🚨 [Test Kenya] Backend returned error:', response.status);
      
      // Try the main pricing endpoint as fallback
      const pricingUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/onboarding/api/pricing/by-country/?country=KE`;
      console.log('🚨 [Test Kenya] Trying pricing endpoint:', pricingUrl);
      
      const pricingResponse = await fetch(pricingUrl);
      const pricingData = await pricingResponse.json();
      
      return NextResponse.json({
        error: 'Debug endpoint failed',
        pricing_endpoint_result: pricingData,
        kenya_discount_applied: pricingData.discount_percentage === 50
      });
    }
    
    const data = await response.json();
    console.log('🚨 [Test Kenya] Debug data:', data);
    
    return NextResponse.json({
      kenya_exists: data.kenya_in_db,
      kenya_details: data.kenya_details,
      discount: data.discount_lookup,
      total_countries: data.total_countries,
      active_countries: data.active_countries,
      test_passed: data.kenya_in_db && data.discount_lookup === 50
    });
    
  } catch (error) {
    console.error('🚨 [Test Kenya] Error:', error);
    return NextResponse.json({ 
      error: error.message,
      suggestion: 'Check if backend migrations have run: python manage.py migrate'
    }, { status: 500 });
  }
}