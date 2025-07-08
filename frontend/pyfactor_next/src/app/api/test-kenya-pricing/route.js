import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    console.log('🧪 [Test Kenya Pricing] === START ===');
    
    // Test 1: Direct backend call with Kenya
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/onboarding/api/pricing/by-country/?country=KE`;
    console.log('🧪 [Test] Calling backend:', backendUrl);
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'CF-IPCountry': 'KE',
      },
    });
    
    const data = await response.json();
    
    console.log('🧪 [Test] Backend response:', {
      status: response.status,
      country: data.country_code,
      discount: data.discount_percentage,
      currency: data.currency,
      professional_monthly: data.pricing?.professional?.monthly,
      professional_monthly_display: data.pricing?.professional?.monthly_display,
    });
    
    // Test 2: Check if discount is applied
    const expectedDiscountedPrice = 7.50; // 50% of $15
    const actualPrice = data.pricing?.professional?.monthly;
    const discountApplied = actualPrice === expectedDiscountedPrice;
    
    return NextResponse.json({
      test: 'Kenya Pricing Test',
      backend_url: backendUrl,
      response: data,
      analysis: {
        country_detected: data.country_code,
        discount_percentage: data.discount_percentage,
        discount_applied: discountApplied,
        expected_price: expectedDiscountedPrice,
        actual_price: actualPrice,
        currency: data.currency,
      },
      issues: {
        wrong_country: data.country_code !== 'KE',
        no_discount: data.discount_percentage === 0,
        wrong_price: !discountApplied,
      }
    });
    
  } catch (error) {
    console.error('🧪 [Test] Error:', error);
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}