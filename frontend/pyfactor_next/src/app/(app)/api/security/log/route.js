import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const { events } = await request.json();
    
    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: 'Invalid events' }, { status: 400 });
    }
    
    // Get session info for context
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token');
    
    // Add server context to events
    const enrichedEvents = events.map(event => ({
      ...event,
      serverContext: {
        ip: request.headers.get('x-forwarded-for') || 
            request.headers.get('x-real-ip') || 
            'unknown',
        sessionToken: sessionToken ? sessionToken.value.substring(0, 8) + '...' : null,
        timestamp: new Date().toISOString()
      }
    }));
    
    // In production, send to backend security service
    if (process.env.NODE_ENV === 'production') {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
        await fetch(`${apiUrl}/api/security/events/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': sessionToken ? `Session ${sessionToken.value}` : ''
          },
          body: JSON.stringify({ events: enrichedEvents })
        });
      } catch (error) {
        logger.error('[SecurityLog] Failed to send to backend:', error);
      }
    }
    
    // Log to server logs
    enrichedEvents.forEach(event => {
      const logLevel = event.severity === 'CRITICAL' || event.severity === 'ERROR' ? 'error' : 'info';
      logger[logLevel]('[SECURITY_EVENT]', event);
    });
    
    return NextResponse.json({ success: true, count: events.length });
    
  } catch (error) {
    logger.error('[SecurityLog] Error processing security events:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}