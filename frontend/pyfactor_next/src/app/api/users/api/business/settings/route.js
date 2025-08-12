import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';

const BACKEND_URL = process.env.BACKEND_URL || 'https://api.dottapps.com';

export async function GET(request) {
  try {
    logger.info('[Business Settings API] GET request received');
    
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');

    if (!sidCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // No trailing slash - Django APPEND_SLASH = False (industry standard)
    const backendUrl = `${BACKEND_URL}/users/api/business/settings`;

    logger.info('[Business Settings API] Forwarding to backend:', backendUrl);

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Cookie': `sid=${sidCookie.value}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
    });

    const responseText = await response.text();
    logger.info('[Business Settings API] Backend response:', {
      status: response.status,
      statusText: response.statusText,
      bodyPreview: responseText.substring(0, 200)
    });

    if (!response.ok) {
      logger.error('[Business Settings API] Backend error:', {
        status: response.status,
        body: responseText
      });
      return NextResponse.json(
        { error: responseText || 'Failed to fetch business settings' },
        { status: response.status }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      logger.error('[Business Settings API] JSON parse error:', parseError);
      return NextResponse.json({ error: 'Invalid response format' }, { status: 500 });
    }

    logger.info('[Business Settings API] Successfully fetched settings');
    return NextResponse.json(data);
  } catch (error) {
    logger.error('[Business Settings API] Error:', {
      error: error.message,
      stack: error.stack
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    logger.info('[Business Settings API] PATCH request received');
    
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');

    if (!sidCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    // No trailing slash - Django APPEND_SLASH = False (industry standard)
    const backendUrl = `${BACKEND_URL}/users/api/business/settings`;

    logger.info('[Business Settings API] Forwarding to backend:', backendUrl);
    logger.info('[Business Settings API] Request body:', body);

    const response = await fetch(backendUrl, {
      method: 'PATCH',
      headers: {
        'Cookie': `sid=${sidCookie.value}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    logger.info('[Business Settings API] Backend response:', {
      status: response.status,
      statusText: response.statusText,
      bodyPreview: responseText.substring(0, 200)
    });

    if (!response.ok) {
      logger.error('[Business Settings API] Backend error:', {
        status: response.status,
        body: responseText
      });
      return NextResponse.json(
        { error: responseText || 'Failed to update business settings' },
        { status: response.status }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      logger.error('[Business Settings API] JSON parse error:', parseError);
      return NextResponse.json({ error: 'Invalid response format' }, { status: 500 });
    }

    logger.info('[Business Settings API] Successfully updated settings');
    return NextResponse.json(data);
  } catch (error) {
    logger.error('[Business Settings API] Error:', {
      error: error.message,
      stack: error.stack
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}