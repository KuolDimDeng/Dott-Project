import { auth0 } from '@/lib/auth0';
import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

export async function GET(request) {
  try {
    // Get the Auth0 session using the auth0.getSession method
    const session = await auth0.getSession(request);
    
    if (!session || !session.user) {
      logger.debug('[API /me] No authenticated user found');
      return NextResponse.json({ 
        user: null,
        authenticated: false
      });
    }
    
    logger.debug('[API /me] Auth0 session user:', session.user);
    
    // Return user data from Auth0 session
    return NextResponse.json({
      user: {
        id: session.user.sub,
        email: session.user.email,
        name: session.user.name,
        picture: session.user.picture,
        // Add any custom claims from Auth0
        tenantId: session.user.tenantId || session.user['https://dottapps.com/tenantId'],
        businessName: session.user.businessName || session.user['https://dottapps.com/businessName'],
        onboardingCompleted: session.user.onboardingCompleted || session.user['https://dottapps.com/onboardingCompleted'] || false,
        needsOnboarding: session.user.needsOnboarding || session.user['https://dottapps.com/needsOnboarding'] || true,
      },
      authenticated: true
    });
    
  } catch (error) {
    logger.error('[API /me] Error getting user session:', error);
    return NextResponse.json({ 
      user: null, 
      authenticated: false,
      error: 'Failed to get user data' 
    });
  }
}