import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.dottapps.com';

// GET /api/smart-insights/credits - Get user's credit balance
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    // Forward request to Django backend
    const response = await fetch(`${BACKEND_URL}/api/smart-insights/credits/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
    });

    if (!response.ok) {
      // If backend doesn't have this endpoint yet, return default credits
      if (response.status === 404) {
        return NextResponse.json({ 
          balance: 10,  // Default free credits
          total_purchased: 0,
          total_used: 0,
          monthly_spend_limit: 500,
          monthly_usage: null
        });
      }
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    logger.error('[SmartInsights-Credits] Error fetching credits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credits' },
      { status: 500 }
    );
  }
}

// POST /api/smart-insights/credits/deduct - Deduct credits after successful query
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    const { amount = 1, usage } = await request.json();

    // Forward request to Django backend
    const response = await fetch(`${BACKEND_URL}/api/smart-insights/credits/deduct/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
      body: JSON.stringify({ amount, usage })
    });

    if (!response.ok) {
      // If backend doesn't have this endpoint yet, just log it
      if (response.status === 404) {
        logger.info('[SmartInsights-Credits] Backend endpoint not available, skipping deduction');
        return NextResponse.json({ success: true });
      }
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    logger.error('[SmartInsights-Credits] Error deducting credits:', error);
    return NextResponse.json(
      { error: 'Failed to deduct credits' },
      { status: 500 }
    );
  }
}