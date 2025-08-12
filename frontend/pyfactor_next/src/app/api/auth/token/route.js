import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie) {
      return NextResponse.json({ error: 'No session' }, { status: 401 });
    }
    
    // For session-based auth, we don't need to fetch tokens
    // Just return success if we have a valid session
    return NextResponse.json({ 
      authenticated: true,
      sessionId: sidCookie.value.substring(0, 8) + '...'
    });
    
  } catch (error) {
    console.error('[Token API] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
