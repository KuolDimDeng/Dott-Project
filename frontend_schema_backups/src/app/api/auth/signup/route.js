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
    
    // Generate a unique tenant/business ID if not provided
    if (!data.businessId && !data.business_id) {
      data.businessId = crypto.randomUUID();
    }
    
    // Generate a business name from user data if not provided
    let businessName = data.business_name || data.businessName;
    if (!businessName || businessName === 'Default Business' || businessName === 'My Business') {
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
      // If all else fails, leave it blank for the user to update later
      if (!businessName) {
        businessName = '';
      }
    }
    
    // Ensure we have all required fields with defaults
    const timestamp = new Date().toISOString();
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
      subscription_plan: data.subscription_plan || data.subscriptionPlan || 'FREE',
      subscription_interval: data.subscription_interval || data.subscriptionInterval || 'MONTHLY',
      subscription_status: data.subscription_status || data.subscriptionStatus || 'ACTIVE',
      account_status: data.account_status || data.accountStatus || 'PENDING',
      onboarding_status: data.onboarding_status || data.onboardingStatus || 'NOT_STARTED',
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