import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';

const BACKEND_URL = process.env.BACKEND_URL || 'https://api.dottapps.com';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');

    if (!sidCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const backendUrl = `${BACKEND_URL}/api/jobs/${id}/labor/`;
    logger.info('[Jobs Labor API] Fetching labor:', { jobId: id, backendUrl });

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Cookie': `sid=${sidCookie.value}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const responseText = await response.text();
    logger.info('[Jobs Labor API] Backend response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers),
      bodyPreview: responseText.substring(0, 200)
    });

    if (!response.ok) {
      logger.error('[Jobs Labor API] Backend error:', {
        status: response.status,
        body: responseText
      });
      return NextResponse.json(
        { error: responseText || 'Failed to fetch labor' },
        { status: response.status }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      logger.error('[Jobs Labor API] JSON parse error:', parseError);
      return NextResponse.json({ error: 'Invalid response format' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error('[Jobs Labor API] Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = params;
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');

    if (!sidCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const backendUrl = `${BACKEND_URL}/api/jobs/${id}/labor/`;
    logger.info('[Jobs Labor API] Creating labor:', { jobId: id, body });

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Cookie': `sid=${sidCookie.value}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const responseText = await response.text();
    logger.info('[Jobs Labor API] Backend response:', {
      status: response.status,
      bodyPreview: responseText.substring(0, 200)
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: responseText || 'Failed to create labor' },
        { status: response.status }
      );
    }

    const data = JSON.parse(responseText);
    return NextResponse.json(data);
  } catch (error) {
    logger.error('[Jobs Labor API] Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}