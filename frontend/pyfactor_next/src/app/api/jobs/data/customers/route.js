import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';
import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'https://api.dottapps.com';

export async function GET(request) {
  console.log('[JobsDataCustomers] 👥 === API CALL START ===');
  logger.info('[JobsDataCustomers] 👥 === API CALL START ===');

  try {
    // Log all headers
    const headers = Object.fromEntries(request.headers.entries());
    console.log('[JobsDataCustomers] 👥 Request headers:', headers);
    
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    console.log('[JobsDataCustomers] 👥 All cookies:', allCookies.map(c => ({ name: c.name, valueLength: c.value?.length })));
    
    const sid = cookieStore.get('sid');
    const sessionToken = cookieStore.get('sessionToken');
    
    console.log('[JobsDataCustomers] 👥 Cookie details:', { 
      hasSid: !!sid,
      sidValue: sid?.value?.substring(0, 8) + '...',
      hasSessionToken: !!sessionToken,
      sessionTokenValue: sessionToken?.value?.substring(0, 8) + '...'
    });
    
    logger.info('[JobsDataCustomers] 👥 Cookie check:', { 
      hasSid: !!sid
    });

    if (!sid) {
      console.error('[JobsDataCustomers] 👥 No session cookie found, all cookies:', allCookies);
      logger.error('[JobsDataCustomers] 👥 No session cookie found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const backendUrl = `${BACKEND_URL}/api/jobs/data/customers/`;
    console.log('[JobsDataCustomers] 👥 Making request to:', backendUrl);
    logger.info('[JobsDataCustomers] 👥 Making request to:', backendUrl);

    const requestHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cookie': request.headers.get('cookie') || '',
      'Authorization': `Session ${sid.value}`,
      'X-Session-ID': sid.value,
    };
    
    console.log('[JobsDataCustomers] 👥 Request headers being sent:', requestHeaders);

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: requestHeaders,
      credentials: 'include',
    });

    logger.info('[JobsDataCustomers] 👥 Backend response status:', response.status);
    logger.info('[JobsDataCustomers] 👥 Backend response headers:', Object.fromEntries(response.headers));

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('[JobsDataCustomers] 👥 Backend error:', { 
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        isHtml: errorText.includes('<!DOCTYPE') || errorText.includes('<html')
      });
      
      // Check if we got HTML instead of JSON (common auth redirect issue)
      if (errorText.includes('<!DOCTYPE') || errorText.includes('<html')) {
        logger.error('[JobsDataCustomers] 👥 Received HTML instead of JSON - likely auth redirect');
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
    logger.info('[JobsDataCustomers] 👥 Raw response text:', responseText.substring(0, 200));
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      logger.error('[JobsDataCustomers] 👥 Failed to parse JSON:', parseError);
      logger.error('[JobsDataCustomers] 👥 Response was:', responseText.substring(0, 500));
      return NextResponse.json(
        { error: 'Invalid JSON response from backend' },
        { status: 500 }
      );
    }
    
    logger.info('[JobsDataCustomers] 👥 Backend response data:', { 
      dataType: typeof data, 
      isArray: Array.isArray(data),
      count: Array.isArray(data) ? data.length : 'not array',
      hasResults: data && typeof data === 'object' && 'results' in data
    });

    return NextResponse.json(data);

  } catch (error) {
    logger.error('[JobsDataCustomers] 👥 Error:', error);
    logger.error('[JobsDataCustomers] 👥 Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}