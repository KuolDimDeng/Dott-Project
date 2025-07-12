import { NextResponse } from 'next/server';
import { handleAuthError } from '@/utils/api/errorHandler';
import { logger } from '@/utils/logger';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001';

export async function GET(request, { params }) {
  const { id } = params;
  logger.info(`[HR Timesheet Settings API] GET request for ID: ${id}`);

  try {
    const sessionCookie = request.cookies.get('sid');
    if (!sessionCookie) {
      logger.warn('[HR Timesheet Settings API] No session cookie found');
      return handleAuthError();
    }

    const url = `${BACKEND_URL}/api/hr/timesheet-settings/${id}/`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Cookie': `sid=${sessionCookie.value}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error('[HR Timesheet Settings API] Backend error:', data);
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error('[HR Timesheet Settings API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  const { id } = params;
  logger.info(`[HR Timesheet Settings API] PATCH request for ID: ${id}`);

  try {
    const sessionCookie = request.cookies.get('sid');
    if (!sessionCookie) {
      logger.warn('[HR Timesheet Settings API] No session cookie found');
      return handleAuthError();
    }

    const body = await request.json();
    const url = `${BACKEND_URL}/api/hr/timesheet-settings/${id}/`;

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Cookie': `sid=${sessionCookie.value}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error('[HR Timesheet Settings API] Backend error:', data);
      return NextResponse.json(data, { status: response.status });
    }

    logger.info('[HR Timesheet Settings API] Successfully updated timesheet settings');
    return NextResponse.json(data);
  } catch (error) {
    logger.error('[HR Timesheet Settings API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  const { id } = params;
  logger.info(`[HR Timesheet Settings API] DELETE request for ID: ${id}`);

  try {
    const sessionCookie = request.cookies.get('sid');
    if (!sessionCookie) {
      logger.warn('[HR Timesheet Settings API] No session cookie found');
      return handleAuthError();
    }

    const url = `${BACKEND_URL}/api/hr/timesheet-settings/${id}/`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Cookie': `sid=${sessionCookie.value}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const data = await response.json();
      logger.error('[HR Timesheet Settings API] Backend error:', data);
      return NextResponse.json(data, { status: response.status });
    }

    logger.info('[HR Timesheet Settings API] Successfully deleted timesheet settings');
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error('[HR Timesheet Settings API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}