import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

export async function GET(request) {
  try {
    // Get session to verify authentication
    const sessionResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/session-v2`, {
      headers: {
        'Cookie': request.headers.get('cookie') || ''
      }
    });

    if (!sessionResponse.ok) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const sessionData = await sessionResponse.json();
    if (!sessionData.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // Check if there's an active payroll in progress
    const response = await fetch(`${process.env.BACKEND_URL}/api/payroll/current/`, {
      headers: {
        'Cookie': request.headers.get('cookie') || '',
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        currentPayroll: data.payroll || null,
        currentStep: data.current_step || 1
      });
    } else {
      // No current payroll, return empty state
      return NextResponse.json({
        currentPayroll: null,
        currentStep: 1
      });
    }

  } catch (error) {
    logger.error('Error fetching current payroll:', error);
    return NextResponse.json(
      { error: 'Failed to fetch current payroll' },
      { status: 500 }
    );
  }
}