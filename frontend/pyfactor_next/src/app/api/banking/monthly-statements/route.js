import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

export async function GET(request) {
  try {
    const cookieStore = cookies();
    const sessionId = cookieStore.get('sid');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const params = new URLSearchParams();
    
    // Pass through all query parameters
    searchParams.forEach((value, key) => {
      params.append(key, value);
    });
    
    // Fetch from Django backend
    const response = await fetch(`${API_BASE_URL}/api/banking/monthly-statements/?${params}`, {
      headers: {
        'Authorization': `Session ${sessionId.value}`,
        'Cookie': `sid=${sessionId.value}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      console.error('[MonthlyStatements API] Backend error:', response.status);
      const errorText = await response.text();
      console.error('[MonthlyStatements API] Error response:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch monthly statements' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[MonthlyStatements API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monthly statements' },
      { status: 500 }
    );
  }
}