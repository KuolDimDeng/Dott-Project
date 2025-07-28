import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';
import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'https://api.dottapps.com';

export async function GET(request) {
  logger.info('[JobsDataSupplies] 📦 === API CALL START ===');

  try {
    const cookieStore = await cookies();
    const sid = cookieStore.get('sid');
    
    logger.info('[JobsDataSupplies] 📦 Cookie check:', { 
      hasSid: !!sid
    });

    if (!sid) {
      logger.error('[JobsDataSupplies] 📦 No session cookie found');
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
      logger.warn('[JobsDataSupplies] 📦 Session verification failed');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const sessionData = await sessionResponse.json();
    logger.info('[JobsDataSupplies] 📦 Session data:', { user_id: sessionData.user_id, tenant_id: sessionData.tenant_id });

    const backendUrl = `${BACKEND_URL}/api/jobs/data/supplies/`;
    logger.info('[JobsDataSupplies] 📦 Making request to:', backendUrl);

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Session ${sid.value}`,
      'X-Session-ID': sid.value,
      'X-Tenant-ID': sessionData.tenant_id,
    };
    
    logger.info('[JobsDataSupplies] 📦 Added tenant ID:', sessionData.tenant_id);

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    logger.info('[JobsDataSupplies] 📦 Backend response status:', response.status);
    logger.info('[JobsDataSupplies] 📦 Backend response headers:', Object.fromEntries(response.headers));

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('[JobsDataSupplies] 📦 Backend error:', { 
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        isHtml: errorText.includes('<!DOCTYPE') || errorText.includes('<html')
      });
      
      // Check if we got HTML instead of JSON (common auth redirect issue)
      if (errorText.includes('<!DOCTYPE') || errorText.includes('<html')) {
        logger.error('[JobsDataSupplies] 📦 Received HTML instead of JSON - likely auth redirect');
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
    logger.info('[JobsDataSupplies] 📦 Raw response text:', responseText.substring(0, 200));
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      logger.error('[JobsDataSupplies] 📦 Failed to parse JSON:', parseError);
      logger.error('[JobsDataSupplies] 📦 Response was:', responseText.substring(0, 500));
      return NextResponse.json(
        { error: 'Invalid JSON response from backend' },
        { status: 500 }
      );
    }
    
    logger.info('[JobsDataSupplies] 📦 Backend response data:', { 
      dataType: typeof data, 
      isArray: Array.isArray(data),
      count: Array.isArray(data) ? data.length : 'not array',
      hasResults: data && typeof data === 'object' && 'results' in data
    });

    return NextResponse.json(data);

  } catch (error) {
    logger.error('[JobsDataSupplies] 📦 Error:', error);
    logger.error('[JobsDataSupplies] 📦 Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}