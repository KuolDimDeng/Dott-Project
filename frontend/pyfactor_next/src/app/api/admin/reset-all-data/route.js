import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

// DANGER: This endpoint deletes ALL user data
// Remove this file after using it!

export async function POST(request) {
  try {
    // Safety check - require confirmation
    const { confirmDelete, adminKey } = await request.json();
    
    if (confirmDelete !== 'DELETE_ALL_USER_DATA') {
      return NextResponse.json(
        { error: 'Must confirm with: DELETE_ALL_USER_DATA' },
        { status: 400 }
      );
    }
    
    // Simple security check
    if (adminKey !== 'temp-admin-key-delete-after-use') {
      return NextResponse.json(
        { error: 'Invalid admin key' },
        { status: 403 }
      );
    }

    // Get auth token
    const cookies = request.headers.get('cookie') || '';
    const accessToken = cookies
      .split(';')
      .find(c => c.trim().startsWith('access_token='))
      ?.split('=')[1];

    // Call backend to reset all data
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const response = await fetch(`${backendUrl}/api/admin/reset-all-data/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': accessToken ? `Bearer ${accessToken}` : ''
      },
      body: JSON.stringify({
        confirmDelete: 'DELETE_ALL_USER_DATA'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('[Admin] Failed to reset data:', error);
      return NextResponse.json(
        { error: 'Failed to reset data. You may need to run the SQL script manually.' },
        { status: response.status }
      );
    }

    const result = await response.json();
    logger.warn('[Admin] ALL USER DATA DELETED:', result);

    return NextResponse.json({
      success: true,
      message: 'All user data has been deleted. Database is now empty.',
      warning: 'DELETE THIS ENDPOINT FILE NOW!',
      ...result
    });

  } catch (error) {
    logger.error('[Admin] Reset data error:', error);
    return NextResponse.json(
      { error: 'Failed to reset data. Run the SQL script manually.' },
      { status: 500 }
    );
  }
}