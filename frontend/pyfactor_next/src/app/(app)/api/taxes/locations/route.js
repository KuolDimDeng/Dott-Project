import { NextResponse } from 'next/server';
import { getServerUser } from '@/utils/getServerUser';

export async function GET(request) {
  try {
    console.log('[api/taxes/locations] Fetching location-specific tax settings');
    
    // Validate authentication
    const userResult = await getServerUser(request);
    if (!userResult.isAuthenticated || !userResult.user) {
      console.error('[api/taxes/locations] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const locationId = searchParams.get('locationId');
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }
    
    // Fetch location-specific tax settings from backend
    let backendUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/taxes/locations/`;
    if (locationId) {
      backendUrl += `?location_id=${locationId}`;
    }
    
    const backendResponse = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'X-Tenant-ID': tenantId,
        'X-User-Email': userResult.user.email
      }
    });
    
    if (!backendResponse.ok) {
      throw new Error('Failed to fetch location tax settings');
    }
    
    const data = await backendResponse.json();
    
    return NextResponse.json({
      success: true,
      locations: data.locations || []
    });
    
  } catch (error) {
    console.error('[api/taxes/locations] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch location tax settings' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    console.log('[api/taxes/locations] Saving location-specific tax settings');
    
    // Validate authentication
    const userResult = await getServerUser(request);
    if (!userResult.isAuthenticated || !userResult.user) {
      console.error('[api/taxes/locations] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { tenantId, locationId, taxProfile } = body;
    
    if (!tenantId || !locationId) {
      return NextResponse.json({ error: 'Tenant ID and Location ID required' }, { status: 400 });
    }
    
    // Save location-specific tax settings to backend
    const backendUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/taxes/locations/`;
    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId,
        'X-User-Email': userResult.user.email
      },
      body: JSON.stringify({
        location_id: locationId,
        tax_profile: taxProfile,
        updated_by: userResult.user.email
      })
    });
    
    if (!backendResponse.ok) {
      throw new Error('Failed to save location tax settings');
    }
    
    const data = await backendResponse.json();
    
    return NextResponse.json({
      success: true,
      message: 'Location tax settings saved successfully',
      data
    });
    
  } catch (error) {
    console.error('[api/taxes/locations] Error:', error);
    return NextResponse.json(
      { error: 'Failed to save location tax settings' },
      { status: 500 }
    );
  }
}