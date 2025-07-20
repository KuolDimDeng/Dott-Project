import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  console.log('[SessionVerify] Checking session validity...');
  
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('sid')?.value || cookieStore.get('session_token')?.value;
    
    console.log('[SessionVerify] Session token found:', !!sessionToken);
    
    if (!sessionToken) {
      return NextResponse.json({
        valid: false,
        reason: 'No session token found'
      });
    }
    
    // Check session with backend
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${API_URL}/api/sessions/public/${sessionToken}/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Origin': process.env.NEXT_PUBLIC_APP_URL || 'https://dottapps.com'
      }
    });
    
    if (response.ok) {
      const sessionData = await response.json();
      console.log('[SessionVerify] Session is valid:', sessionData);
      
      return NextResponse.json({
        valid: true,
        session: sessionData
      });
    } else {
      console.error('[SessionVerify] Session validation failed:', response.status);
      return NextResponse.json({
        valid: false,
        reason: 'Session not found in backend'
      });
    }
  } catch (error) {
    console.error('[SessionVerify] Error verifying session:', error);
    return NextResponse.json({
      valid: false,
      reason: 'Error verifying session',
      error: error.message
    }, { status: 500 });
  }
}