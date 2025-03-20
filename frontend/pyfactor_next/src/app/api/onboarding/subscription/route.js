///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/onboarding/subscription/route.js
import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { logger } from '@/utils/logger';
import { validateServerSession } from '@/utils/serverUtils';
import { updateOnboardingStep, validateSubscription } from '@/utils/onboardingUtils';
import crypto from 'crypto';

// Helper function to parse cookies from header
const parseCookies = (cookieHeader) => {
  const cookies = {};
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    if (parts.length >= 2) {
      const name = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      cookies[name] = value;
    }
  });
  return cookies;
};

export async function POST(request) {
  try {
    // Validate session using server utils
    const { tokens, user } = await validateServerSession();

    const accessToken = tokens.accessToken.toString();
    const idToken = tokens.idToken.toString();
    const userId = user.userId;
    
    if (!accessToken || !idToken) {
      return NextResponse.json(
        { error: 'Missing required tokens' },
        { status: 401 }
            );
        }

    let body;
    try {
      body = await request.json();
      logger.info('[Subscription] Received request:', {
        plan: body?.plan,
        interval: body?.interval,
        userId: userId,
        timestamp: new Date().toISOString()
      });

      // Validate required fields
      if (!body?.plan || !body?.interval) {
        logger.error('[Subscription] Missing required fields:', {
          receivedFields: body ? Object.keys(body) : [],
          plan: body?.plan,
          interval: body?.interval
        });
        return NextResponse.json({
          error: 'Missing required fields',
          details: 'Plan and interval are required',
          received: {
            plan: body?.plan,
            interval: body?.interval
          }
        }, { status: 400 });
      }

      // Validate plan and interval values
      const validPlans = ['FREE', 'PROFESSIONAL', 'ENTERPRISE'];
      const validIntervals = ['MONTHLY', 'YEARLY'];
      
      const plan = body.plan.toUpperCase();
      const interval = body.interval.toUpperCase();
      
      if (!validPlans.includes(plan) || !validIntervals.includes(interval)) {
        logger.error('[Subscription] Invalid plan or interval:', {
          plan,
          interval,
          validPlans,
          validIntervals
        });
        return NextResponse.json({
          error: 'Invalid subscription options',
          details: 'Invalid plan or interval value',
          validOptions: {
            plans: validPlans,
            intervals: validIntervals
          }
        }, { status: 400 });
    }
    } catch (error) {
      logger.error('[Subscription] Failed to parse request body:', {
        error: error.message,
        stack: error.stack
      });
      return NextResponse.json({
        error: 'Invalid request format',
        details: 'Failed to parse request body'
      }, { status: 400 });
    }

    // Validate subscription data
    try {
      logger.debug('[Subscription] Starting validation:', body);
      await validateSubscription(body);
      logger.info('[Subscription] Validation successful');
    } catch (error) {
      logger.error('[Subscription] Validation failed:', {
        error: error.message,
        data: body,
        validationRules: {
          validPlans: ['FREE', 'PROFESSIONAL', 'ENTERPRISE'],
          validIntervals: ['MONTHLY', 'YEARLY']
        }
      });
      return NextResponse.json({
        error: 'Validation Failed',
        code: 'subscription_validation_error',
        details: error.message,
        validationRules: {
          validPlans: ['FREE', 'PROFESSIONAL', 'ENTERPRISE'],
          validIntervals: ['MONTHLY', 'YEARLY']
        }
      }, { status: 400 });
    }
    
    // Get current onboarding status
    const attributes = user.attributes || {};
    const isReset = request.headers.get('X-Reset-Onboarding') === 'true';
    let currentStatus = attributes['custom:onboarding'] || 'NOT_STARTED';

    // Allow reset if explicitly requested
    if (isReset) {
      // Update onboarding status in Cognito with tokens
      await updateOnboardingStep('BUSINESS_INFO', {
        'custom:setupdone': 'FALSE'
      }, {
        accessToken: accessToken,
        idToken: idToken
      });

      // Update current status after reset
      currentStatus = 'BUSINESS_INFO';
    } else {
      // Normal validation for non-reset flow
      if (currentStatus === 'COMPLETE') {
        return NextResponse.json(
          { error: 'Cannot update subscription after onboarding is complete. Use reset flag to start over.' },
          { status: 400 }
        );
      }

      // Check if business ID exists, which indicates business info has been completed
      const hasBusinessId = !!attributes['custom:businessid'];
      
      // Allow NOT_STARTED if business ID exists, or BUSINESS_INFO or SUBSCRIPTION as valid states
      // This handles the case where the cookie might be updated but Cognito attributes aren't in sync
      if ((currentStatus !== 'BUSINESS_INFO' &&
           currentStatus !== 'SUBSCRIPTION' &&
           !(currentStatus === 'NOT_STARTED' && hasBusinessId))) {
        
        logger.warn('[Subscription] Invalid onboarding status:', {
          currentStatus,
          expectedStatus: ['BUSINESS_INFO', 'SUBSCRIPTION', 'NOT_STARTED (with businessId)'],
          userId,
          hasBusinessId
        });
        
        return NextResponse.json(
          { error: 'Must complete business info before subscription' },
          { status: 400 }
        );
      }
      
      // If we're here with NOT_STARTED but have a business ID, update the status to BUSINESS_INFO
      if (currentStatus === 'NOT_STARTED' && hasBusinessId) {
        logger.info('[Subscription] Updating status from NOT_STARTED to BUSINESS_INFO due to business ID presence');
        currentStatus = 'BUSINESS_INFO';
      }
    }

    // Add reset flag to backend request headers
    const requestHeadersObj = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'X-Id-Token': idToken,
      'X-User-ID': userId,
      'X-Onboarding-Status': currentStatus
    };

    if (isReset) {
      requestHeadersObj['X-Reset-Onboarding'] = 'true';
    }
    
    // Get IDs and validate request
    let tenantId = attributes['custom:businessid'];
    let cognitoUserId = attributes.sub;

    logger.info('[Subscription] Starting subscription process:', {
      tenantId,
      userId,
      cognitoUserId,
      currentStatus,
      attributes: {
        businessId: attributes['custom:businessid'],
        businessName: attributes['custom:businessname'],
        setupDone: attributes['custom:setupdone'],
        onboarding: attributes['custom:onboarding'],
        acctstatus: attributes['custom:acctstatus']
      },
      tokens: {
        accessTokenLength: accessToken.length,
        idTokenLength: idToken.length
      }
    });

    logger.debug('[Subscription] Request validation:', {
      plan: body.plan,
      interval: body.interval,
      isReset,
      currentStatus,
      validationRules: {
        validPlans: ['FREE', 'PROFESSIONAL', 'ENTERPRISE'],
        validIntervals: ['MONTHLY', 'YEARLY'],
        allowedStatus: ['BUSINESS_INFO', 'NOT_STARTED']
      }
    });

    logger.debug('[Subscription] Request headers:', {
      ...Object.fromEntries(
        Object.entries(requestHeadersObj).filter(([key]) =>
          !['Authorization', 'X-Id-Token'].includes(key)
        )
      ),
      Authorization: '[REDACTED]',
      'X-Id-Token': '[REDACTED]'
    });

    // Forward the request to the Django backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    const endpoint = '/api/onboarding/subscription/save/';
    const requestUrl = `${backendUrl}${endpoint}`;

    // Log environment and request details
    logger.debug('[Subscription] Request configuration:', {
      backendUrl,
      endpoint,
      requestUrl,
      method: 'POST',
      currentStatus,
      nextStatus: body.plan.toUpperCase() === 'PROFESSIONAL' ? 'PAYMENT' : 'SETUP',
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL
      }
    });

    // Validate URL
    try {
      new URL(requestUrl);
    } catch (error) {
      logger.error('[Subscription] Invalid request URL:', {
        error: error.message,
        requestUrl,
        backendUrl,
        endpoint
      });
      return NextResponse.json({
        error: 'Invalid API URL configuration',
        details: error.message
      }, { status: 500 });
    }

    // Try to get business ID from cookies if not in attributes
    const headersList = await headers();
    const cookieHeader = headersList.get('cookie') || '';
    const parsedCookies = parseCookies(cookieHeader);
    const cookieTenantId = parsedCookies['tenantId'];
    
    // Use cookie tenant ID if attribute is missing
    if (!tenantId && cookieTenantId) {
      logger.info('[Subscription] Using tenant ID from cookies:', {
        cookieTenantId
      });
      tenantId = cookieTenantId;
      attributes['custom:businessid'] = cookieTenantId;
    }
    
    // Use userId as cognitoUserId if missing
    if (!cognitoUserId && userId) {
      logger.info('[Subscription] Using userId as cognitoUserId:', {
        userId
      });
      cognitoUserId = userId;
    }
    
    // Check if we have the minimum required context
    let businessInfoCompleted = false;
    
    // If we're missing tenantId or cognitoUserId, try to recover
    if (!tenantId || !cognitoUserId) {
      logger.warn('[Subscription] Missing required context:', {
        tenantId,
        cookieTenantId,
        cognitoUserId,
        userId,
        businessId: attributes['custom:businessid'],
        attributes: Object.keys(attributes)
      });
      // Check if onboarding status indicates business info is completed
      // Use the same cookie parsing approach
      const headersList = await headers();
      const cookieHeader = headersList.get('cookie') || '';
      const parsedCookies = parseCookies(cookieHeader);
      const onboardingStep = parsedCookies['onboardingStep'];
      const onboardedStatus = parsedCookies['onboardedStatus'];
      
      logger.debug('[Subscription] Checking onboarding status from cookies:', {
        onboardingStep,
        onboardedStatus,
        currentStatus
      });
      
      // If cookies indicate business info is completed, proceed despite missing data
      if (onboardedStatus === 'BUSINESS_INFO' ||
          onboardingStep === 'subscription' ||
          currentStatus === 'BUSINESS_INFO' ||
          currentStatus === 'SUBSCRIPTION') {
        
        logger.info('[Subscription] Proceeding despite missing data - onboarding status indicates business info is completed');
        businessInfoCompleted = true;
        
        // Generate a new tenantId if needed
        if (!tenantId) {
          tenantId = crypto.randomUUID();
          attributes['custom:businessid'] = tenantId;
          
          logger.info('[Subscription] Generated new tenantId:', {
            tenantId
          });
        }
        
        // Use userId as cognitoUserId if needed
        if (!cognitoUserId && userId) {
          cognitoUserId = userId;
          
          logger.info('[Subscription] Using userId as cognitoUserId:', {
            userId,
            cognitoUserId
          });
        }
      } else if (userId && !tenantId) {
        // If we have a userId but no tenantId and no indication of business info completion
        return NextResponse.json({
          error: 'Business info not completed',
          details: 'Please complete business info before selecting a subscription',
          redirectTo: '/onboarding/business-info'
        }, { status: 400 });
      }
      
      // If we still don't have the required context and business info is not completed
      if ((!tenantId || !cognitoUserId) && !businessInfoCompleted) {
        return NextResponse.json({
          error: 'Missing required context',
          details: 'Business setup incomplete',
          context: {
            hasTenantId: Boolean(tenantId),
            hasCognitoId: Boolean(cognitoUserId),
            hasBusinessId: Boolean(attributes['custom:businessid'])
          }
        }, { status: 400 });
      }
    }

    // Prepare request headers with tracking
    const requestId = Math.random().toString(36).substring(7);
    const requestHeaders = {
      ...requestHeadersObj,
      'X-Tenant-ID': tenantId,
      'X-Schema-Name': `tenant_${tenantId.replace(/-/g, '_')}`, // Add formatted schema name
      'X-Cognito-Sub': cognitoUserId,
      'X-Business-ID': attributes['custom:businessid'],
      'X-Onboarding-Status': attributes['custom:onboarding'],
      'X-Setup-Done': attributes['custom:setupdone'],
      'X-Request-ID': requestId,
      
      // CORS headers
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Id-Token, X-Tenant-ID, X-Cognito-Sub, X-Business-ID, X-Onboarding-Status, X-Setup-Done, X-Request-ID'
    };

    logger.info('[Subscription] Request context:', {
      requestId,
      tenantId,
      cognitoUserId,
      businessId: attributes['custom:businessid'],
      onboardingStatus: attributes['custom:onboarding'],
      setupDone: attributes['custom:setupdone']
    });

    // Log request details
    logger.debug('[Subscription] Request details:', {
      url: requestUrl,
      method: 'POST',
      headers: {
        ...Object.fromEntries(
          Object.entries(requestHeadersObj).filter(([key]) =>
            !['Authorization', 'X-Id-Token'].includes(key)
          )
        ),
        Authorization: '[REDACTED]',
        'X-Id-Token': '[REDACTED]'
      },
      body: {
        selected_plan: body.plan.toLowerCase(),
        billing_cycle: body.interval.toLowerCase(),
        current_status: currentStatus,
        next_status: (body.plan.toLowerCase() === 'professional' || body.plan.toLowerCase() === 'enterprise') ? 'PAYMENT' : 'SETUP',
        reset_onboarding: isReset,
        requires_payment: (body.plan.toLowerCase() === 'professional' || body.plan.toLowerCase() === 'enterprise'),
        tenant_id: tenantId,
        business_id: attributes['custom:businessid'],
        cognito_sub: cognitoUserId
      }
    });

    logger.info('[Subscription] Preparing backend request:', {
      url: requestUrl,
      tenantId,
      headers: {
        ...requestHeadersObj,
        Authorization: '[REDACTED]',
        'X-Id-Token': '[REDACTED]'
      },
      body: {
        selected_plan: body.plan.toLowerCase(),
        billing_cycle: body.interval.toLowerCase(),
        current_status: currentStatus,
        next_status: body.plan.toLowerCase() === 'professional' ? 'PAYMENT' : 'SETUP',
        reset_onboarding: isReset,
        requires_payment: body.plan.toLowerCase() === 'professional',
        tenant_id: tenantId
      }
    });

    logger.debug('[Subscription] Environment:', {
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      defaultUrl: 'http://127.0.0.1:8000',
      finalUrl: requestUrl
    });

    // Make request with retries
    let response;
    let retries = 3;
    let delay = 1000;

    // Prepare request body once
    const requestBody = {
      selected_plan: body.plan.toLowerCase(),
      billing_cycle: body.interval.toLowerCase(),
      current_status: currentStatus,
      next_status: (body.plan.toLowerCase() === 'professional' || body.plan.toLowerCase() === 'enterprise') ? 'PAYMENT' : 'SETUP',
      reset_onboarding: isReset,
      requires_payment: (body.plan.toLowerCase() === 'professional' || body.plan.toLowerCase() === 'enterprise'),
      tenant_id: tenantId,
      schema_name: `tenant_${tenantId.replace(/-/g, '_')}`, // Format as Django expects it
      business_id: attributes['custom:businessid'],
      cognito_sub: cognitoUserId,
      request_id: requestId,
      timestamp: new Date().toISOString(),
      user: {
        id: cognitoUserId,
        email: attributes.email,
        setupDone: attributes['custom:setupdone'],
        onboarding: attributes['custom:onboarding'],
        acctstatus: attributes['custom:acctstatus']
      },
      business: {
        id: attributes['custom:businessid'],
        name: attributes['custom:businessname'],
        type: attributes['custom:businesstype'],
        country: attributes['custom:businesscountry'],
        legalStructure: attributes['custom:legalstructure'],
        dateFounded: attributes['custom:datefounded']
      }
    };

    while (retries > 0) {
      try {
        logger.info('[Subscription] Attempting request:', {
          requestId,
          attempt: 4 - retries,
          url: requestUrl,
          plan: body.plan.toLowerCase(),
          interval: body.interval.toLowerCase()
        });

        response = await fetch(requestUrl, {
          method: 'POST',
          headers: requestHeaders,
          body: JSON.stringify(requestBody)
        });

        if (response.ok) {
          logger.info('[Subscription] Request successful:', {
            requestId,
            status: response.status,
            attempt: 4 - retries
          });
          break;
        }

        const errorText = await response.text();
        logger.error('[Subscription] Request failed:', {
          requestId,
          status: response.status,
          error: errorText,
          attempt: 4 - retries,
          remaining: retries - 1
        });

        if (retries === 1) {
          return NextResponse.json({
            error: 'Failed to save subscription',
            details: errorText,
            requestId,
            status: response.status
          }, { status: response.status });
        }

        retries--;
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      } catch (error) {
        logger.error('[Subscription] Network error:', {
          requestId,
          error: error.message,
          attempt: 4 - retries
        });

        if (retries === 1) {
          return NextResponse.json({
            error: 'Network error',
            details: error.message,
            requestId
          }, { status: 500 });
        }

        retries--;
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }


    // Handle response
    let data;
    try {
      // Log raw response
      logger.debug('[Subscription] Raw response:', {
        requestId,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      // Check response status
      if (!response.ok) {
        const errorText = await response.text();
        logger.error('[Subscription] Backend request failed:', {
          requestId,
          status: response.status,
          error: errorText
        });
        throw new Error(`Backend request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      // Parse response
      const responseText = await response.text();
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        logger.error('[Subscription] Failed to parse response:', {
          requestId,
          error: parseError.message,
          responseText: responseText.substring(0, 1000) // Log first 1000 chars
        });
        throw new Error('Invalid JSON response');
      }

      // Validate response data
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response structure');
      }

      if (data.error || (!data.success && data.message)) {
        throw new Error(data.error || data.message);
      }

      // Log success
      logger.info('[Subscription] Request successful:', {
        requestId,
        success: data.success,
        message: data.message,
        nextStep: data.next_step
      });

    } catch (error) {
      const errorResponse = {
        error: 'Subscription request failed',
        details: error.message,
        requestId
      };

      logger.error('[Subscription] Request failed:', {
        requestId,
        error: error.message,
        stack: error.stack
      });

      return NextResponse.json(errorResponse, {
        status: error.message.includes('Backend request failed') ? response.status : 500
      });
    }

    // Update onboarding status in Cognito with tokens
    const nextStatus = 'SETUP'; // Always go to setup since schema setup happens in background
    try {
      await updateOnboardingStep(nextStatus, {
        'custom:subplan': body.plan,
        'custom:subscriptioninterval': body.interval,
        'custom:requirespayment': (body.plan.toLowerCase() === 'professional' || body.plan.toLowerCase() === 'enterprise') ? 'TRUE' : 'FALSE',
        'custom:setupdone': 'FALSE' // Indicate setup is pending
      }, {
        accessToken: accessToken,
        idToken: idToken
      });
      logger.info('[Subscription] Successfully updated onboarding step to SETUP');
    } catch (updateError) {
      // Log the error but continue since the subscription was saved successfully
      logger.warn('[Subscription] Failed to update onboarding step, but subscription was saved:', {
        error: updateError.message,
        nextStatus
      });
      // Continue with the response since the subscription was saved successfully
    }

    // Create response data with redirect info
    const responseData = {
      ...data,
      setupStatus: 'pending',
      nextRoute: '/dashboard',
      message: 'Subscription saved successfully. Redirecting to dashboard...',
      timestamp: new Date().toISOString(),
      tenant: {
        id: tenantId,
        status: 'pending'
      },
      user: {
        id: cognitoUserId,
        email: attributes.email,
        setupDone: attributes['custom:setupdone']
      }
    };

    logger.debug('[Subscription] Response data prepared:', {
      setupStatus: 'pending',
      nextRoute: '/dashboard',
      tenant: {
        id: tenantId,
        status: 'pending'
      },
      user: {
        id: cognitoUserId,
        setupDone: attributes['custom:setupdone']
      }
    });

    // Create response with updated cookies
    const cookieOptions = {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600 // 1 hour
    };

    // Prepare final response
    const finalResponse = NextResponse.json({
      success: true,
      message: 'Subscription saved successfully',
      nextStep: (body.plan.toLowerCase() === 'professional' || body.plan.toLowerCase() === 'enterprise') ? 'payment' : 'dashboard',
      setupStatus: 'pending',
      timestamp: new Date().toISOString(),
      tenant: {
        id: tenantId,
        status: 'pending'
      },
      user: {
        id: cognitoUserId,
        email: attributes.email,
        setupDone: attributes['custom:setupdone']
      }
    }, {
      status: 200,
      headers: {
        'X-Tenant-ID': tenantId,
        'X-Cognito-Sub': cognitoUserId,
        'X-Setup-Status': 'pending',
        'X-Next-Step': (body.plan.toLowerCase() === 'professional' || body.plan.toLowerCase() === 'enterprise') ? 'payment' : 'dashboard',
        // CORS headers
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Id-Token, X-Tenant-ID, X-Cognito-Sub, X-Setup-Status, X-Next-Step',
        'Access-Control-Expose-Headers': 'X-Tenant-ID, X-Cognito-Sub, X-Setup-Status, X-Next-Step'
      }
    });

    // Set cookies
    finalResponse.cookies.set('accessToken', accessToken, cookieOptions);
    finalResponse.cookies.set('idToken', idToken, cookieOptions);
    finalResponse.cookies.set('onboardingStep', nextStatus, cookieOptions);
    finalResponse.cookies.set('tenantId', tenantId, cookieOptions);

    logger.info('[Subscription] Returning response:', {
      nextStep: body.plan.toLowerCase() === 'professional' ? 'payment' : 'dashboard',
      setupStatus: 'pending',
      timestamp: new Date().toISOString()
    });

    // Setup schema setup
    const setupUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/onboarding/setup/start/`;
    
    // Ensure we have valid UUIDs for userId and businessId
    const validUserId = cognitoUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cognitoUserId)
      ? cognitoUserId
      : tenantId; // Use tenantId as fallback
    
    const validBusinessId = attributes['custom:businessid'] && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(attributes['custom:businessid'])
      ? attributes['custom:businessid']
      : tenantId; // Use tenantId as fallback
    
    const setupHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'X-Id-Token': idToken,
      'X-Tenant-ID': tenantId,
      'X-Cognito-Sub': validUserId,
      'X-Business-ID': validBusinessId,
      'X-Setup-Done': attributes['custom:setupdone'] || 'FALSE',
      'X-Request-ID': Math.random().toString(36).substring(7)
    };

    // Only initiate schema setup for free plans to reduce memory usage
    // For professional plans, schema setup will happen after payment
    if (body.plan.toLowerCase() === 'free') {
      // Make the schema setup request truly asynchronous by not awaiting it
      logger.info('[Subscription] Initiating schema setup asynchronously for free plan');
      
      // Ensure we have proper authentication headers with all required tokens
      const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Id-Token': idToken,
        'X-Tenant-ID': tenantId,
        'X-Cognito-Sub': validUserId,
        'X-Business-ID': validBusinessId,
        'X-Setup-Done': attributes['custom:setupdone'] || 'FALSE',
        'X-Request-ID': Math.random().toString(36).substring(7),
        'X-Onboarding-Status': nextStatus
      };
      
      // Use a minimal request body to reduce memory usage
      const minimalBody = {
        userId: validUserId,
        businessId: validBusinessId,
        setupInBackground: true,
        timestamp: new Date().toISOString(),
        accessToken: accessToken, // Include token in body as well
        idToken: idToken // Include token in body as well
      };
      
      logger.debug('[Subscription] Schema setup request details:', {
        url: setupUrl,
        headers: {
          ...Object.fromEntries(
            Object.entries(authHeaders).filter(([key]) =>
              !['Authorization', 'X-Id-Token'].includes(key)
            )
          ),
          Authorization: '[REDACTED]',
          'X-Id-Token': '[REDACTED]'
        }
      });
      
      // Use fetch without await to make it non-blocking
      fetch(setupUrl, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(minimalBody),
        credentials: 'include' // Include cookies for authentication
      })
      .then(async (setupResponse) => {
        if (!setupResponse.ok) {
          const errorText = await setupResponse.text();
          logger.warn(`Schema setup returned non-OK status: ${setupResponse.status}`, {
            error: errorText,
            status: setupResponse.status
          });
        } else {
          logger.info('[Subscription] Schema setup initiated successfully');
        }
      })
      .catch((error) => {
        logger.error('[Subscription] Schema setup error:', {
          error: error.message,
          stack: error.stack
        });
      });
      
      // Add a log to confirm we're not waiting for the schema setup
      logger.info('[Subscription] Continuing with response without waiting for schema setup');
    } else {
      logger.info('[Subscription] Skipping schema setup for non-free plan');
    }

    // Return success response
    logger.info('[Subscription] Returning success response:', {
      requestId,
      setupStatus: 'pending',
      nextStep: (body.plan.toLowerCase() === 'professional' || body.plan.toLowerCase() === 'enterprise') ? 'payment' : 'dashboard'
    });

    return finalResponse;
  } catch (outerError) {
    // Handle errors from the entire request
    const errorId = Math.random().toString(36).substring(7);
    logger.error('[Subscription] Fatal error:', {
      errorId,
      error: outerError.message,
      stack: outerError.stack
    });

    return NextResponse.json({
      error: 'Internal server error',
      errorId
    }, {
      status: 500,
      headers: {
        'X-Error-ID': errorId,
        'Content-Type': 'application/json'
      }
    });
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': [
        'Content-Type',
        'Authorization',
        'X-Id-Token',
        'X-Tenant-ID',
        'X-Cognito-Sub',
        'X-Business-ID',
        'X-Onboarding-Status',
        'X-Setup-Done',
        'X-Request-ID'
      ].join(', ')
    }
  });
}
