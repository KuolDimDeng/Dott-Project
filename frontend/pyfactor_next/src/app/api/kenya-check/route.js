import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🚨 [Kenya Check] Testing Kenya pricing...');
    
    // Call the public pricing endpoint
    const pricingUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/onboarding/api/pricing/by-country/?country=KE`;
    console.log('🚨 [Kenya Check] Calling:', pricingUrl);
    
    const response = await fetch(pricingUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('🚨 [Kenya Check] Response status:', response.status);
    
    if (!response.ok) {
      return NextResponse.json({
        error: `API returned ${response.status}`,
        kenya_pricing_working: false
      });
    }
    
    const data = await response.json();
    console.log('🚨 [Kenya Check] Response data:', data);
    
    // Check if Kenya pricing is working
    const kenyaPricingWorking = data.country_code === 'KE' && data.discount_percentage === 50;
    
    return NextResponse.json({
      kenya_pricing_working: kenyaPricingWorking,
      response_data: data,
      expected: {
        country_code: 'KE',
        discount_percentage: 50,
        professional_monthly: 7.50
      },
      actual: {
        country_code: data.country_code,
        discount_percentage: data.discount_percentage,
        professional_monthly: data.pricing?.professional?.monthly
      },
      test_result: kenyaPricingWorking ? '✅ PASS' : '❌ FAIL',
      fix_instructions: !kenyaPricingWorking ? [
        '1. SSH into production server',
        '2. Run: python manage.py populate_developing_countries',
        '3. Or simply redeploy the backend service'
      ] : null
    });
    
  } catch (error) {
    console.error('🚨 [Kenya Check] Error:', error);
    return NextResponse.json({ 
      error: error.message,
      kenya_pricing_working: false
    }, { status: 500 });
  }
}