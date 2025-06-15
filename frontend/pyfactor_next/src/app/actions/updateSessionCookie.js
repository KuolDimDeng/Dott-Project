'use server';

import { cookies } from 'next/headers';
import { encrypt } from '@/utils/sessionEncryption';

/**
 * Server action to update the session cookie with new data
 * This ensures the cookie is properly set on the server side
 */
export async function updateSessionCookie(updates) {
  console.log('[updateSessionCookie] Server action called with updates:', {
    needsOnboarding: updates.needsOnboarding,
    onboardingCompleted: updates.onboardingCompleted,
    tenantId: updates.tenantId
  });
  
  try {
    // Get current session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('dott_auth_session') || cookieStore.get('appSession');
    
    if (!sessionCookie) {
      console.error('[updateSessionCookie] No session cookie found');
      return { success: false, error: 'No session found' };
    }
    
    // Decrypt current session
    let sessionData;
    try {
      const decrypted = decrypt(sessionCookie.value);
      sessionData = JSON.parse(decrypted);
    } catch (e) {
      // Fallback to base64
      sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    }
    
    // Update session data
    const updatedSession = {
      ...sessionData,
      user: {
        ...sessionData.user,
        ...updates,
        lastUpdated: new Date().toISOString()
      }
    };
    
    console.log('[updateSessionCookie] Updated session user:', {
      email: updatedSession.user.email,
      needsOnboarding: updatedSession.user.needsOnboarding,
      onboardingCompleted: updatedSession.user.onboardingCompleted,
      tenantId: updatedSession.user.tenantId
    });
    
    // Encrypt and set new cookie
    const updatedCookie = encrypt(JSON.stringify(updatedSession));
    
    const cookieOptions = {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      domain: process.env.NODE_ENV === 'production' ? '.dottapps.com' : undefined
    };
    
    // Use cookieStore to set the cookie
    cookieStore.set('dott_auth_session', updatedCookie, cookieOptions);
    cookieStore.set('appSession', updatedCookie, cookieOptions);
    
    console.log('[updateSessionCookie] Cookies updated successfully');
    
    return { 
      success: true, 
      message: 'Session updated',
      cookieSize: updatedCookie.length 
    };
    
  } catch (error) {
    console.error('[updateSessionCookie] Error:', error);
    return { success: false, error: error.message };
  }
}