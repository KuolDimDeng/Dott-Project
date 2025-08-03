import { NextResponse } from 'next/server';
import { makeRequest } from '@/utils/api';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');
    const state = searchParams.get('state');
    
    console.log('🎯 [Tax Rates API] Fetching rates for:', { country, state });
    
    // Fetch global sales tax rate for the specified location
    const endpoint = state 
      ? `taxes/global-rates/sales-tax/?country=${country}&state=${state}`
      : `taxes/global-rates/sales-tax/?country=${country}`;
      
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