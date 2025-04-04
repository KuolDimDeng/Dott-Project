// In /src/app/api/onboarding/setup/trigger/route.js
import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { validateServerSession } from '@/utils/serverUtils';

export async function POST(request) {
  try {
    console.log('[SetupTriggerAPI] Request received');
    
    // Parse request body to get force_setup parameter
    let requestBody = {};
    try {
      requestBody = await request.json();
    } catch (e) {
      // If parsing fails, use an empty object
      logger.debug('[SetupTriggerAPI] No request body or invalid JSON');
    }
    
    // Get force_setup parameter from request, strictly defaulting to false
    // This ensures we don't trigger unnecessary setups
    let forceSetup = false;
    
    // Only set to true if explicitly sent as true (not just truthy)
    if (requestBody.force_setup === true) {
      forceSetup = true;
      logger.info('[SetupTriggerAPI] Received explicit force_setup=true from client');
    } else {
      logger.info('[SetupTriggerAPI] Using default force_setup=false');
    }
    
    logger.debug('[SetupTriggerAPI] force_setup decision:', {
      rawValue: requestBody.force_setup,
      finalValue: forceSetup,
      source: requestBody.source || 'unknown'
    });
    
    // Try to get auth session but don't fail if it's not available
    let tokens = null;
    let user = null;
    let tenantId = null;
    
    try {
      // Use validateServerSession to get user data and tokens
      const session = await validateServerSession();
      tokens = session.tokens;
      user = session.user;
      
      // Get tenant ID from user attributes
      tenantId = user?.attributes?.['custom:businessid'];
      
      logger.debug('[SetupTriggerAPI] Auth session retrieved:', {
        hasTokens: !!tokens,
        hasUser: !!user,
        hasTenantId: !!tenantId
      });
    } catch (authError) {
      logger.warn('[SetupTriggerAPI] Auth session retrieval failed:', authError.message);
      // Continue without auth info, the backend might handle this case
    }
    
    // Use tenant ID from request body if not available from session
    if (!tenantId && requestBody.tenant_id) {
      tenantId = requestBody.tenant_id;
      logger.debug('[SetupTriggerAPI] Using tenant ID from request body:', tenantId);
    }
    
    if (!tenantId) {
      logger.warn('[SetupTriggerAPI] Tenant ID not found');
      // Return 400 only if tenant ID is actually required
      if (!forceSetup || requestBody.require_tenant_id) {
        return NextResponse.json(
          { error: 'Tenant ID not found' },
          { status: 400 }
        );
      }
    }
    
    // Check the setupDone attribute if available
    let setupDone = false;
    if (user?.attributes?.['custom:setupdone']) {
      setupDone = (user.attributes['custom:setupdone'] || '').toLowerCase() === 'true';
    }
    
    if (setupDone && !forceSetup) {
      logger.info('[SetupTriggerAPI] Schema setup already completed for tenant:', tenantId);
      return NextResponse.json({
        status: 'complete',
        message: 'Schema setup already completed',
      });
    }
    
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    
    logger.debug('[SetupTriggerAPI] Auth details:', {
      tenantId: tenantId,
      setupDone: setupDone,
      forceSetup: forceSetup,
      apiUrl: API_URL,
      hasTokens: !!tokens?.accessToken
    });
    
    console.log('[SetupTriggerAPI] Making request to backend:', `${API_URL}/api/onboarding/setup/trigger/`);
    
    // Generate a request ID for tracking
    const requestId = crypto.randomUUID();
    
    // Prepare headers with available authentication
    const headers = {
      'Content-Type': 'application/json',
      'X-Request-Id': requestId
    };
    
    // Add auth headers if available
    if (tokens?.accessToken) {
      headers['Authorization'] = `Bearer ${tokens.accessToken}`;
    }
    if (tokens?.idToken) {
      headers['X-Id-Token'] = tokens.idToken;
    }
    if (tenantId) {
      headers['X-Tenant-ID'] = tenantId;
    }
    
    // Prepare backend request body - explicitly include force_setup as a boolean
    const backendRequestBody = {
      tenant_id: tenantId || requestBody.tenant_id || 'unknown',
      setup_done: setupDone === true, // Ensure boolean
      force_setup: forceSetup === true, // Ensure boolean
      request_id: requestId,
      source: requestBody.source || 'dashboard'
    };
    
    logger.info('[SetupTriggerAPI] Sending to backend:', {
      force_setup: backendRequestBody.force_setup,
      setup_done: backendRequestBody.setup_done,
      source: backendRequestBody.source
    });
    
    // Make request to backend with the setupDone info in body
    const response = await fetch(`${API_URL}/api/onboarding/setup/trigger/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(backendRequestBody),
      credentials: 'include',
      cache: 'no-store'
    });
    
    console.log('[SetupTriggerAPI] Backend response status:', response.status);
    
    // Check if response is JSON before parsing
    const contentType = response.headers.get('content-type');
    console.log('[SetupTriggerAPI] Response content type:', contentType);
    
    if (!contentType || !contentType.includes('application/json')) {
      // Not JSON, get the text and log it
      const textResponse = await response.text();
      logger.error('[SetupTriggerAPI] Non-JSON response from backend:', {
        status: response.status,
        contentType: contentType,
        bodyPreview: textResponse.substring(0, 500) // First 500 chars only
      });
      
      return NextResponse.json(
        { 
          error: 'Backend returned non-JSON response',
          status: response.status,
          contentType: contentType || 'unknown'
        },
        { status: 500 }
      );
    }
    
    // Safe to parse JSON
    const data = await response.json();
    
    // Handle 404 "No pending schema setup" differently if we're forcing setup
    if (response.status === 404 && data.message === 'No pending schema setup found' && forceSetup) {
      logger.info('[SetupTriggerAPI] No pending setup found but force_setup=true, creating new setup...');
      
      // Could make a second call here to create setup if needed, or just inform user
      return NextResponse.json({
        status: 'pending',
        message: 'No setup found but setup not completed. Backend should auto-create setup.',
        force_attempted: true
      });
    }
    
    if (!response.ok) {
      logger.error('[SetupTriggerAPI] Trigger failed with JSON response:', {
        status: response.status,
        data: data
      });

      return NextResponse.json(
        { 
          error: data.message || 'Failed to trigger setup',
          details: data
        },
        { status: response.status }
      );
    }
    
    // Handle successful response
    logger.debug('[SetupTriggerAPI] Setup triggered successfully:', {
      taskId: data.task_id,
      status: data.status,
      requestId: requestId
    });
    
    // If we get here, things worked! Return the data to the client
    return NextResponse.json({
      ...data,
      request_id: requestId
    });
    
  } catch (error) {
    logger.error('[SetupTriggerAPI] Setup trigger failed:', error);
    console.error('[SetupTriggerAPI] Error details:', {
      message: error.message,
      stack: error.stack
    });
    
    return NextResponse.json(
      { 
        error: 'Setup trigger failed unexpectedly',
        message: error.message
      },
      { status: error.status || 500 }
    );
  }
}