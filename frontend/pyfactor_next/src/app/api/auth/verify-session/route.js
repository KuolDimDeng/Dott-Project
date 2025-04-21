import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { validateServerSession } from '@/utils/serverAuth';
import { isValidUUID } from '@/utils/tenantUtils';
import { v4 as uuidv4 } from 'uuid';

/**
 * Endpoint to verify user session and return Cognito attribute data
 * This is a preferred replacement for cookie-based session validation
 */
export async function GET(request) {
  const requestId = Math.random().toString(36).substring(2, 9);
  
  try {
    logger.debug(`[Session API] Verification request ${requestId}`);
    
    // Validate session using server utils
    const { tokens, user } = await validateServerSession();
    
    if (!user) {
      logger.debug(`[Session API] Session verification failed - user not authenticated ${requestId}`);
      return NextResponse.json({
        isLoggedIn: false,
        authenticated: false,
        requestId
      });
    }
    
    try {
      // Prepare the response with cognito attributes
      logger.debug(`[Session API] Session verification successful for user ${user.userId} ${requestId}`);
      
      // Extract relevant user attributes from token - only use attributes that exist in Cognito
      const attributes = user.attributes || {};
      
      // Map available attributes, use null/defaults for missing ones
      const mappedAttributes = {
        email: attributes.email,
        firstName: attributes['given_name'] || attributes['custom:firstname'] || '',
        lastName: attributes['family_name'] || attributes['custom:lastname'] || '',
        userId: attributes.sub,
        onboardingStatus: attributes['custom:onboarding'] || 'not_started',
        businessName: attributes['custom:businessname'] || '',
        businessType: attributes['custom:businesstype'] || '',
        legalStructure: attributes['custom:legalstructure'] || '',
        businessCountry: attributes['custom:businesscountry'] || '',
        businessState: attributes['custom:businessstate'] || '',
        dateFormatPreference: attributes['custom:dateformat'] || 'MM/DD/YYYY',
        dateFounded: attributes['custom:datefounded'] || '',
        businessSubtypes: attributes['custom:businesssubtypes'] || '',
        subscriptionPlan: attributes['custom:subplan'] || '',
        subscriptionInterval: attributes['custom:subscriptioninterval'] || 'monthly',
        subscriptionStatus: attributes['custom:subscriptionstatus'] || 'pending',
        currency: attributes['custom:currency'] || 'USD',
        language: attributes['custom:language'] || 'en',
        timezone: attributes['custom:timezone'] || 'America/New_York',
        requiresPayment: attributes['custom:requirespayment'] === 'true',
        setupDone: attributes['custom:setupdone'] === 'TRUE' || attributes['custom:setupdone'] === 'true',
        paymentVerified: attributes['custom:payverified'] === 'TRUE' || attributes['custom:payverified'] === 'true',
        createdAt: attributes['custom:created_at'] || null,
        updatedAt: attributes['custom:updated_at'] || null,
        userRole: attributes['custom:userrole'] || 'user'
      };
      
      // Handle tenant ID/business ID correctly
      let tenantId = attributes['custom:tenant_ID'] || attributes['custom:tenantId'] || attributes['custom:businessid'] || null;
      
      // Validate the tenant ID format
      if (tenantId && !isValidUUID(tenantId)) {
        logger.warn(`[Session API] Invalid tenant ID format: "${tenantId}" for user ${mappedAttributes.userId}`);
        
        // If it starts with "bus_" or doesn't contain hyphens, it's likely invalid
        if (tenantId.startsWith('bus_') || !tenantId.includes('-')) {
          logger.warn(`[Session API] Discarding invalid tenant ID format for user ${mappedAttributes.userId}`);
          tenantId = null;
        }
      }
      
      // Determine onboarding completion status based on available flags
      // Even if custom:business_info_done doesn't exist, we can infer from other attributes
      const businessInfoCompleted = 
        mappedAttributes.businessName && mappedAttributes.businessType ? true : false;
      
      const subscriptionCompleted = 
        mappedAttributes.subscriptionPlan ? true : false;
      
      const paymentCompleted = 
        mappedAttributes.paymentVerified || 
        (mappedAttributes.subscriptionPlan === 'free') || 
        false;
      
      // Construct response object
      const response = {
        isLoggedIn: true,
        authenticated: true,
        user: {
          id: mappedAttributes.userId,
          email: mappedAttributes.email,
          firstName: mappedAttributes.firstName,
          lastName: mappedAttributes.lastName,
          onboardingStatus: mappedAttributes.onboardingStatus,
          businessName: mappedAttributes.businessName,
          businessType: mappedAttributes.businessType,
          tenantId: tenantId,
          subscriptionPlan: mappedAttributes.subscriptionPlan,
          setupDone: mappedAttributes.setupDone,
          subscriptionDone: subscriptionCompleted,
          paymentDone: paymentCompleted,
          businessInfoDone: businessInfoCompleted,
          lastVerified: new Date().toISOString(),
          // Include additional fields that might be useful
          subscriptionStatus: mappedAttributes.subscriptionStatus,
          subscriptionInterval: mappedAttributes.subscriptionInterval,
          legalStructure: mappedAttributes.legalStructure,
          currency: mappedAttributes.currency,
          language: mappedAttributes.language,
          timezone: mappedAttributes.timezone,
          userRole: mappedAttributes.userRole
        },
        requestId
      };
      
      // Additional validation to ensure JSON is valid before returning
      try {
        // This will throw if the object contains any values that can't be serialized
        JSON.stringify(response);
      } catch (jsonError) {
        logger.error(`[Session API] JSON serialization error: ${jsonError.message}`, response);
        // Create a sanitized response if serialization fails
        return NextResponse.json({
          isLoggedIn: true,
          authenticated: true,
          user: {
            id: mappedAttributes.userId,
            email: mappedAttributes.email,
            lastVerified: new Date().toISOString(),
          },
          error: "Data serialization issue detected and fixed",
          requestId
        });
      }
      
      return NextResponse.json(response);
      
    } catch (error) {
      logger.error(`[Session API] Error constructing session response: ${error.message}`);
      throw error;
    }
    
  } catch (error) {
    logger.error(`[Session API] Error verifying session: ${error.message}`);
    
    // Return fallback error but with 200 status so client can handle it gracefully
    return NextResponse.json({
      isLoggedIn: false,
      authenticated: false,
      error: 'Failed to verify session',
      fallback: true,
      requestId
    }, { 
      status: 200
    });
  }
} 