import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.dottapps.com';

/**
 * Security Audit Log API
 * Logs security-related events for POS operations
 */
export async function POST(request) {
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    // Must be authenticated to log events
    if (!sidCookie?.value) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const logEntry = await request.json();
    
    // Add server-side metadata
    const enrichedEntry = {
      ...logEntry,
      sessionId: sidCookie.value.substring(0, 10) + '...', // Partial session ID for correlation
      serverTimestamp: new Date().toISOString(),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      origin: request.headers.get('origin') || 'unknown'
    };

    // In production, forward to backend audit service
    if (process.env.NODE_ENV === 'production') {
      try {
        const response = await fetch(`${BACKEND_URL}/api/security/audit-log/`, {
          method: 'POST',
          headers: {
            'Authorization': `Session ${sidCookie.value}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(enrichedEntry),
        });

        if (!response.ok) {
          console.error('[Audit Log] Backend logging failed:', response.status);
        }
      } catch (backendError) {
        // Don't fail the request if audit logging fails
        console.error('[Audit Log] Backend error:', backendError);
      }
    }

    // Always log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[SECURITY AUDIT]', enrichedEntry);
    }

    // Store critical events locally as backup (last 100 events)
    if (typeof window !== 'undefined' && enrichedEntry.event?.includes('PAYMENT')) {
      try {
        const localAudit = JSON.parse(localStorage.getItem('security_audit') || '[]');
        localAudit.push({
          ...enrichedEntry,
          localTimestamp: Date.now()
        });
        
        // Keep only last 100 events
        if (localAudit.length > 100) {
          localAudit.splice(0, localAudit.length - 100);
        }
        
        localStorage.setItem('security_audit', JSON.stringify(localAudit));
      } catch (e) {
        // Ignore localStorage errors
      }
    }

    return NextResponse.json({ 
      success: true,
      logged: true,
      timestamp: enrichedEntry.serverTimestamp
    });

  } catch (error) {
    console.error('[Audit Log] Error:', error);
    
    // Don't expose internal errors
    return NextResponse.json(
      { success: false, logged: false },
      { status: 200 } // Return 200 to not break client flow
    );
  }
}

// GET endpoint to retrieve audit logs (admin only)
export async function GET(request) {
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // In production, this would check admin permissions
    // and retrieve from backend audit service
    
    // For now, return empty array
    return NextResponse.json({
      success: true,
      logs: [],
      message: 'Audit log retrieval requires admin permissions'
    });

  } catch (error) {
    console.error('[Audit Log] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve audit logs' },
      { status: 500 }
    );
  }
}