import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

export async function GET(request) {
  try {
    console.log('🎯 [AdminLeadsStatsProxy] === GET LEADS STATS START ===');
    
    const backendUrl = `${BACKEND_URL}/api/leads/stats/`;
    console.log('🎯 [AdminLeadsStatsProxy] Backend URL:', backendUrl);
    
    // Forward the request to Django backend
    const backendResponse = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Forward cookies for authentication
        'Cookie': request.headers.get('cookie') || '',
      },
    });
    
    console.log('🎯 [AdminLeadsStatsProxy] Backend response status:', backendResponse.status);
    
    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('🎯 [AdminLeadsStatsProxy] Backend error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch leads stats from backend' },
        { status: backendResponse.status }
      );
    }
    
    const data = await backendResponse.json();
    console.log('🎯 [AdminLeadsStatsProxy] Successfully fetched leads stats:', data);
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('🎯 [AdminLeadsStatsProxy] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}