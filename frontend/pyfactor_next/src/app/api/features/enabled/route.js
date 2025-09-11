import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/authMiddleware';
import { logger } from '@/utils/logger';

async function GET(request) {
  try {
    const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/features/enabled`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
    });

    if (!response.ok) {
      logger.error('[Features] Failed to fetch enabled features:', response.status);
      return NextResponse.json(
        { error: 'Failed to fetch features' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error('[Features] Error fetching enabled features:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export { GET };