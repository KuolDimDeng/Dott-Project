// src/app/api/onboarding/save-business-info/route.js

import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { generateRequestId } from '@/lib/authUtils';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

export async function POST(req) {
  const requestId = generateRequestId();
  
  try {
    logger.debug('Starting business info save handler:', {
        requestId,
        method: req.method,
        contentType: req.headers.get('content-type')
      });
      
    // Validate request method and content-type
    if (req.method !== 'POST') {
      return NextResponse.json(
        { message: 'Method not allowed' },
        { status: 405 }
      );
    }

    if (!req.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json(
        { message: 'Content-Type must be application/json' },
        { status: 415 }
      );
    }

    // Get and validate session first
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      logger.warn('No authenticated user found:', { requestId });
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    // After session validation:
    logger.debug('Session validation complete:', {
        requestId,
        hasUser: !!session?.user,
        currentStatus: session?.user?.onboardingStatus
    });
    

    // Parse and validate request data
    let data;
    try {
      data = await req.json();
    } catch (e) {
      logger.warn('Invalid JSON data:', { requestId, error: e.message });
      return NextResponse.json(
        { message: 'Invalid JSON data' },
        { status: 400 }
      );
    }

    if (!data) {
      logger.warn('No request data provided:', { requestId });
      return NextResponse.json(
        { message: 'Request data is required' },
        { status: 400 }
      );
    }

    // Validate required fields
    const requiredFields = [
      'businessName', 
      'industry', 
      'country', 
      'legalStructure',
      'dateFounded',
      'firstName',
      'lastName'
    ];

    const missingFields = requiredFields.filter(field => !data[field]);
    if (missingFields.length > 0) {
      logger.warn('Missing required fields:', { requestId, missingFields });
      return NextResponse.json(
        { 
          message: `Missing required fields: ${missingFields.join(', ')}`,
          missingFields 
        },
        { status: 400 }
      );
    }

    // Validate date format
    if (!isValidDate(data.dateFounded)) {
      return NextResponse.json(
        { message: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Log business info save attempt
    logger.info('Saving business info:', {
      requestId,
      hasData: true,
      userId: session.user.id,
      currentStatus: session.user.onboardingStatus
    });

    // Create updated session data
    const updatedSession = {
      ...session,
      user: {
        ...session.user,
        onboardingStatus: 'subscription',
        currentStep: 'subscription',
        completedSteps: [...(session.user.completedSteps || []), 'business-info'],
        stepValidation: {
          'business-info': true,
          'subscription': true
        },
        businessInfo: {
          businessName: data.businessName,
          industry: data.industry,
          country: data.country,
          legalStructure: data.legalStructure,
          dateFounded: data.dateFounded,
          firstName: data.firstName,
          lastName: data.lastName,
          lastUpdated: new Date().toISOString()
        }
      }
    };
    
    // Before sending response:
logger.debug('Preparing response:', {
    requestId,
    responseData: {
      success: true,
      data: {
        onboardingStatus: 'subscription',
        currentStep: 'subscription',
        // ... other response data
      }
    }
  });
    // Create success response with complete data
    const response = {
      success: true,
      session: updatedSession,
      data: {
        onboardingStatus: 'subscription',
        currentStep: 'subscription',
        allowedStepNumber: 2,
        completedSteps: ['business-info'],
        stepValidation: {
          'business-info': true,
          'subscription': true
        },
        businessInfo: {
          ...data,
          lastUpdated: new Date().toISOString()
        }
      },
      message: 'Business information saved successfully',
      requestId
    };

    // Set cookies and headers
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    });

    // Add session cookies
    headers.append('Set-Cookie', 
      `onboardingStatus=subscription; Path=/; HttpOnly; SameSite=Lax; Secure`
    );
    headers.append('Set-Cookie', 
      `currentStep=subscription; Path=/; HttpOnly; SameSite=Lax; Secure`
    );

    logger.debug('Business info saved successfully:', {
      requestId,
      userId: session.user.id,
      status: 'success'
    });

    return NextResponse.json(response, {
      status: 200,
      headers
    });

  } catch (error) {
    logger.error('Failed to save business info:', {
      requestId,
      error: error.message,
      stack: error.stack
    });

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to save business information',
        error: error.message,
        requestId
      },
      { status: 500 }
    );
  }
}

// Helper function to validate date format
function isValidDate(dateString) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return false;

  return date.toISOString().slice(0,10) === dateString;
}

// Handle OPTIONS request for CORS
export async function OPTIONS(req) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    }
  });
}