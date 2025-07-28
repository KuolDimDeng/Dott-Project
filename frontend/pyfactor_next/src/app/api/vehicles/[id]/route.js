import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';

const BACKEND_URL = process.env.BACKEND_URL || 'https://api.dottapps.com';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    logger.info('[Vehicle Detail API] GET request received for vehicle:', id);
    
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');

    if (!sidCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const backendUrl = `${BACKEND_URL}/api/jobs/vehicles/${id}/`;
    logger.info('[Vehicle Detail API] Forwarding to backend:', backendUrl);

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Cookie': `sid=${sidCookie.value}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
    });

    const responseText = await response.text();
    logger.info('[Vehicle Detail API] Backend response:', {
      status: response.status,
      statusText: response.statusText,
      bodyPreview: responseText.substring(0, 200)
    });

    if (!response.ok) {
      logger.error('[Vehicle Detail API] Backend error:', {
        status: response.status,
        body: responseText
      });
      return NextResponse.json(
        { error: responseText || 'Failed to fetch vehicle' },
        { status: response.status }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      logger.error('[Vehicle Detail API] JSON parse error:', parseError);
      return NextResponse.json({ error: 'Invalid response format' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error('[Vehicle Detail API] Error:', {
      error: error.message,
      stack: error.stack
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    logger.info('[Vehicle Detail API] PUT request received for vehicle:', id);
    
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');

    if (!sidCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const backendUrl = `${BACKEND_URL}/api/jobs/vehicles/${id}/`;

    logger.info('[Vehicle Detail API] Forwarding to backend:', backendUrl);

    const response = await fetch(backendUrl, {
      method: 'PUT',
      headers: {
        'Cookie': `sid=${sidCookie.value}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    logger.info('[Vehicle Detail API] Backend response:', {
      status: response.status,
      statusText: response.statusText,
      bodyPreview: responseText.substring(0, 200)
    });

    if (!response.ok) {
      logger.error('[Vehicle Detail API] Backend error:', {
        status: response.status,
        body: responseText
      });
      return NextResponse.json(
        { error: responseText || 'Failed to update vehicle' },
        { status: response.status }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      logger.error('[Vehicle Detail API] JSON parse error:', parseError);
      return NextResponse.json({ error: 'Invalid response format' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error('[Vehicle Detail API] Error:', {
      error: error.message,
      stack: error.stack
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    logger.info('[Vehicle Detail API] DELETE request received for vehicle:', id);
    
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');

    if (!sidCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const backendUrl = `${BACKEND_URL}/api/jobs/vehicles/${id}/`;
    logger.info('[Vehicle Detail API] Forwarding to backend:', backendUrl);

    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers: {
        'Cookie': `sid=${sidCookie.value}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
    });

    if (response.status === 204) {
      // No content response on successful delete
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const responseText = await response.text();
    logger.info('[Vehicle Detail API] Backend response:', {
      status: response.status,
      statusText: response.statusText,
      bodyPreview: responseText.substring(0, 200)
    });

    if (!response.ok) {
      logger.error('[Vehicle Detail API] Backend error:', {
        status: response.status,
        body: responseText
      });
      return NextResponse.json(
        { error: responseText || 'Failed to delete vehicle' },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[Vehicle Detail API] Error:', {
      error: error.message,
      stack: error.stack
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}