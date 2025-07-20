import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Proxy email sending requests to the backend Resend integration
 */
export async function POST(request) {
  try {
    const body = await request.json();
    
    // Get the session cookie for authentication
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('sid')?.value;
    
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    logger.info('[API] Proxying email request to backend', {
      to: body.to,
      subject: body.subject
    });
    
    // Forward the request to Django backend
    const response = await fetch(`${API_BASE_URL}/api/send-email/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sessionId}`,
        'X-CSRFToken': cookieStore.get('csrftoken')?.value || '',
      },
      body: JSON.stringify(body)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      logger.error('[API] Backend email send failed', {
        status: response.status,
        error: data
      });
      
      return NextResponse.json(
        { success: false, error: data.error || 'Failed to send email' },
        { status: response.status }
      );
    }
    
    logger.info('[API] Email sent successfully via backend', {
      messageId: data.message_id
    });
    
    return NextResponse.json(data);
    
  } catch (error) {
    logger.error('[API] Error proxying email request:', error);
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}