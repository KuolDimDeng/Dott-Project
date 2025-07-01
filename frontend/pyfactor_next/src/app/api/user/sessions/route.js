import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { cookies } from 'next/headers';

/**
 * API endpoint for fetching user login sessions
 * Shows active sessions across devices
 */
export async function GET(request) {
  const requestId = Math.random().toString(36).substring(2, 9);
  
  try {
    logger.debug(`[Sessions API] Fetching user sessions, request ${requestId}`);
    
    // Check authentication
    const cookieStore = await cookies();
    const sidCookie = cookieStore.get('sid');
    const sessionTokenCookie = cookieStore.get('session_token');
    const sessionCookie = cookieStore.get('dott_auth_session') || cookieStore.get('appSession');
    
    if (!sidCookie && !sessionTokenCookie && !sessionCookie) {
      logger.warn(`[Sessions API] No session found, request ${requestId}`);
      return NextResponse.json(
        { 
          error: 'Not authenticated',
          message: 'Authentication required',
          requestId 
        },
        { status: 401 }
      );
    }
    
    // Get session ID for backend call
    const sessionId = sidCookie?.value || sessionTokenCookie?.value;
    
    if (sessionId) {
      // Use backend API to get sessions
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
      
      try {
        const response = await fetch(`${API_URL}/api/sessions/list/`, {
          headers: {
            'Authorization': `Session ${sessionId}`,
            'Cookie': `session_token=${sessionId}`
          },
          cache: 'no-store'
        });
        
        if (response.ok) {
          const data = await response.json();
          logger.info(`[Sessions API] Retrieved ${data.sessions?.length || 0} sessions from backend, request ${requestId}`);
          
          // Transform backend data to match frontend expectations
          const sessions = (data.sessions || []).map(session => ({
            id: session.id,
            browser: session.user_agent ? parseBrowser(session.user_agent) : 'Unknown Browser',
            os: session.user_agent ? parseOS(session.user_agent) : 'Unknown OS',
            device_type: session.device_type || detectDeviceType(session.user_agent),
            location: session.ip_address ? `IP: ${session.ip_address}` : 'Unknown Location',
            last_active: formatLastActive(session.last_activity),
            is_current: session.is_current || session.id === sessionId,
            created_at: session.created_at,
            ip_address: session.ip_address
          }));
          
          return NextResponse.json({
            sessions,
            requestId
          });
        } else {
          logger.error(`[Sessions API] Backend request failed: ${response.status}, request ${requestId}`);
          // Fall through to mock data
        }
      } catch (error) {
        logger.error(`[Sessions API] Backend connection error: ${error.message}, request ${requestId}`);
        // Fall through to mock data
      }
    }
    
    // Mock data for development/fallback
    const mockSessions = [
      {
        id: 'current-session',
        browser: 'Chrome 120',
        os: 'macOS',
        device_type: 'desktop',
        location: 'San Francisco, CA',
        last_active: 'Just now',
        is_current: true
      },
      {
        id: 'session-2',
        browser: 'Safari 17',
        os: 'iOS 17',
        device_type: 'mobile',
        location: 'San Francisco, CA',
        last_active: '2 hours ago',
        is_current: false
      },
      {
        id: 'session-3',
        browser: 'Firefox 121',
        os: 'Windows 11',
        device_type: 'desktop',
        location: 'New York, NY',
        last_active: '1 day ago',
        is_current: false
      }
    ];
    
    logger.info(`[Sessions API] Returning mock sessions data, request ${requestId}`);
    
    return NextResponse.json({
      sessions: mockSessions,
      requestId,
      mock: true
    });
    
  } catch (error) {
    logger.error(`[Sessions API] Error fetching sessions: ${error.message}, request ${requestId}`);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch sessions', 
        message: error.message,
        requestId 
      },
      { status: 500 }
    );
  }
}

// Helper functions to parse user agent
function parseBrowser(userAgent) {
  if (!userAgent) return 'Unknown Browser';
  
  if (userAgent.includes('Chrome')) {
    const match = userAgent.match(/Chrome\/(\d+)/);
    return match ? `Chrome ${match[1]}` : 'Chrome';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    const match = userAgent.match(/Version\/(\d+)/);
    return match ? `Safari ${match[1]}` : 'Safari';
  } else if (userAgent.includes('Firefox')) {
    const match = userAgent.match(/Firefox\/(\d+)/);
    return match ? `Firefox ${match[1]}` : 'Firefox';
  } else if (userAgent.includes('Edge')) {
    const match = userAgent.match(/Edg\/(\d+)/);
    return match ? `Edge ${match[1]}` : 'Edge';
  }
  
  return 'Unknown Browser';
}

function parseOS(userAgent) {
  if (!userAgent) return 'Unknown OS';
  
  if (userAgent.includes('Windows NT 10')) return 'Windows 10';
  if (userAgent.includes('Windows NT 11')) return 'Windows 11';
  if (userAgent.includes('Mac OS X')) {
    const match = userAgent.match(/Mac OS X (\d+[._]\d+)/);
    if (match) {
      const version = match[1].replace('_', '.');
      return `macOS ${version}`;
    }
    return 'macOS';
  }
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
  if (userAgent.includes('Linux')) return 'Linux';
  
  return 'Unknown OS';
}

function detectDeviceType(userAgent) {
  if (!userAgent) return 'desktop';
  
  const mobileKeywords = ['Mobile', 'Android', 'iPhone', 'iPad', 'iPod', 'BlackBerry', 'Windows Phone'];
  const isMobile = mobileKeywords.some(keyword => userAgent.includes(keyword));
  
  return isMobile ? 'mobile' : 'desktop';
}

function formatLastActive(timestamp) {
  if (!timestamp) return 'Recently';
  
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return then.toLocaleDateString();
}