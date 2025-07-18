import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001';

export async function GET(request) {
  try {
    console.log('[API Route] GET /api/hr/test - Starting');
    
    const backendUrl = `${BACKEND_URL}/api/hr/api/test/`;
    console.log('[API Route] Fetching from backend:', backendUrl);

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('[API Route] Backend response status:', response.status);

    const text = await response.text();
    console.log('[API Route] Response text:', text);

    try {
      const data = JSON.parse(text);
      return NextResponse.json(data);
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid response from backend', response: text },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[API] Error in test route:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}