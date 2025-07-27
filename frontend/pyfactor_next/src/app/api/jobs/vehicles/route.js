import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';
import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'https://api.dottapps.com';

export async function GET(request) {
  logger.info('[JobsVehicles] 🚗 === API CALL START ===');

  try {
    const cookieStore = cookies();
    const sid = cookieStore.get('sid');
    const tenantId = cookieStore.get('tenantId');
    
    logger.info('[JobsVehicles] 🚗 Cookie check:', { 
      hasSid: !!sid, 
      hasTenantId: !!tenantId 
    });

    if (!sid) {
      logger.error('[JobsVehicles] 🚗 No session cookie found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const backendUrl = `${BACKEND_URL}/api/jobs/vehicles/`;
    logger.info('[JobsVehicles] 🚗 Making request to:', backendUrl);

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Session ${sid.value}`,
      'X-Session-ID': sid.value,
    };
    
    // Add tenant ID if available
    if (tenantId) {
      headers['X-Tenant-ID'] = tenantId.value;
      logger.info('[JobsVehicles] 🚗 Added tenant ID:', tenantId.value);
    }

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    logger.info('[JobsVehicles] 🚗 Backend response status:', response.status);
    logger.info('[JobsVehicles] 🚗 Backend response headers:', Object.fromEntries(response.headers));

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('[JobsVehicles] 🚗 Backend error:', { 
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        isHtml: errorText.includes('<!DOCTYPE') || errorText.includes('<html')
      });
      
      // Check if we got HTML instead of JSON (common auth redirect issue)
      if (errorText.includes('<!DOCTYPE') || errorText.includes('<html')) {
        logger.error('[JobsVehicles] 🚗 Received HTML instead of JSON - likely auth redirect');
        return NextResponse.json(
          { error: 'Authentication failed - received HTML response' },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { 
          error: `Backend error: ${response.status} ${response.statusText}`,
          details: errorText 
        },
        { status: response.status }
      );
    }

    const responseText = await response.text();
    logger.info('[JobsVehicles] 🚗 Raw response text:', responseText.substring(0, 200));
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      logger.error('[JobsVehicles] 🚗 Failed to parse JSON:', parseError);
      logger.error('[JobsVehicles] 🚗 Response was:', responseText.substring(0, 500));
      return NextResponse.json(
        { error: 'Invalid JSON response from backend' },
        { status: 500 }
      );
    }
    
    logger.info('[JobsVehicles] 🚗 Backend response data:', { 
      dataType: typeof data, 
      isArray: Array.isArray(data),
      count: Array.isArray(data) ? data.length : 'not array',
      hasResults: data && typeof data === 'object' && 'results' in data
    });

    return NextResponse.json(data);

  } catch (error) {
    logger.error('[JobsVehicles] 🚗 Error:', error);
    logger.error('[JobsVehicles] 🚗 Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  logger.info('[JobsVehicles] 🚗 === CREATE VEHICLE START ===');

  try {
    const cookieStore = cookies();
    const sid = cookieStore.get('sid');
    const tenantId = cookieStore.get('tenantId');
    
    logger.info('[JobsVehicles] 🚗 Cookie check:', { 
      hasSid: !!sid, 
      hasTenantId: !!tenantId 
    });

    if (!sid) {
      logger.error('[JobsVehicles] 🚗 No session cookie found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    logger.info('[JobsVehicles] 🚗 Request body:', body);

    const backendUrl = `${BACKEND_URL}/api/jobs/vehicles/`;
    logger.info('[JobsVehicles] 🚗 Making POST request to:', backendUrl);

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Session ${sid.value}`,
      'X-Session-ID': sid.value,
    };
    
    // Add tenant ID if available
    if (tenantId) {
      headers['X-Tenant-ID'] = tenantId.value;
      logger.info('[JobsVehicles] 🚗 Added tenant ID:', tenantId.value);
    }

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(body),
    });

    logger.info('[JobsVehicles] 🚗 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('[JobsVehicles] 🚗 Backend error:', { 
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        isHtml: errorText.includes('<!DOCTYPE') || errorText.includes('<html')
      });
      
      // Check if we got HTML instead of JSON (common auth redirect issue)
      if (errorText.includes('<!DOCTYPE') || errorText.includes('<html')) {
        logger.error('[JobsVehicles] 🚗 Received HTML instead of JSON - likely auth redirect');
        return NextResponse.json(
          { error: 'Authentication failed - received HTML response' },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { 
          error: `Backend error: ${response.status} ${response.statusText}`,
          details: errorText 
        },
        { status: response.status }
      );
    }

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      logger.error('[JobsVehicles] 🚗 Failed to parse JSON:', parseError);
      logger.error('[JobsVehicles] 🚗 Response was:', responseText.substring(0, 500));
      return NextResponse.json(
        { error: 'Invalid JSON response from backend' },
        { status: 500 }
      );
    }
    
    logger.info('[JobsVehicles] 🚗 Vehicle created successfully:', data);

    return NextResponse.json(data, { status: 201 });

  } catch (error) {
    logger.error('[JobsVehicles] 🚗 Error creating vehicle:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}