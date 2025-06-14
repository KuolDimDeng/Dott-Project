import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

export async function POST(request) {
  try {
    // This endpoint syncs Auth0 users with the database
    // It removes database users that no longer exist in Auth0
    
    // Get auth token from cookies
    const cookies = request.headers.get('cookie') || '';
    const accessToken = cookies
      .split(';')
      .find(c => c.trim().startsWith('access_token='))
      ?.split('=')[1];

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get admin verification (optional - add your own admin check)
    const { adminPassword } = await request.json();
    
    // Simple admin check - in production, use proper admin role checking
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Admin authorization required' },
        { status: 403 }
      );
    }

    // Call backend to sync Auth0 users
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const response = await fetch(`${backendUrl}/api/admin/sync-auth0-users/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('[Admin] Failed to sync Auth0 users:', error);
      return NextResponse.json(
        { error: 'Failed to sync users' },
        { status: response.status }
      );
    }

    const result = await response.json();
    logger.info('[Admin] Auth0 sync completed:', result);

    return NextResponse.json({
      success: true,
      message: 'Auth0 users synced successfully',
      ...result
    });

  } catch (error) {
    logger.error('[Admin] Sync Auth0 error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  // Provide information about orphaned users (in DB but not in Auth0)
  try {
    const cookies = request.headers.get('cookie') || '';
    const accessToken = cookies
      .split(';')
      .find(c => c.trim().startsWith('access_token='))
      ?.split('=')[1];

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const response = await fetch(`${backendUrl}/api/admin/orphaned-users/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to get orphaned users' },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    logger.error('[Admin] Get orphaned users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}