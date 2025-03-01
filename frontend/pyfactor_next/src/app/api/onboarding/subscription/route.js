import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { validateServerSession } from '@/utils/serverUtils';
import { updateOnboardingStep, validateSubscription } from '@/utils/onboardingUtils';

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
      const validPlans = ['FREE', 'PROFESSIONAL'];
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
          validPlans: ['FREE', 'PROFESSIONAL'],
          validIntervals: ['MONTHLY', 'YEARLY']
        }
      });
      return NextResponse.json({
        error: 'Validation Failed',
        code: 'subscription_validation_error',
        details: error.message,
        validationRules: {
          validPlans: ['FREE', 'PROFESSIONAL'],
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

      if (currentStatus !== 'BUSINESS_INFO') {
        return NextResponse.json(
          { error: 'Must complete business info before subscription' },
          { status: 400 }
        );
      }
    }

    // Add reset flag to backend request headers
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'X-Id-Token': idToken,
      'X-User-ID': userId,
      'X-Onboarding-Status': currentStatus
    };

    if (isReset) {
      headers['X-Reset-Onboarding'] = 'true';
    }
    
    // Get IDs and validate request
    const tenantId = attributes['custom:businessid'];
    const cognitoUserId = attributes.sub;

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
        validPlans: ['FREE', 'PROFESSIONAL'],
        validIntervals: ['MONTHLY', 'YEARLY'],
        allowedStatus: ['BUSINESS_INFO', 'NOT_STARTED']
      }
    });

    logger.debug('[Subscription] Request headers:', {
      ...Object.fromEntries(
        Object.entries(headers).filter(([key]) =>
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

    // Validate required context
    if (!tenantId || !cognitoUserId || !attributes['custom:businessid']) {
      logger.error('[Subscription] Missing required context:', {
        tenantId,
        cognitoUserId,
        businessId: attributes['custom:businessid'],
        attributes: Object.keys(attributes)
      });
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

    // Prepare request headers with tracking
    const requestId = Math.random().toString(36).substring(7);
    const requestHeaders = {
      ...headers,
      'X-Tenant-ID': tenantId,
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
          Object.entries(headers).filter(([key]) =>
            !['Authorization', 'X-Id-Token'].includes(key)
          )
        ),
        Authorization: '[REDACTED]',
        'X-Id-Token': '[REDACTED]'
      },
      body: {
        selected_plan: body.plan.toUpperCase(),
        billing_cycle: body.interval.toUpperCase(),
        current_status: currentStatus,
        next_status: body.plan.toUpperCase() === 'PROFESSIONAL' ? 'PAYMENT' : 'SETUP',
        reset_onboarding: isReset,
        requires_payment: body.plan.toUpperCase() === 'PROFESSIONAL',
        tenant_id: tenantId,
        business_id: attributes['custom:businessid'],
        cognito_sub: cognitoUserId
      }
    });

    logger.info('[Subscription] Preparing backend request:', {
      url: requestUrl,
      tenantId,
      headers: {
        ...headers,
        Authorization: '[REDACTED]',
        'X-Id-Token': '[REDACTED]'
      },
      body: {
        selected_plan: body.plan.toUpperCase(),
        billing_cycle: body.interval.toUpperCase(),
        current_status: currentStatus,
        next_status: body.plan.toUpperCase() === 'PROFESSIONAL' ? 'PAYMENT' : 'SETUP',
        reset_onboarding: isReset,
        requires_payment: body.plan.toUpperCase() === 'PROFESSIONAL',
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
      selected_plan: plan,
      billing_cycle: interval,
      current_status: currentStatus,
      next_status: plan === 'PROFESSIONAL' ? 'PAYMENT' : 'SETUP',
      reset_onboarding: isReset,
      requires_payment: plan === 'PROFESSIONAL',
      tenant_id: tenantId,
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
          plan,
          interval
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
    await updateOnboardingStep(nextStatus, {
      'custom:subplan': body.plan,
      'custom:subscriptioninterval': body.interval,
      'custom:requirespayment': body.plan.toUpperCase() === 'PROFESSIONAL' ? 'TRUE' : 'FALSE',
      'custom:setupdone': 'FALSE' // Indicate setup is pending
    }, {
      accessToken: accessToken,
      idToken: idToken
    });

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
      nextStep: body.plan.toUpperCase() === 'PROFESSIONAL' ? 'payment' : 'dashboard',
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
        'X-Next-Step': body.plan.toUpperCase() === 'PROFESSIONAL' ? 'payment' : 'dashboard',
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
      nextStep: body.plan.toUpperCase() === 'PROFESSIONAL' ? 'payment' : 'dashboard',
      setupStatus: 'pending',
      timestamp: new Date().toISOString()
    });

    return finalResponse;

    // Trigger schema setup in background after preparing response
    logger.info('[Subscription] Starting background schema setup:', {
      cognitoUserId, // Use consistent ID
      userId,
      businessId: attributes['custom:businessid'],
      timestamp: new Date().toISOString()
    });

    // Fire and forget schema setup
    const setupUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/onboarding/setup/start/`;
    const setupBody = {
      userId: cognitoUserId, // Already have cognitoUserId from earlier
      businessId: attributes['custom:businessid'],
      setupInBackground: true,
      timestamp: new Date().toISOString(),
      tenant: {
        id: tenantId,
        status: 'pending'
      },
      user: {
        id: cognitoUserId, // Use consistent ID
        email: attributes.email,
        setupDone: attributes['custom:setupdone'],
        onboarding: attributes['custom:onboarding'],
        acctstatus: attributes['custom:acctstatus']
      },
      cognito: {
        sub: cognitoUserId, // Use consistent ID
        email: attributes.email,
        username: attributes.Username,
        attributes: {
          businessId: attributes['custom:businessid'],
          businessName: attributes['custom:businessname'],
          setupDone: attributes['custom:setupdone']
        }
      }
    };

    // Log detailed setup request
    logger.debug('[Subscription] Schema setup request:', {
      url: setupUrl,
      body: {
        ...setupBody,
        user: {
          id: cognitoUserId,
          email: attributes.email,
          setupDone: attributes['custom:setupdone']
        }
      },
      headers: {
        'X-Tenant-ID': tenantId,
        'Content-Type': 'application/json',
        'X-Cognito-Sub': cognitoUserId,
        'X-Business-ID': attributes['custom:businessid'],
        'X-Setup-Done': attributes['custom:setupdone']
      },
      context: {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        apiUrl: process.env.NEXT_PUBLIC_API_URL
      }
    });

    // Start schema setup in background
    logger.info('[Subscription] Initiating schema setup:', {
      url: setupUrl,
      tenantId,
      cognitoUserId,
      businessId: attributes['custom:businessid']
    });

    // Start schema setup in background
    const setupRequestId = Math.random().toString(36).substring(7);
    const setupHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'X-Id-Token': idToken,
      'X-Tenant-ID': tenantId,
      'X-Cognito-Sub': cognitoUserId,
      'X-Business-ID': attributes['custom:businessid'],
      'X-Setup-Done': attributes['custom:setupdone'],
      'X-Request-ID': setupRequestId
    };

    logger.info('[Subscription] Starting schema setup:', {
      setupRequestId,
      url: setupUrl,
      tenantId,
      cognitoUserId
    });

    // Start schema setup in background
    Promise.resolve().then(async () => {
      try {
        const setupResponse = await fetch(setupUrl, {
          method: 'POST',
          headers: setupHeaders,
          body: JSON.stringify({
            ...setupBody,
            request_id: setupRequestId,
            timestamp: new Date().toISOString()
          })
        });

        if (!setupResponse.ok) {
          throw new Error(`Schema setup failed: ${setupResponse.status} ${setupResponse.statusText}`);
        }

        const setupData = await setupResponse.json();
        logger.info('[Subscription] Schema setup initiated:', {
          setupRequestId,
          success: setupResponse.ok,
          status: setupResponse.status,
          taskId: setupData?.taskId
        });
      } catch (error) {
        logger.error('[Subscription] Schema setup failed:', {
          setupRequestId,
          error: error.message,
          stack: error.stack
        });
      }
    }).catch(error => {
      logger.error('[Subscription] Unhandled setup error:', {
        setupRequestId,
        error: error.message,
        stack: error.stack
      });
    });

    try {
      // Return success response while setup continues in background
      logger.info('[Subscription] Returning success response:', {
        requestId,
        setupStatus: responseData.setupStatus,
        nextRoute: responseData.nextRoute,
        message: responseData.message
      });

      return jsonResponse;
    } catch (error) {
      // Handle any unhandled errors
      const errorId = Math.random().toString(36).substring(7);
      logger.error('[Subscription] Unhandled error:', {
        errorId,
        error: error.message,
        code: error.code,
        stack: error.stack,
        context: {
          url: request.url,
          method: request.method,
          timestamp: new Date().toISOString()
        }
      });

      return NextResponse.json({
        error: 'Failed to process subscription request',
        details: error.message,
        errorId
      }, {
        status: 500,
        headers: {
          'X-Error-ID': errorId,
          'Content-Type': 'application/json'
        }
      });
    }
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
