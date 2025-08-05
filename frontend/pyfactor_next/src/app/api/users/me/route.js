import { NextResponse } from 'next/server';
import { makeRequest } from '@/utils/api';

export async function GET(request) {
  try {
    console.log('[User Me API] Fetching user profile...');
    
    // Get user profile data
    const response = await makeRequest('users/me/', {
      method: 'GET',
    });
    
    console.log('[User Me API] User data received:', {
      email: response.email,
      business_name: response.business_name,
      country: response.country,
      state: response.state
    });
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('[User Me API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch user profile' },
      { status: error.status || 500 }
    );
  }
}