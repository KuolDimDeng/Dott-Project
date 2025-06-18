import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

/**
 * Generate a session fingerprint from request headers
 * This helps detect session hijacking attempts
 */
export function generateFingerprint(request) {
  const components = [
    request.headers.get('user-agent') || '',
    request.headers.get('accept-language') || '',
    request.headers.get('sec-ch-ua') || '',
    request.headers.get('sec-ch-ua-platform') || '',
    request.headers.get('sec-ch-ua-mobile') || ''
  ];
  
  const fingerprint = components.join('|');
  return crypto
    .createHash('sha256')
    .update(fingerprint)
    .digest('hex')
    .substring(0, 16);
}

/**
 * Validate session fingerprint middleware
 */
export async function validateSessionFingerprint(request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token');
    const storedFingerprint = cookieStore.get('session_fp');
    
    // No session, no validation needed
    if (!sessionToken) {
      return { valid: true, reason: 'no_session' };
    }
    
    // Calculate current fingerprint
    const currentFingerprint = generateFingerprint(request);
    
    // No stored fingerprint (old session), set it
    if (!storedFingerprint) {
      console.warn('[SessionFingerprint] No fingerprint found for existing session, setting it');
      return { 
        valid: true, 
        reason: 'fingerprint_missing',
        action: 'set_fingerprint',
        fingerprint: currentFingerprint
      };
    }
    
    // Validate fingerprint matches
    if (storedFingerprint.value !== currentFingerprint) {
      console.error('[SessionFingerprint] Fingerprint mismatch detected!', {
        stored: storedFingerprint.value,
        current: currentFingerprint
      });
      
      // Log security event
      const securityEvent = {
        type: 'SESSION_HIJACK_ATTEMPT',
        timestamp: new Date().toISOString(),
        sessionToken: sessionToken.value.substring(0, 8) + '...',
        storedFingerprint: storedFingerprint.value,
        currentFingerprint: currentFingerprint,
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
      };
      
      // In production, send this to security monitoring
      console.error('[SECURITY_ALERT]', JSON.stringify(securityEvent));
      
      return { 
        valid: false, 
        reason: 'fingerprint_mismatch',
        action: 'invalidate_session'
      };
    }
    
    return { valid: true, reason: 'fingerprint_valid' };
    
  } catch (error) {
    console.error('[SessionFingerprint] Error validating fingerprint:', error);
    return { valid: true, reason: 'validation_error' }; // Fail open to prevent lockouts
  }
}

/**
 * Middleware to be used in API routes
 */
export async function withSessionFingerprint(handler) {
  return async (request, context) => {
    const validation = await validateSessionFingerprint(request);
    
    if (!validation.valid) {
      // Clear invalid session
      const cookieStore = await cookies();
      cookieStore.delete('session_token');
      cookieStore.delete('session_fp');
      
      return NextResponse.json(
        { error: 'Session security validation failed' },
        { status: 401 }
      );
    }
    
    // Set fingerprint if needed
    if (validation.action === 'set_fingerprint') {
      const cookieStore = await cookies();
      cookieStore.set('session_fp', validation.fingerprint, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24 // 24 hours
      });
    }
    
    // Continue with the request
    return handler(request, context);
  };
}