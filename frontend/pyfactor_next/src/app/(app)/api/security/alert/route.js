import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Handle security alerts from session monitoring
 */
export async function POST(request) {
  try {
    // Get session token
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token');
    
    if (!sessionToken) {
      return NextResponse.json({ 
        error: 'No active session' 
      }, { status: 401 });
    }
    
    // Parse alert data
    const alertData = await request.json();
    
    // Validate alert structure
    if (!alertData.type || !alertData.severity || !alertData.anomalies) {
      return NextResponse.json({ 
        error: 'Invalid alert format' 
      }, { status: 400 });
    }
    
    console.log('[SecurityAlert] Received alert:', {
      type: alertData.type,
      severity: alertData.severity,
      anomalyCount: alertData.anomalies.length
    });
    
    // Forward to backend for processing
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    
    try {
      const response = await fetch(`${apiUrl}/api/security/session-alert/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Session ${sessionToken.value}`
        },
        body: JSON.stringify({
          alert_type: alertData.type,
          severity: alertData.severity,
          anomalies: alertData.anomalies,
          timestamp: alertData.timestamp,
          client_info: alertData.sessionInfo,
          user_agent: request.headers.get('user-agent'),
          ip_address: request.headers.get('x-forwarded-for') || 
                      request.headers.get('cf-connecting-ip') ||
                      'unknown'
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // If backend says to take action, return it
        if (result.action_required) {
          return NextResponse.json({
            success: true,
            action: result.action,
            message: result.message
          });
        }
      }
    } catch (error) {
      console.error('[SecurityAlert] Backend error:', error);
    }
    
    // Log locally even if backend fails
    console.warn('[SecurityAlert] Security anomaly detected:', {
      type: alertData.type,
      severity: alertData.severity,
      anomalies: alertData.anomalies,
      timestamp: alertData.timestamp
    });
    
    // For critical alerts, send email notification
    if (alertData.severity === 'critical') {
      try {
        await sendSecurityEmail(alertData, sessionToken.value);
      } catch (emailError) {
        console.error('[SecurityAlert] Failed to send email:', emailError);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Security alert processed'
    });
    
  } catch (error) {
    console.error('[SecurityAlert] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to process security alert' 
    }, { status: 500 });
  }
}

/**
 * Send security email notification
 */
async function sendSecurityEmail(alertData, sessionToken) {
  // Get user email from session
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
  
  try {
    const sessionResponse = await fetch(`${apiUrl}/api/sessions/current/`, {
      headers: {
        'Authorization': `Session ${sessionToken}`
      }
    });
    
    if (!sessionResponse.ok) return;
    
    const sessionData = await sessionResponse.json();
    const userEmail = sessionData.email;
    
    if (!userEmail) return;
    
    // Send email via backend
    await fetch(`${apiUrl}/api/notifications/security-alert/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sessionToken}`
      },
      body: JSON.stringify({
        to_email: userEmail,
        alert_type: alertData.type,
        severity: alertData.severity,
        anomalies: alertData.anomalies,
        timestamp: alertData.timestamp
      })
    });
  } catch (error) {
    console.error('[SecurityAlert] Email send failed:', error);
  }
}