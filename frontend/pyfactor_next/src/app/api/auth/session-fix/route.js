import { NextResponse } from 'next/server';

/**
 * Session fix endpoint that works with localStorage/sessionStorage
 * This bypasses cookie issues in production
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { action, sessionData } = body;
    
    if (action === 'save') {
      // Return success - frontend will handle localStorage
      return NextResponse.json({ 
        success: true, 
        message: 'Session saved (client-side storage)'
      });
    }
    
    if (action === 'get') {
      // Return null - frontend should check localStorage
      return NextResponse.json({ 
        session: null,
        message: 'Check client-side storage'
      });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[Session Fix] Error:', error);
    return NextResponse.json({ error: 'Session fix error' }, { status: 500 });
  }
}