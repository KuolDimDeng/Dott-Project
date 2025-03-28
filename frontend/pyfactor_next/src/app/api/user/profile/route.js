import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerUser, extractTokenFromRequest, decodeToken } from '@/utils/serverAuth';
import { logger } from '@/utils/logger';

/**
 * GET /api/user/profile
 * Returns the current user's profile information
 * This endpoint is designed to work even without authentication during onboarding
 */
export async function GET(request) {
  try {
    // Check if this is coming from an onboarding route
    const referer = request.headers.get('referer') || '';
    const isOnboardingRoute = referer.includes('/onboarding/');
    
    // Try to get authenticated user from the request
    let user = null;
    try {
      // First try normal authentication flow
      user = await getServerUser(request);
    } catch (authError) {
      logger.warn('[API:user/profile] Auth error but continuing:', authError.message);
      
      // If normal authentication fails, try to extract any token we can find
      // and decode it without verification for non-critical information
      const token = extractTokenFromRequest(request);
      if (token) {
        const decodedUser = decodeToken(token);
        if (decodedUser) {
          logger.info('[API:user/profile] Using unverified token data');
          user = decodedUser;
        }
      }
    }
    
    // Get cookies for additional information - properly awaited
    const cookieStore = await cookies();
    
    // Use await for all cookie operations
    const businessName = (await cookieStore.get('businessName'))?.value;
    const businessType = (await cookieStore.get('businessType'))?.value;
    const tenantId = (await cookieStore.get('tenantId'))?.value;
    const email = (await cookieStore.get('email'))?.value;
    const onboardedStatus = (await cookieStore.get('onboardedStatus'))?.value;
    const onboardingStep = (await cookieStore.get('onboardingStep'))?.value;
    const businessId = (await cookieStore.get('businessId'))?.value;
    
    // Create a profile object with available information
    const profile = {
      email: user?.email || email || '',
      name: user?.name || '',
      tenant_id: tenantId || user?.['custom:tenant_id'] || '18609ed2-1a46-4d50-bc4e-483d6e3405ff', // Default tenant ID
      business: {
        id: user?.['custom:businessid'] || businessId || '',
        name: businessName || user?.['custom:businessName'] || '',
        type: businessType || user?.['custom:businessType'] || ''
      },
      preferences: {
        theme: 'light',
        language: 'en',
        notifications_enabled: true
      },
      completedOnboarding: onboardedStatus === 'COMPLETE' || user?.['custom:onboarding'] === 'COMPLETE',
      onboardingStep: onboardingStep || 'business-info',
      lastLogin: new Date().toISOString(),
      isOnboardingFlow: isOnboardingRoute
    };
    
    // Log the profile retrieval
    logger.debug('[API:user/profile] Retrieved profile:', {
      email: profile.email,
      tenant_id: profile.tenant_id,
      business_name: profile.business.name,
      isOnboardingFlow: isOnboardingRoute
    });
    
    return NextResponse.json(profile);
  } catch (error) {
    logger.error('[API:user/profile] Error retrieving profile:', error);
    
    // Return a minimal profile to prevent errors
    return NextResponse.json({
      email: '',
      name: '',
      tenant_id: '18609ed2-1a46-4d50-bc4e-483d6e3405ff',
      business: {
        id: '',
        name: '',
        type: ''
      },
      preferences: {
        theme: 'light',
        language: 'en',
        notifications_enabled: true
      },
      completedOnboarding: false,
      onboardingStep: 'business-info',
      isOnboardingFlow: true
    });
  }
} 