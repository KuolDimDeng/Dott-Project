import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

export async function POST(request) {
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

    const { currentStep, payrollData } = await request.json();

    // Save payroll progress to backend
    const response = await fetch(`${process.env.BACKEND_URL}/api/payroll/save-progress/`, {
      method: 'POST',
      headers: {
        'Cookie': request.headers.get('cookie') || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        current_step: currentStep,
        payroll_data: payrollData
      })
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        success: true,
        payrollId: data.payroll_id
      });
    } else {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.detail || 'Failed to save progress' },
        { status: response.status }
      );
    }

  } catch (error) {
    logger.error('Error saving payroll progress:', error);
    return NextResponse.json(
      { error: 'Failed to save payroll progress' },
      { status: 500 }
    );
  }
}