// src/app/api/onboarding/save-subscription-info/route.js
import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { generateRequestId } from '@/lib/authUtils';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

export async function POST(req) {
  const requestId = generateRequestId();
  
  try {
    // Get request data
    const data = await req.json();
    if (!data) {
      logger.warn('No request data provided:', { requestId });
      return NextResponse.json(
        { message: 'Request data is required' },
        { status: 400 }
      );
    }

    // Validate required fields
    const requiredFields = ['selectedPlan', 'billingCycle'];
    const missingFields = requiredFields.filter(field => !data[field]);
    if (missingFields.length > 0) {
      logger.warn('Missing required fields:', { requestId, missingFields });
      return NextResponse.json(
        { message: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Get session to update it
    const session = await getServerSession(authOptions);
    
    // Determine next step based on plan
    const nextStep = data.selectedPlan === 'professional' ? 'payment' : 'setup';
    const nextStatus = data.selectedPlan === 'professional' ? 'payment' : 'setup';

    // Process subscription info and prepare session update
    logger.info('Saving subscription info:', {
      requestId,
      hasData: !!data,
      userId: session?.user?.id,
      currentStatus: session?.user?.onboardingStatus,
      selectedPlan: data.selectedPlan,
      nextStep
    });

    // Update session data
    if (session?.user) {
      session.user.onboardingStatus = nextStatus;
      session.user.currentStep = nextStep;
      session.user.completedSteps = [
        ...(session.user.completedSteps || []),
        'subscription'
      ];
      session.user.selectedPlan = data.selectedPlan;
      session.user.billingCycle = data.billingCycle;
    }

    // Return success response with updated session data
    return NextResponse.json({
      success: true,
      data: {
        onboardingStatus: nextStatus,
        currentStep: nextStep,
        allowedStepNumber: 3,
        completedSteps: ['business-info', 'subscription'],
        sessionUpdate: {
          onboardingStatus: nextStatus,
          currentStep: nextStep,
          stepValidation: {
            'business-info': true,
            'subscription': true,
            [nextStep]: true
          }
        }
      },
      redirectTo: `/onboarding/${nextStep}`,
      message: 'Subscription information saved successfully'
    }, {
      headers: {
        'Set-Cookie': `onboardingStatus=${nextStatus}; Path=/; HttpOnly; SameSite=Lax`,
        'Cache-Control': 'no-store'
      }
    });

  } catch (error) {
    logger.error('Failed to save subscription info:', {
      requestId,
      error: error.message,
      stack: error.stack
    });

    return NextResponse.json(
      { 
        message: error.message || 'An error occurred',
        requestId,
        success: false
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS(req) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true'
    }
  });
}