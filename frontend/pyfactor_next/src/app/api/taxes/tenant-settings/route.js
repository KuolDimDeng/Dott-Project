import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

/**
 * GET /api/taxes/tenant-settings
 * Get tax settings for the current tenant (user's business)
 */
export async function GET(request) {
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      console.error('[Tenant Settings] No session cookie found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('[Tenant Settings] Fetching tax settings from backend');

    // First, fetch the user's business location to determine default tax rate
    const profileResponse = await fetch(`${BACKEND_URL}/api/auth/session-profile/`, {
      method: 'GET',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Content-Type': 'application/json',
      },
    });

    if (!profileResponse.ok) {
      console.error('[Tenant Settings] Failed to fetch user profile');
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: profileResponse.status }
      );
    }

    const userProfile = await profileResponse.json();
    console.log('[Tenant Settings] User business location:', {
      country: userProfile.country,
      state: userProfile.state,
      county: userProfile.county
    });

    // Build query parameters for tax calculation
    const queryParams = new URLSearchParams({
      country: userProfile.country || '',
      ...(userProfile.state && { state: userProfile.state }),
      ...(userProfile.county && { county: userProfile.county })
    });

    // Fetch the tax rate for the business location
    const taxResponse = await fetch(
      `${BACKEND_URL}/api/taxes/calculate/?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Session ${sidCookie.value}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!taxResponse.ok) {
      console.error('[Tenant Settings] Failed to calculate tax rate');
      return NextResponse.json({
        settings: {
          sales_tax_rate: 0,
          country: userProfile.country || '',
          country_name: userProfile.country || '',
          region_code: userProfile.state || '',
          region_name: userProfile.state || ''
        },
        source: 'default'
      });
    }

    const taxData = await taxResponse.json();
    console.log('[Tenant Settings] Tax calculation result:', taxData);

    // Format response for POS consumption
    return NextResponse.json({
      settings: {
        sales_tax_rate: taxData.tax_rate || 0,
        country: userProfile.country || '',
        country_name: taxData.country_name || userProfile.country || '',
        region_code: userProfile.state || '',
        region_name: taxData.state_name || userProfile.state || '',
        county: userProfile.county || '',
        county_name: taxData.county_name || userProfile.county || ''
      },
      source: taxData.source || 'global',
      tax_authority: taxData.tax_authority || null
    });

  } catch (error) {
    console.error('[Tenant Settings] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        settings: {
          sales_tax_rate: 0
        },
        source: 'error'
      },
      { status: 500 }
    );
  }
}