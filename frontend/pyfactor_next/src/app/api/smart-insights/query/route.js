import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.dottapps.com';

export async function POST(request) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Get session cookie
    const cookieStore = await cookies();
    const sidCookie = cookieStore.get('sid');

    if (!sidCookie || !sidCookie.value) {
      logger.error('[SmartInsights Query API] No session cookie found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Call backend Smart Insights endpoint
    const response = await fetch(`${BACKEND_URL}/api/smart-insights/query/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: query.trim()
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      logger.error('[SmartInsights Query API] Backend error:', responseData);
      return NextResponse.json(
        { 
          error: responseData.error || responseData.detail || 'Failed to process query',
          details: responseData 
        },
        { status: response.status }
      );
    }

    // Return the response from backend
    return NextResponse.json({
      response: responseData.response,
      credits_used: responseData.credits_used,
      remaining_credits: responseData.remaining_credits,
      usage: {
        input_tokens: responseData.input_tokens,
        output_tokens: responseData.output_tokens,
        total_tokens: responseData.total_tokens
      }
    });

  } catch (error) {
    logger.error('[SmartInsights Query API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}