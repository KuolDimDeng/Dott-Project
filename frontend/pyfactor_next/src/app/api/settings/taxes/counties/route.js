import { NextResponse } from 'next/server';
import { makeRequest } from '@/utils/api';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');
    const state = searchParams.get('state');
    
    console.log('🎯 [Tax Counties API] Fetching counties for:', { country, state });
    
    if (!country || !state) {
      return NextResponse.json(
        { error: 'Country and state parameters are required' },
        { status: 400 }
      );
    }
    
    // Fetch counties from backend
    const response = await makeRequest(`taxes/tenant-settings/counties/?country=${country}&state=${state}`, {
      method: 'GET',
    }, request);
    
    console.log('🎯 [Tax Counties API] Response:', response);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('🎯 [Tax Counties API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch counties' },
      { status: error.status || 500 }
    );
  }
}