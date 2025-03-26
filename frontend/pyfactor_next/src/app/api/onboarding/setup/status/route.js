///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/onboarding/setup/status/route.js
import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { validateServerSession } from '@/utils/serverUtils';
import { completeOnboarding } from '@/utils/completeOnboarding';

export async function GET(request) {
  try {
    // Check URL params for background setup flag
    const url = new URL(request.url);
    const isBackgroundSetup = url.searchParams.get('background') === 'true';
    
    // Validate session using server utils
    const { tokens, user } = await validateServerSession();
    
    if (!tokens?.accessToken || !tokens?.idToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get tenant ID from user attributes or cookies
    const tenantId = user.attributes['custom:businessid'];
    const setupDone = user.attributes['custom:setupdone'];
    const onboardingStatus = user.attributes['custom:onboarding'];
    const subPlan = user.attributes['custom:subplan'];
    
    // Check for free plan with background setup
    const isFreePlan = (subPlan || '').toLowerCase() === 'free';
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID not found' },
        { status: 400 }
      );
    }

    // Check if setup is already done
    if (setupDone === 'TRUE') {
      return NextResponse.json({
        status: 'complete',
        progress: 100,
        message: 'Setup is complete',
        timestamp: new Date().toISOString()
      });
    }

    // For background setup of free plans, check if we have a pending schema setup in sessionStorage
    // This will only work client-side, but we'll try to read it if available
    const pendingSetupStr = global.sessionStorage?.getItem?.('pendingSchemaSetup');
    let backgroundSetupStartTime = null;
    
    if (pendingSetupStr) {
      try {
        const pendingSetup = JSON.parse(pendingSetupStr);
        if (pendingSetup.backgroundSetup && pendingSetup.timestamp) {
          backgroundSetupStartTime = new Date(pendingSetup.timestamp).getTime();
        }
      } catch (e) {
        // Ignore errors parsing session storage
      }
    }

    // Try to get setup status from backend
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      // Change endpoint to match the backend route structure
      const endpoint = `/api/onboarding/setup/status/`;
      const requestUrl = `${backendUrl}${endpoint}`;
      
      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.accessToken}`,
          'X-Id-Token': tokens.idToken,
          'X-Tenant-ID': tenantId
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Check if backend reports setup is complete but user attributes say otherwise
        if ((data.status === 'complete' || data.status === 'ready') && setupDone === 'FALSE') {
          logger.info('[SetupStatus] Backend reports setup is complete but attributes not updated, fixing...');
          
          try {
            // Call completeOnboarding utility to update user attributes
            const result = await completeOnboarding();
            
            if (result) {
              logger.info('[SetupStatus] Successfully updated user attributes to complete onboarding');
            } else {
              logger.warn('[SetupStatus] Failed to update user attributes, will retry on next check');
            }
          } catch (updateError) {
            logger.error('[SetupStatus] Error updating user attributes:', updateError);
          }
        }
        
        return NextResponse.json({
          status: data.status || 'in_progress',
          progress: data.progress || 50,
          message: data.message || 'Setup in progress',
          timestamp: new Date().toISOString(),
          attributesFixed: (data.status === 'complete' && setupDone === 'FALSE'),
          isBackgroundSetup: isBackgroundSetup || false,
          isFreePlan: isFreePlan
        });
      } else {
        // If backend fails but we're in SUBSCRIPTION phase with setupDone FALSE,
        // we might be in a state where backend completed but didn't update attributes
        if (setupDone === 'FALSE' && (onboardingStatus === 'SUBSCRIPTION' || onboardingStatus === 'SETUP')) {
          // For background setup (especially free plan), be more aggressive with completing
          const shouldAssumeComplete = isBackgroundSetup || isFreePlan;
          
          // Check if there's a pendingSchemaSetup that's been around for a while
          if (backgroundSetupStartTime) {
            const currentTime = new Date().getTime();
            // Free plan in background mode - assume setup is complete after 2 minutes
            const twoMinutesInMs = 2 * 60 * 1000;
            
            if (shouldAssumeComplete && (currentTime - backgroundSetupStartTime > twoMinutesInMs)) {
              logger.info('[SetupStatus] Background free plan setup timeout reached, marking as complete');
              
              try {
                // Call completeOnboarding utility to update user attributes
                const result = await completeOnboarding();
                
                if (result) {
                  logger.info('[SetupStatus] Successfully updated user attributes to complete onboarding');
                  
                  return NextResponse.json({
                    status: 'complete',
                    progress: 100,
                    message: 'Setup is complete (attributes fixed)',
                    timestamp: new Date().toISOString(),
                    attributesFixed: true,
                    isBackgroundSetup: true,
                    isFreePlan: isFreePlan
                  });
                }
              } catch (updateError) {
                logger.error('[SetupStatus] Error updating user attributes:', updateError);
              }
            }
          }
          
          // For free plan with background setup, prioritize returning a success status
          // even if backend isn't ready yet - this helps user experience
          if (isFreePlan && isBackgroundSetup) {
            return NextResponse.json({
              status: 'in_progress',
              progress: 90, // Optimistic high progress
              message: 'Almost done setting up your account',
              timestamp: new Date().toISOString(),
              isBackgroundSetup: true,
              isFreePlan: true
            });
          }
        }
        
        // If backend fails, return a default response
        // This allows the dashboard to continue loading even if the backend is not available
        return NextResponse.json({
          status: 'in_progress',
          progress: 75, // Optimistic progress
          message: 'Setup in progress (backend status unavailable)',
          timestamp: new Date().toISOString(),
          isBackgroundSetup: isBackgroundSetup || false,
          isFreePlan: isFreePlan
        });
      }
    } catch (error) {
      logger.error('[SetupStatus] Error fetching status from backend:', error);
      
      // For free plan with background setup, return optimistic status
      if (isFreePlan && isBackgroundSetup) {
        return NextResponse.json({
          status: 'in_progress',
          progress: 85,
          message: 'Setting up your account (status check failed)',
          timestamp: new Date().toISOString(),
          isBackgroundSetup: true,
          isFreePlan: true
        });
      }
      
      // Return a default response to allow the dashboard to continue loading
      return NextResponse.json({
        status: 'in_progress',
        progress: 60,
        message: 'Setup in progress (status check failed)',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error('[SetupStatus] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to check setup status',
        message: error.message,
        status: 'unknown',
        progress: 0
      },
      { status: 500 }
    );
  }
}