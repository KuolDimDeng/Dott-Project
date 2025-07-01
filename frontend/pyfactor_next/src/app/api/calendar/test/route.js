// Simple test endpoint to verify calendar API routing is working
import { NextResponse } from 'next/server';

export async function GET(request) {
  console.log('[Calendar Test] GET request received');
  console.log('[Calendar Test] URL:', request.url);
  console.log('[Calendar Test] Headers:', Object.fromEntries(request.headers.entries()));
  
  return NextResponse.json({ 
    success: true, 
    message: 'Calendar API routing is working',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request) {
  console.log('[Calendar Test] POST request received');
  console.log('[Calendar Test] URL:', request.url);
  
  try {
    const body = await request.json();
    console.log('[Calendar Test] Body:', body);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Calendar API POST is working',
      receivedData: body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Calendar Test] Error parsing body:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to parse body',
      message: error.message
    }, { status: 400 });
  }
}