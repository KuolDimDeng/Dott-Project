import { NextResponse } from 'next/server';
import { makeRequest } from '@/utils/api';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');
    const state = searchParams.get('state');
    
    console.log('🎯 [Payroll Tax Rates API] Fetching rates for:', { country, state });
    
    // Fetch global payroll tax rates for the specified location
    const endpoint = state 
      ? `taxes/global-rates/payroll-tax/?country=${country}&state=${state}`
      : `taxes/global-rates/payroll-tax/?country=${country}`;
      
    const response = await makeRequest(endpoint, {
      method: 'GET',
    });
    
    console.log('🎯 [Payroll Tax Rates API] Response:', response);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('🎯 [Payroll Tax Rates API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch payroll tax rates' },
      { status: error.status || 500 }
    );
  }
}