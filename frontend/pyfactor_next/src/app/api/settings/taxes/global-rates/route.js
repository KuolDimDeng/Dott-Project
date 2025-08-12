import { NextResponse } from 'next/server';
import { makeRequest } from '@/utils/api';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');
    
    if (!country) {
      return NextResponse.json(
        { error: 'Country parameter required' },
        { status: 400 }
      );
    }
    
    console.log('🎯 [Global Tax Rates API] Fetching for country:', country);
    
    // Get global tax rates for the country
    const response = await makeRequest(`taxes/tenant-settings/global_rates/?country=${country}`, {
      method: 'GET',
    });
    
    console.log('🎯 [Global Tax Rates API] Found rates:', response.rates?.length || 0);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('🎯 [Global Tax Rates API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch global tax rates' },
      { status: error.status || 500 }
    );
  }
}