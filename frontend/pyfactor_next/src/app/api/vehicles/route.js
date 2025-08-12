import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';

const BACKEND_URL = process.env.BACKEND_URL || 'https://api.dottapps.com';

export async function GET(request) {
  try {
    logger.info('[Vehicles API] GET request received');
    
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');

    if (!sidCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const backendUrl = `${BACKEND_URL}/api/jobs/vehicles/${queryString ? `?${queryString}` : ''}`;

    logger.info('[Vehicles API] Forwarding to backend:', backendUrl);

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Cookie': `sid=${sidCookie.value}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
    });

    const responseText = await response.text();
    logger.info('[Vehicles API] Backend response:', {
      status: response.status,
      statusText: response.statusText,
      bodyPreview: responseText.substring(0, 200)
    });

    if (!response.ok) {
      logger.error('[Vehicles API] Backend error:', {
        status: response.status,
        body: responseText
      });
      return NextResponse.json(
        { error: responseText || 'Failed to fetch vehicles' },
        { status: response.status }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      logger.error('[Vehicles API] JSON parse error:', parseError);
      return NextResponse.json({ error: 'Invalid response format' }, { status: 500 });
    }

    logger.info('[Vehicles API] Successfully fetched vehicles:', data.length || 'N/A');
    return NextResponse.json(data);
  } catch (error) {
    logger.error('[Vehicles API] Error:', {
      error: error.message,
      stack: error.stack
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    logger.info('[Vehicles API] POST request received');
    
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');

    if (!sidCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const backendUrl = `${BACKEND_URL}/api/jobs/vehicles/`;

    logger.info('[Vehicles API] Forwarding to backend:', backendUrl);

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Cookie': `sid=${sidCookie.value}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    logger.info('[Vehicles API] Backend response:', {
      status: response.status,
      statusText: response.statusText,
      bodyPreview: responseText.substring(0, 200)
    });

    if (!response.ok) {
      logger.error('[Vehicles API] Backend error:', {
        status: response.status,
        body: responseText
      });
      return NextResponse.json(
        { error: responseText || 'Failed to create vehicle' },
        { status: response.status }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      logger.error('[Vehicles API] JSON parse error:', parseError);
      return NextResponse.json({ error: 'Invalid response format' }, { status: 500 });
    }

    logger.info('[Vehicles API] Successfully created vehicle');
    return NextResponse.json(data);
  } catch (error) {
    logger.error('[Vehicles API] Error:', {
      error: error.message,
      stack: error.stack
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}