import { NextResponse } from 'next/server';
import { getServerSession } from '@/utils/auth-utils';

export async function POST(request) {
  try {
    const session = await getServerSession();
    
    if (!session?.access_token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await request.json();
    
    // Forward to Django backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/onboarding/api/discount/check-eligibility/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(
        { error: result.error || 'Failed to check discount eligibility' },
        { status: response.status }
      );
    }

    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Error checking discount eligibility:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}