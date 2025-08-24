import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function GET(request) {
  try {
    // Get session from headers
    const headersList = headers();
    const cookie = headersList.get('cookie');
    
    if (!cookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section');
    
    // Prepare the backend API URL
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    
    // Fetch stats from backend menu stats endpoint
    const response = await fetch(`${apiUrl}/api/analytics/menu/stats/?section=${section}`, {
      headers: { 
        'Cookie': cookie,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`[Menu Stats API] Backend returned ${response.status}`);
      return NextResponse.json({});
    }
    
    const data = await response.json();
    console.log(`[Menu Stats API] Fetched ${section} stats:`, data);
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('[Menu Stats API] Error:', error);
    // Return empty stats instead of error to prevent UI issues
    return NextResponse.json({});
  }
}