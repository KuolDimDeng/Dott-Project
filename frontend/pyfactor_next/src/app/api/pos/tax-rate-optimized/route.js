import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.dottapps.com';

export async function GET(request) {
  console.log('[POS Tax Optimized] === START ===');
  
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      console.warn('[POS Tax Optimized] No session cookie found');
      return NextResponse.json({ 
        success: false,
        error: 'No session found',
        tax_rate: 0,
        rate_percentage: 0
      }, { status: 401 });
    }

    // Use the new optimized endpoint that returns cached rates
    const response = await fetch(`${BACKEND_URL}/api/taxes/pos/default-rate/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
        'Cookie': `sid=${sidCookie.value}`,
      },
    });

    if (!response.ok) {
      console.error('[POS Tax Optimized] Backend error:', response.status);
      // Return zero rate instead of error to not break POS
      return NextResponse.json({
        success: true,
        settings: {
          sales_tax_rate: 0,
          rate_percentage: 0,
          country: 'Unknown',
          country_name: 'Not configured'
        },
        source: 'none'
      }, { status: 200 });
    }

    const data = await response.json();
    console.log('[POS Tax Optimized] Response:', data);

    // Transform response to match existing frontend expectations
    return NextResponse.json({
      success: true,
      settings: {
        sales_tax_rate: data.tax_rate || 0,  // As decimal
        rate_percentage: data.rate_percentage || 0,  // As percentage
        country: data.jurisdiction?.split(',')[0] || 'Unknown',
        country_name: data.jurisdiction || 'Not configured',
        region_name: data.jurisdiction?.split(',')[1]?.trim() || '',
        cached: data.cached || false,
        manually_verified: data.source === 'tenant'
      },
      source: data.source || 'none'
    }, { status: 200 });
    
  } catch (error) {
    console.error('[POS Tax Optimized] Unexpected error:', error);
    return NextResponse.json({
      success: true,  // Return success to not break POS
      settings: {
        sales_tax_rate: 0,
        rate_percentage: 0,
        country: 'Error',
        country_name: 'Error loading tax rate'
      },
      source: 'none'
    }, { status: 200 });
  }
}

// Customer-specific tax rate calculation
export async function POST(request) {
  console.log('[POS Tax Optimized] Customer rate calculation');
  
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      return NextResponse.json({ 
        success: false,
        error: 'No session found',
        tax_rate: 0,
        rate_percentage: 0
      }, { status: 401 });
    }

    const body = await request.json();
    const { customer_id, country, state, county } = body;

    // Build query params
    const params = new URLSearchParams();
    if (customer_id) params.append('customer_id', customer_id);
    if (country) params.append('country', country);
    if (state) params.append('state', state);
    if (county) params.append('county', county);

    const response = await fetch(
      `${BACKEND_URL}/api/taxes/pos/customer-rate/?${params}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Session ${sidCookie.value}`,
          'Cookie': `sid=${sidCookie.value}`,
        },
      }
    );

    if (!response.ok) {
      console.error('[POS Tax Optimized] Customer rate error:', response.status);
      return NextResponse.json({
        success: true,
        tax_rate: 0,
        rate_percentage: 0,
        jurisdiction: 'Error',
        source: 'none'
      }, { status: 200 });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
    
  } catch (error) {
    console.error('[POS Tax Optimized] Customer rate error:', error);
    return NextResponse.json({
      success: true,
      tax_rate: 0,
      rate_percentage: 0,
      jurisdiction: 'Error',
      source: 'none'
    }, { status: 200 });
  }
}