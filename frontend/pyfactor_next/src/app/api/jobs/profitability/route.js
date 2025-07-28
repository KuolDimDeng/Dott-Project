import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';

const BACKEND_URL = process.env.BACKEND_URL || 'https://api.dottapps.com';

export async function GET(request) {
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');

    if (!sidCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = new URLSearchParams();
    
    // Forward all query parameters
    for (const [key, value] of searchParams.entries()) {
      params.append(key, value);
    }

    const backendUrl = `${BACKEND_URL}/api/jobs/profitability/?${params.toString()}`;
    logger.info('[Jobs Profitability API] Fetching profitability:', { backendUrl });

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Cookie': `sid=${sidCookie.value}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const responseText = await response.text();
    logger.info('[Jobs Profitability API] Backend response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers),
      bodyPreview: responseText.substring(0, 200)
    });

    if (!response.ok) {
      logger.error('[Jobs Profitability API] Backend error:', {
        status: response.status,
        body: responseText
      });
      return NextResponse.json(
        { error: responseText || 'Failed to fetch profitability' },
        { status: response.status }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      logger.error('[Jobs Profitability API] JSON parse error:', parseError);
      return NextResponse.json({ error: 'Invalid response format' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error('[Jobs Profitability API] Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}