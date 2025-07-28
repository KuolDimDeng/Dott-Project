import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';

const BACKEND_URL = process.env.BACKEND_URL || 'https://api.dottapps.com';

export async function PUT(request, { params }) {
  try {
    const { id, laborId } = params;
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');

    if (!sidCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const backendUrl = `${BACKEND_URL}/api/jobs/${id}/labor/${laborId}/`;
    logger.info('[Jobs Labor API] Updating labor:', { jobId: id, laborId, body });

    const response = await fetch(backendUrl, {
      method: 'PUT',
      headers: {
        'Cookie': `sid=${sidCookie.value}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const responseText = await response.text();
    if (!response.ok) {
      return NextResponse.json(
        { error: responseText || 'Failed to update labor' },
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

export async function DELETE(request, { params }) {
  try {
    const { id, laborId } = params;
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');

    if (!sidCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const backendUrl = `${BACKEND_URL}/api/jobs/${id}/labor/${laborId}/`;
    logger.info('[Jobs Labor API] Deleting labor:', { jobId: id, laborId });

    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers: {
        'Cookie': `sid=${sidCookie.value}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const responseText = await response.text();
      return NextResponse.json(
        { error: responseText || 'Failed to delete labor' },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[Jobs Labor API] Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}