import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { cookies } from 'next/headers';

/**
 * API endpoint for ending specific user sessions
 * Allows users to terminate sessions on other devices
 */
export async function DELETE(request, { params }) {
  const requestId = Math.random().toString(36).substring(2, 9);
  const sessionIdToEnd = params.id;
  
  try {
    logger.debug(`[End Session API] Ending session ${sessionIdToEnd}, request ${requestId}`);
    
    // Check authentication
    const cookieStore = await cookies();
    const sidCookie = cookieStore.get('sid');
    const sessionTokenCookie = cookieStore.get('session_token');
    const sessionCookie = cookieStore.get('dott_auth_session') || cookieStore.get('appSession');
    
    if (!sidCookie && !sessionTokenCookie && !sessionCookie) {
      logger.warn(`[End Session API] No session found, request ${requestId}`);
      return NextResponse.json(
        { 
          error: 'Not authenticated',
          message: 'Authentication required',
          requestId 
        },
        { status: 401 }
      );
    }
    
    // Get current session ID
    const currentSessionId = sidCookie?.value || sessionTokenCookie?.value;
    
    // Prevent ending current session
    if (sessionIdToEnd === 'current-session' || sessionIdToEnd === currentSessionId) {
      return NextResponse.json(
        { 
          error: 'Cannot end current session',
          message: 'You cannot end your current session. Please use logout instead.',
          requestId 
        },
        { status: 400 }
      );
    }
    
    if (currentSessionId) {
      // Use backend API to end the session
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
      
      try {
        const response = await fetch(`${API_URL}/api/sessions/${sessionIdToEnd}/end/`, {
          method: 'POST',
          headers: {
            'Authorization': `Session ${currentSessionId}`,
            'Cookie': `session_token=${currentSessionId}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            session_id: sessionIdToEnd
          })
        });
        
        if (response.ok) {
          logger.info(`[End Session API] Session ${sessionIdToEnd} ended successfully via backend, request ${requestId}`);
          return NextResponse.json({
            success: true,
            message: 'Session ended successfully',
            sessionId: sessionIdToEnd,
            requestId
          });
        } else {
          const errorData = await response.json().catch(() => ({}));
          logger.error(`[End Session API] Backend request failed: ${response.status}, request ${requestId}`);
          
          if (response.status === 404) {
            return NextResponse.json(
              { 
                error: 'Session not found',
                message: 'The session no longer exists or has already expired',
                requestId 
              },
              { status: 404 }
            );
          }
          
          return NextResponse.json(
            { 
              error: 'Failed to end session',
              message: errorData.detail || 'Unable to end the session',
              requestId 
            },
            { status: response.status }
          );
        }
      } catch (error) {
        logger.error(`[End Session API] Backend connection error: ${error.message}, request ${requestId}`);
        // Fall through to mock response
      }
    }
    
    // Mock response for development
    logger.info(`[End Session API] Mock: Session ${sessionIdToEnd} ended, request ${requestId}`);
    
    return NextResponse.json({
      success: true,
      message: 'Session ended successfully (mock)',
      sessionId: sessionIdToEnd,
      requestId,
      mock: true
    });
    
  } catch (error) {
    logger.error(`[End Session API] Error ending session: ${error.message}, request ${requestId}`);
    
    return NextResponse.json(
      { 
        error: 'Failed to end session', 
        message: error.message,
        requestId 
      },
      { status: 500 }
    );
  }
}