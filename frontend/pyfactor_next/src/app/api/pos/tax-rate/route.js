import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.dottapps.com';

export async function GET(request) {
  console.log('[POS Tax Rate API] === START ===');
  
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      console.warn('[POS Tax Rate API] No session cookie found');
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    console.log('[POS Tax Rate API] Fetching user info to get business location...');
    
    // First get user's business location
    const userResponse = await fetch(`${BACKEND_URL}/api/users/me/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
    });

    if (!userResponse.ok) {
      console.error('[POS Tax Rate API] Failed to fetch user info:', userResponse.status);
      return NextResponse.json({ 
        error: 'Failed to fetch user information',
        estimated_rate: 0,
        tax_type: 'sales_tax',
        is_estimate: true,
        disclaimer: 'Could not determine location. Please set tax rate manually.'
      }, { status: 200 });
    }

    const userData = await userResponse.json();
    console.log('[POS Tax Rate API] User data:', {
      country: userData.country,
      state: userData.state,
      business_name: userData.business_name
    });

    // Now fetch the tax rate - first check tenant-specific settings
    const country = userData.country || 'US';
    const state = userData.state || '';
    
    console.log(`[POS Tax Rate API] Checking tenant-specific tax settings for ${country}${state ? `/${state}` : ''}...`);
    
    // First try to get tenant-specific settings
    const tenantTaxResponse = await fetch(`${BACKEND_URL}/api/taxes/tenant-settings/current/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
    });

    if (tenantTaxResponse.ok) {
      const tenantData = await tenantTaxResponse.json();
      console.log('[POS Tax Rate API] Tenant tax data:', {
        source: tenantData.source,
        rate: tenantData.settings?.sales_tax_rate
      });

      // If tenant has custom settings or global settings exist
      if (tenantData.source !== 'none' && tenantData.settings) {
        const settings = tenantData.settings;
        return NextResponse.json({
          estimated_rate: settings.rate_percentage || (settings.sales_tax_rate * 100),
          tax_type: settings.sales_tax_type || 'sales_tax',
          is_estimate: false, // Not an estimate if using tenant settings
          is_custom: tenantData.source === 'tenant',
          confidence: settings.ai_confidence_score || 1.0,
          disclaimer: tenantData.source === 'tenant' 
            ? 'Using your custom tax rate settings.' 
            : 'Using default tax rate for your location.',
          country: country,
          country_name: settings.country_name || country,
          region: state,
          region_name: settings.region_name || state,
          manually_verified: settings.manually_verified || (tenantData.source === 'tenant'),
          source: tenantData.source
        }, { status: 200 });
      }
    }

    // Fallback to global rate lookup if no tenant settings
    console.log(`[POS Tax Rate API] No tenant settings found, falling back to global rates...`);
    
    const taxResponse = await fetch(`${BACKEND_URL}/api/taxes/global-rates/lookup/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
      body: JSON.stringify({
        country: country,
        region_code: state,
        fetch_if_missing: true  // This triggers AI lookup if not in database
      }),
    });

    if (!taxResponse.ok) {
      console.warn('[POS Tax Rate API] Tax rate lookup failed:', taxResponse.status);
      // Return default 0% with disclaimer
      return NextResponse.json({
        estimated_rate: 0,
        tax_type: 'sales_tax',
        is_estimate: true,
        confidence: 0,
        disclaimer: 'Tax rate could not be determined. Please verify and set manually.',
        country: country,
        region: state,
        ai_notes: 'Failed to fetch rate'
      }, { status: 200 });
    }

    const taxData = await taxResponse.json();
    console.log('[POS Tax Rate API] Tax rate data:', taxData);

    // Format response for POS
    const response = {
      estimated_rate: taxData.rate ? parseFloat(taxData.rate) * 100 : 0,
      tax_type: taxData.tax_type || 'sales_tax',
      is_estimate: true,
      confidence: taxData.ai_confidence_score || 0,
      disclaimer: 'This is an AI-estimated tax rate. Please verify with local regulations.',
      country: country,
      country_name: taxData.country_name || country,
      region: state,
      region_name: taxData.region_name || state,
      ai_notes: taxData.ai_source_notes || '',
      last_updated: taxData.ai_last_verified,
      manually_verified: taxData.manually_verified || false
    };

    console.log('[POS Tax Rate API] Sending response:', response);
    console.log('[POS Tax Rate API] === END ===');
    
    return NextResponse.json(response, { status: 200 });
    
  } catch (error) {
    console.error('[POS Tax Rate API] Unexpected error:', error);
    return NextResponse.json({
      estimated_rate: 0,
      tax_type: 'sales_tax',
      is_estimate: true,
      confidence: 0,
      disclaimer: 'An error occurred. Please set tax rate manually.',
      error: error.message
    }, { status: 200 }); // Return 200 to avoid breaking POS
  }
}