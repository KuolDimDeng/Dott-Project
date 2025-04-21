import { NextResponse } from 'next/server';
import { logger } from '@/utils/serverLogger';

// Flag to determine if we're in development mode with no backend for signup only
const BYPASS_SIGNUP_BACKEND = process.env.NEXT_PUBLIC_BYPASS_SIGNUP_BACKEND === 'true' || process.env.BYPASS_SIGNUP_BACKEND === 'true';

// No need for a separate serverLogger since we're importing the correct one

export async function POST(request) {
  try {
    // Get tokens from request headers
    const accessToken = request.headers.get('Authorization')?.replace('Bearer ', '');
    const idToken = request.headers.get('X-Id-Token');
    
    // Check if request is from Lambda (either has a special header or cognitoId in body)
    let isLambdaRequest = request.headers.get('X-Lambda-Source') === 'post-confirmation' || 
                           request.headers.get('User-Agent')?.includes('Lambda');
    
    let isAuthenticated = false;
    let lambdaData = null;
    
    // If tokens missing, check if it might be from Lambda by examining the request body
    if (!accessToken && !idToken) {
      try {
        // Clone the request to read the body without consuming it
        const clonedRequest = request.clone();
        const bodyData = await clonedRequest.json();
        
        // If the request has cognitoId and is_already_verified flag, it's likely from our Lambda
        if (bodyData.cognitoId && bodyData.is_already_verified === true) {
          isLambdaRequest = true;
          lambdaData = bodyData;
          isAuthenticated = true;
          
          console.log('[Signup] Identified request from Lambda by payload signature');
          try {
            logger.info('[Signup] Processing Lambda post-confirmation request');
          } catch (logError) {
            console.error('[Signup] Logger error:', logError);
          }
        } else {
          // Use console.error as a fallback in case logger.error has issues
          console.error('[Signup] No auth tokens in request headers');
          try {
            logger.warn('[Signup] No auth tokens in request headers');
          } catch (logError) {
            console.error('[Signup] Logger error:', logError);
          }
          
          return NextResponse.json(
            { error: 'No valid session' },
            { status: 401 }
          );
        }
      } catch (bodyParseError) {
        // Failed to parse body, assume this is not a valid request
        console.error('[Signup] Failed to parse request body to check for Lambda signature:', bodyParseError);
        
        return NextResponse.json(
          { error: 'No valid session' },
          { status: 401 }
        );
      }
    } else {
      isAuthenticated = true;
    }
    
    // Parse request body if not already parsed
    const data = lambdaData || await request.json();
    
    // Get tenant ID from Cognito user attributes or generate a new one
    let tenantId = null;
    
    // If this request includes auth tokens, try to get custom:tenantId from them
    if (idToken) {
      try {
        // Decode the ID token to extract custom attributes
        const base64Url = idToken.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(Buffer.from(base64, 'base64').toString());
        
        // Get tenant ID from custom attribute
        if (payload['custom:tenantId']) {
          tenantId = payload['custom:tenantId'];
          logger.info('[Signup] Found tenant ID in Cognito attributes:', tenantId);
        }
      } catch (tokenDecodeError) {
        logger.warn('[Signup] Failed to decode ID token:', tokenDecodeError);
      }
    }
    
    // If tenant ID is in the request data, use that
    if (!tenantId && (data.tenantId || data.tenant_id)) {
      tenantId = data.tenantId || data.tenant_id;
      logger.info('[Signup] Using tenant ID from request data:', tenantId);
    }
    
    // Generate a unique tenant/business ID if not provided
    if (!tenantId && !data.businessId && !data.business_id) {
      tenantId = crypto.randomUUID();
      logger.info('[Signup] Generated new tenant ID:', tenantId);
    } else if (!tenantId) {
      // Use businessId if tenantId not found but businessId exists
      tenantId = data.businessId || data.business_id;
      logger.info('[Signup] Using business ID as tenant ID:', tenantId);
    }
    
    // Ensure business_id and businessId are set to tenant ID
    data.businessId = tenantId;
    data.business_id = tenantId;
    
    // Ensure we have all required fields with defaults
    const timestamp = new Date().toISOString();
    
    // Generate a business name from user data if not provided
    let businessName = data.business_name || data.businessName;
    if (!businessName || businessName === '') {
      // Try to generate a business name from user's name
      if ((data.firstName || data.first_name) && (data.lastName || data.last_name)) {
        businessName = `${data.firstName || data.first_name} ${data.lastName || data.last_name}'s Business`;
      } else if (data.firstName || data.first_name) {
        businessName = `${data.firstName || data.first_name}'s Business`;
      } else if (data.lastName || data.last_name) {
        businessName = `${data.lastName || data.last_name}'s Business`;
      } else if (data.email) {
        // Try to extract a name from email (e.g., john.doe@example.com -> John's Business)
        const emailName = data.email.split('@')[0].split('.')[0];
        if (emailName && emailName.length > 1) {
          businessName = `${emailName.charAt(0).toUpperCase() + emailName.slice(1)}'s Business`;
        }
      }
      // If no valid business name was found or generated, use empty string
      businessName = '';
      logger.info('[Signup] No business name could be generated, using empty string');
    } else {
      logger.info(`[Signup] Generated business name from user data: ${businessName}`);
    }
    
    const userData = {
      email: data.email,
      first_name: data.firstName || '',
      last_name: data.lastName || '',
      cognito_id: data.cognitoId,
      user_role: data.userRole || 'OWNER',
      business_id: data.business_id || data.businessId,
      business_name: businessName,
      business_type: data.business_type || data.businessType || 'Other',
      business_country: data.business_country || data.country || 'US',
      legal_structure: data.legal_structure || data.legalStructure || 'Sole Proprietorship',
      subscription_plan: data.subscription_plan || data.subscriptionPlan || 'free',
      subscription_interval: data.subscription_interval || data.subscriptionInterval || 'MONTHLY',
      subscription_status: data.subscription_status || data.subscriptionStatus || 'ACTIVE',
      account_status: data.account_status || data.accountStatus || 'PENDING',
      onboarding_status: data.onboarding_status || data.onboardingStatus || 'not_started',
      setup_done: data.setup_done || data.setupDone || false,
      payment_verified: data.payment_verified || data.paymentVerified || false,
      requires_payment: data.requires_payment || data.requiresPayment || false,
      date_founded: data.date_founded || data.dateFounded || timestamp.split('T')[0],
      created_at: data.created_at || timestamp,
      last_login: data.last_login || data.lastLogin || timestamp,
      payment_id: data.payment_id || data.paymentId || '',
      payment_method: data.payment_method || data.paymentMethod || '',
      preferences: data.preferences || '{}'
    };

    // If in development mode with bypass signup, return mock response without calling backend
    if (BYPASS_SIGNUP_BACKEND) {
      console.log('[Signup] BYPASS_SIGNUP_BACKEND enabled, skipping backend API call for signup only');
      try {
        logger.info('[Signup] Bypassing backend: Mocking successful user creation', { 
          email: userData.email,
          cognito_id: userData.cognito_id
        });
      } catch (logError) {
        console.log('[Signup] Logger error:', logError);
      }
      
      // Create a mock user ID that's predictable based on email
      const emailHash = userData.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
      const mockUserId = `dev-${emailHash}-${userData.cognito_id.substring(0, 8)}`;
      
      // Ensure tenant exists by calling the tenant-manager API
      try {
        logger.info('[Signup] Ensuring tenant exists by calling tenant-manager API');
        
        // Create tenant using tenant-manager API with tenant_id and user_id
        const tenantResponse = await fetch(`${process.env.NEXTAUTH_URL || ''}/api/tenant/tenant-manager`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            tenant_id: tenantId,
            user_id: data.cognitoId,
            business_name: businessName,
            forceCreate: true
          })
        });
        
        if (tenantResponse.ok) {
          const tenantData = await tenantResponse.json();
          logger.info('[Signup] Tenant creation result:', tenantData);
          
          if (tenantData.success) {
            logger.info(`[Signup] Tenant ${tenantId} ${tenantData.created ? 'created' : 'already exists'}`);
          } else {
            logger.warn(`[Signup] Tenant creation response unsuccessful:`, tenantData);
          }
        } else {
          logger.error(`[Signup] Error from tenant-manager API: ${tenantResponse.status}`);
        }
      } catch (tenantError) {
        logger.error('[Signup] Error calling tenant-manager API:', tenantError);
        // Continue with signup process even if tenant creation fails
      }

      // Only update Cognito attributes if we have valid tokens (not Lambda request)
      if (accessToken && idToken) {
        try {
          const attributeUpdateResponse = await fetch('/api/user/update-attributes', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
              'X-Id-Token': idToken
            },
            body: JSON.stringify({
              attributes: {
                'custom:businessid': userData.business_id,
                'custom:tenantId': userData.business_id,
                'custom:businessname': userData.business_name,
                'custom:businesstype': userData.business_type,
                'custom:businesscountry': userData.business_country,
                'custom:legalstructure': userData.legal_structure,
                'custom:devmode': 'true'
              }
            })
          });
          
          if (!attributeUpdateResponse.ok) {
            console.warn('[Signup] Failed to update Cognito attributes in dev mode');
          }
        } catch (attributeError) {
          console.warn('[Signup] Error updating Cognito attributes in dev mode:', attributeError);
        }
      }

      return NextResponse.json({
        success: true,
        userId: mockUserId,
        message: 'DEV MODE: User created successfully (signup backend bypassed)',
        businessId: userData.business_id
      });
    }

    // Forward request to backend to create user (only if not bypassing signup)
    const backendUrl = process.env.BACKEND_API_URL || 'https://127.0.0.1:8000';
    try {
      // Include auth headers only if they exist
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      
      if (idToken) {
        headers['X-Id-Token'] = idToken;
      }
      
      // If this is from Lambda, add a special header
      if (isLambdaRequest) {
        headers['X-Source'] = 'lambda-post-confirmation';
      }
      
      const response = await fetch(`${backendUrl}/api/auth/signup/`, {
        method: 'POST',
        headers,
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const error = await response.json();
        // Use console.error as a fallback
        console.error('[Signup] Backend API error:', error);
        try {
          logger.warn('[Signup] Backend API error:', error);
        } catch (logError) {
          console.error('[Signup] Logger error:', logError);
        }
        
        throw new Error(error.message || 'Failed to create user');
      }

      const result = await response.json();
      try {
        logger.debug('[Signup] User created successfully:', result);
      } catch (logError) {
        console.log('[Signup] Logger error:', logError);
      }

      // Only update Cognito attributes if we have valid tokens (not Lambda request)
      if (accessToken && idToken) {
        try {
          const attributeUpdateResponse = await fetch('/api/user/update-attributes', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
              'X-Id-Token': idToken
            },
            body: JSON.stringify({
              attributes: {
                'custom:businessid': userData.business_id,
                'custom:tenantId': userData.business_id,
                'custom:businessname': userData.business_name,
                'custom:businesstype': userData.business_type,
                'custom:businesscountry': userData.business_country,
                'custom:legalstructure': userData.legal_structure
              }
            })
          });
          
          if (!attributeUpdateResponse.ok) {
            try {
              logger.warn('[Signup] Failed to update Cognito attributes, but user was created successfully');
            } catch (logError) {
              console.warn('[Signup] Failed to update Cognito attributes, but user was created successfully');
            }
          }
        } catch (attributeError) {
          try {
            logger.warn('[Signup] Error updating Cognito attributes:', attributeError);
          } catch (logError) {
            console.warn('[Signup] Error updating Cognito attributes:', attributeError);
          }
          // Continue even if attribute update fails - we'll fix it during onboarding
        }
      }

      return NextResponse.json({
        success: true,
        userId: result.user_id,
        message: 'User created successfully',
        businessId: userData.business_id
      });
    } catch (backendError) {
      // Log the backend error but don't rethrow it
      console.error('[Signup] Backend API request failed:', backendError);
      try {
        logger.warn('[Signup] Backend API request failed:', backendError);
      } catch (logError) {
        console.error('[Signup] Logger error:', logError);
      }
      
      // Return a success response anyway with a warning flag
      // This ensures the frontend flow continues and the user is registered
      return NextResponse.json({
        success: true,
        warning: 'User was registered in Cognito but backend registration had issues',
        message: 'User verification successful but backend registration failed',
        businessId: userData.business_id
      });
    }
  } catch (error) {
    console.error('[Signup] Error processing signup:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}