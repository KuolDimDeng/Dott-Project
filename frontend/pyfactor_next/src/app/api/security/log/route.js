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
    // Only send events that don't require authentication (like login failures)
    if (process.env.NODE_ENV === 'production') {
      try {
        // Filter events that can be sent without authentication
        const publicEvents = enrichedEvents.filter(event => 
          event.type === 'LOGIN_FAILED' || 
          event.type === 'RATE_LIMIT_EXCEEDED' ||
          event.type === 'SUSPICIOUS_ACTIVITY'
        );
        
        // Only send to backend if we have a session token or if it's a public event
        if (sessionToken || publicEvents.length > 0) {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
          const eventsToSend = sessionToken ? enrichedEvents : publicEvents;
          
          // Don't send to backend if no events to send
          if (eventsToSend.length > 0) {
            // For now, skip sending to backend for login failures since it requires tenant
            // Just log them server-side
            logger.info('[SecurityLog] Skipping backend send for security events without session');
          }
        }
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