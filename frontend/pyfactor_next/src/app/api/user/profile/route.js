import { NextResponse } from 'next/server';
import { logger } from '@/utils/serverLogger';
import { getServerUser } from '@/utils/getServerUser';

/**
 * API endpoint to fetch user profile data
 * 
 * Optimized for RLS architecture to quickly return user information
 * without unnecessary database queries.
 */
export async function GET(request) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  try {
    // Check if this is a prefetch request
    const isPrefetch = request.headers.get('x-prefetch') === 'true';
    
    // Get user information directly from Cognito attributes
    const user = await getServerUser(request);
    
    if (!user || !user.sub) {
      logger.warn('[UserProfile] No user found', { requestId });
      return NextResponse.json({
        success: false,
        error: 'No user found',
        requestId
      }, { status: 401 });
    }
    
    logger.debug('[UserProfile] Fetching user profile', { 
      userSub: user.sub,
      requestId,
      isPrefetch
    });
    
    // For RLS, we can immediately return profile info from Cognito attributes
    // No need for database queries
    
    // Create a response with user profile data
    const response = {
      success: true,
      profile: {
        userId: user.sub,
        email: user.email || '',
        name: user.name || user.given_name || user.email?.split('@')[0] || 'User',
        businessId: user['custom:businessid'] || '',
        businessName: user['custom:businessname'] || '',
        businessType: user['custom:businesstype'] || '',
        legalStructure: user['custom:legalstructure'] || '',
        country: user['custom:businesscountry'] || '',
        accountStatus: user['custom:acctstatus'] || 'ACTIVE',
        onboardingStatus: user['custom:onboarding'] || 'COMPLETE',
        setupComplete: user['custom:setupdone'] === 'TRUE',
        lastUpdated: user['custom:updated_at'] || new Date().toISOString()
      },
      isPrefetched: isPrefetch,
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      requestId
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    logger.error('[UserProfile] Error fetching user profile', {
      error: error.message,
      stack: error.stack,
      requestId
    });
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch user profile',
      message: error.message,
      requestId
    }, { status: 500 });
  }
} 