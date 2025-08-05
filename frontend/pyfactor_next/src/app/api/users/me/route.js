import { NextResponse } from 'next/server';
import { makeRequest } from '@/utils/api';

export async function GET(request) {
  try {
    console.log('🏢 [User Me API] === START GET USER PROFILE ===');
    console.log('🏢 [User Me API] Request URL:', request.url);
    console.log('🏢 [User Me API] Request method:', request.method);
    
    // Get user profile data - pass request for proper auth handling
    console.log('🏢 [User Me API] Making request to backend: users/me/');
    const response = await makeRequest('users/me/', {
      method: 'GET',
    }, request);
    
    console.log('🏢 [User Me API] Backend response received:', {
      success: !!response,
      email: response?.email,
      business_name: response?.business_name,
      country: response?.country,
      country_name: response?.country_name,
      state: response?.state,
      business_id: response?.business_id,
      tenant_id: response?.tenant_id,
      hasCountryData: !!(response?.country || response?.country_name)
    });
    
    // Add business country debugging
    if (response?.country) {
      console.log('🌍 [User Country Debug] User business country found:', {
        country_code: response.country,
        country_name: response.country_name || 'Not provided',
        state: response.state || 'Not provided',
        source: 'user_profile'
      });
    } else {
      console.log('⚠️ [User Country Debug] No business country found in user profile');
    }
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('🚨 [User Me API] Error:', error);
    console.error('🚨 [User Me API] Error details:', {
      message: error.message,
      status: error.status,
      stack: error.stack
    });
    return NextResponse.json(
      { error: error.message || 'Failed to fetch user profile' },
      { status: error.status || 500 }
    );
  }
}