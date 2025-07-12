import { NextResponse } from 'next/server';
import { handleAuthError } from '@/utils/api/errorHandler';
import { logger } from '@/utils/logger';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001';

export async function GET(request) {
  logger.info('[HR Timesheet Settings API] GET request received');

  try {
    const sessionCookie = request.cookies.get('sid');
    if (!sessionCookie) {
      logger.warn('[HR Timesheet Settings API] No session cookie found');
      return handleAuthError();
    }

    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const url = `${BACKEND_URL}/api/hr/timesheet-settings/${queryString ? `?${queryString}` : ''}`;

    logger.info(`[HR Timesheet Settings API] Fetching from: ${url}`);

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

    logger.info('[HR Timesheet Settings API] Successfully fetched timesheet settings');
    return NextResponse.json(data);
  } catch (error) {
    logger.error('[HR Timesheet Settings API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  logger.info('[HR Timesheet Settings API] POST request received');

  try {
    const sessionCookie = request.cookies.get('sid');
    if (!sessionCookie) {
      logger.warn('[HR Timesheet Settings API] No session cookie found');
      return handleAuthError();
    }

    const body = await request.json();
    const url = `${BACKEND_URL}/api/hr/timesheet-settings/`;

    logger.info(`[HR Timesheet Settings API] Creating timesheet settings`);

    const response = await fetch(url, {
      method: 'POST',
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

    logger.info('[HR Timesheet Settings API] Successfully created timesheet settings');
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    logger.error('[HR Timesheet Settings API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}