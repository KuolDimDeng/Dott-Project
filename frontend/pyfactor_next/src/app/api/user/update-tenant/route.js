import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { validateServerSession } from '@/utils/serverAuth';
import { cookies } from 'next/headers';

/**
 * API route to update tenant ID in server session and sync with Cognito
 * POST /api/user/update-tenant
 */
export async function POST(request) {
  try {
    // Get auth session
    let session;
    try {
      session = await validateServerSession();
      logger.debug('[API:UpdateTenant] Session validated successfully', { 
        hasSession: !!session,
        hasTokens: session?.tokens ? 'yes' : 'no'
      });
    } catch (error) {
      logger.error('[API:UpdateTenant] Session validation failed', {
        error: error.message
      });
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!session || !session.tokens?.accessToken) {
      logger.error('[API:UpdateTenant] Missing tokens in session');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get tenant ID from request body
    const requestData = await request.json();
    const newTenantId = requestData.tenantId;
    const updateOnboarding = requestData.updateOnboarding === true;
    
    if (!newTenantId) {
      logger.error('[API:UpdateTenant] Missing tenantId in request body');
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }
    
    logger.info('[API:UpdateTenant] Updating tenant ID:', newTenantId, 
      updateOnboarding ? '(with onboarding status update)' : '');
    
    // Set tenant ID in cookie
    const cookieStore = cookies();
    
    // Check if tenant ID already exists in cookie
    const existingTenantId = cookieStore.get('tenantId')?.value;
    
    if (existingTenantId && existingTenantId !== newTenantId) {
      logger.warn('[API:UpdateTenant] Replacing existing tenant ID in cookie', {
        oldTenantId: existingTenantId,
        newTenantId
      });
    }
    
    // Create response with updated tenant ID cookie
    const response = NextResponse.json({ 
      success: true,
      tenantId: newTenantId,
      message: updateOnboarding 
        ? 'Tenant ID and onboarding status updated successfully' 
        : 'Tenant ID updated successfully'
    });
    
    // Set cookie with new tenant ID
    response.cookies.set('tenantId', newTenantId, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: 'lax',
      httpOnly: true
    });
    
    // Set onboarding cookies if requested
    if (updateOnboarding) {
      response.cookies.set('onboardedStatus', 'complete', {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        sameSite: 'lax',
        httpOnly: true
      });
      
      response.cookies.set('onboardingStep', 'dashboard', {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        sameSite: 'lax',
        httpOnly: true
      });
      
      logger.info('[API:UpdateTenant] Set onboarding cookies to COMPLETE');
    }
    
    // Prepare attributes to update in Cognito
    const attributesToUpdate = {
      'custom:businessid': newTenantId
    };
    
    // Add onboarding attributes if requested
    if (updateOnboarding) {
      attributesToUpdate['custom:onboarding'] = 'complete';
      attributesToUpdate['custom:setupdone'] = 'true';
    }
    
    // Update Cognito attribute if tenant ID differs from Cognito
    const cognitoBusinessId = session.user?.attributes?.['custom:businessid'];
    const cognitoOnboarding = session.user?.attributes?.['custom:onboarding'];
    const cognitoSetupDone = session.user?.attributes?.['custom:setupdone'];
    
    const needsCognitoUpdate = 
      (cognitoBusinessId !== newTenantId) || 
      (updateOnboarding && (cognitoOnboarding !== 'complete' || cognitoSetupDone !== 'TRUE'));
    
    if (needsCognitoUpdate) {
      try {
        logger.info('[API:UpdateTenant] Updating Cognito attributes', {
          oldBusinessId: cognitoBusinessId,
          newBusinessId: newTenantId,
          updateOnboarding: updateOnboarding
        });
        
        // Prepare headers with auth tokens
        const headers = {
          'Authorization': `Bearer ${session.tokens.accessToken}`,
          'X-Id-Token': session.tokens.idToken,
          'Content-Type': 'application/json'
        };
        
        // Use Next.js API to update Cognito attributes
        const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'http://localhost:8000';
        const updateResponse = await fetch(`${API_URL}/api/user/attributes`, {
          method: 'POST',
          headers,
          body: JSON.stringify(attributesToUpdate)
        });
        
        if (!updateResponse.ok) {
          const error = await updateResponse.text();
          logger.error('[API:UpdateTenant] Failed to update Cognito attributes', {
            status: updateResponse.status,
            error
          });
        } else {
          logger.info('[API:UpdateTenant] Successfully updated Cognito attributes', attributesToUpdate);
        }
      } catch (error) {
        logger.error('[API:UpdateTenant] Error updating Cognito attributes', {
          error: error.message
        });
        // Continue even if Cognito update fails
      }
    } else {
      logger.debug('[API:UpdateTenant] No Cognito attribute update needed');
    }
    
    return response;
  } catch (error) {
    logger.error('[API:UpdateTenant] Error processing request', {
      error: error.message,
      stack: error.stack
    });
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update tenant ID',
        message: error.message
      },
      { status: 500 }
    );
  }
} 