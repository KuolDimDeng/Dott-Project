import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';
import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'https://api.dottapps.com';

export async function GET(request) {
  console.log('[JobsVehicles] 🚗 === API CALL START ===');
  logger.info('[JobsVehicles] 🚗 === API CALL START ===');

  try {
    // Log all headers
    const headers = Object.fromEntries(request.headers.entries());
    console.log('[JobsVehicles] 🚗 Request headers:', headers);
    
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    console.log('[JobsVehicles] 🚗 All cookies:', allCookies.map(c => ({ name: c.name, valueLength: c.value?.length })));
    
    const sid = cookieStore.get('sid');
    const sessionToken = cookieStore.get('sessionToken');
    
    console.log('[JobsVehicles] 🚗 Cookie details:', { 
      hasSid: !!sid,
      sidValue: sid?.value?.substring(0, 8) + '...',
      hasSessionToken: !!sessionToken,
      sessionTokenValue: sessionToken?.value?.substring(0, 8) + '...'
    });
    
    logger.info('[JobsVehicles] 🚗 Cookie check:', { 
      hasSid: !!sid
    });

    if (!sid) {
      console.error('[JobsVehicles] 🚗 No session cookie found, all cookies:', allCookies);
      logger.error('[JobsVehicles] 🚗 No session cookie found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const backendUrl = `${BACKEND_URL}/api/jobs/vehicles/`;
    console.log('[JobsVehicles] 🚗 Making request to:', backendUrl);
    logger.info('[JobsVehicles] 🚗 Making request to:', backendUrl);

    const requestHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cookie': request.headers.get('cookie') || '',
      'Authorization': `Session ${sid.value}`,
      'X-Session-ID': sid.value,
    };
    
    console.log('[JobsVehicles] 🚗 Request headers being sent:', requestHeaders);

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: requestHeaders,
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
    const cookieStore = await cookies();
    const sid = cookieStore.get('sid');
    
    logger.info('[JobsVehicles] 🚗 Cookie check:', { 
      hasSid: !!sid
    });

    if (!sid) {
      logger.error('[JobsVehicles] 🚗 No session cookie found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the session data from the backend to ensure we have the correct tenant ID
    const sessionResponse = await fetch(`${BACKEND_URL}/api/sessions/verify/`, {
      headers: {
        'Authorization': `Session ${sid.value}`,
        'Content-Type': 'application/json',
      },
    });

    if (!sessionResponse.ok) {
      logger.warn('[JobsVehicles] 🚗 Session verification failed');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const sessionData = await sessionResponse.json();
    logger.info('[JobsVehicles] 🚗 Session data:', { user_id: sessionData.user_id, tenant_id: sessionData.tenant_id });

    const body = await request.json();
    logger.info('[JobsVehicles] 🚗 Request body:', body);

    const backendUrl = `${BACKEND_URL}/api/jobs/vehicles/`;
    logger.info('[JobsVehicles] 🚗 Making POST request to:', backendUrl);

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Session ${sid.value}`,
      'X-Session-ID': sid.value,
      'X-Tenant-ID': sessionData.tenant_id,
    };
    
    logger.info('[JobsVehicles] 🚗 Added tenant ID:', sessionData.tenant_id);

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