import { NextResponse } from 'next/server';
import { makeRequest } from '@/utils/api';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');
    const state = searchParams.get('state');
    const county = searchParams.get('county');
    
    console.log('🎯 [Tax Rates API] Fetching rates for:', { country, state, county });
    
    // Build endpoint based on parameters
    let endpoint = `taxes/global-rates/sales-tax/?country=${country}`;
    if (state) {
      endpoint += `&state=${state}`;
    }
    if (county) {
      endpoint += `&county=${county}`;
    }
      
    const response = await makeRequest(endpoint, {
      method: 'GET',
    });
    
    console.log('🎯 [Tax Rates API] Response:', response);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('🎯 [Tax Rates API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tax rates' },
      { status: error.status || 500 }
    );
  }
}