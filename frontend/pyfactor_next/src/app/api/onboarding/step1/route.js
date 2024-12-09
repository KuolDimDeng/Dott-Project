// src/app/api/onboarding/step1/route.js
import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options'; // Make sure path is correct

export async function POST(req) {
  try {
    // Get and validate session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ 
        error: 'UNAUTHORIZED',
        message: 'Please sign in to continue' 
      }, { status: 401 });
    }

    // Parse request body
    let data;
    try {
      data = await req.json();
      logger.debug('Received form data:', data);
    } catch (error) {
      logger.error('Invalid request body:', error);
      return NextResponse.json({
        error: 'INVALID_REQUEST',
        message: 'Invalid request data'
      }, { status: 400 });
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
      logger.warn('Validation failed:', { 
        missingFields,
        userId: session.user.id,
        receivedData: data
      });
      
      return NextResponse.json({
        error: 'VALIDATION_ERROR',
        message: 'Please fill in all required fields',
        fields: missingFields,
        received: Object.keys(data)
      }, { status: 400 });
    }

    // Add user data
    const enrichedData = {
      ...data,
      userId: session.user.id,
      email: session.user.email || data.email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'PENDING',
      step: 'step1'
    };

    // Mock saving to database for now
    logger.info('Step 1 completed for user:', {
      userId: session.user.id,
      businessName: data.businessName,
      step: 'step1'
    });

    return NextResponse.json({
      success: true,
      message: 'Business information saved successfully',
      next_step: 'step2',
      data: enrichedData
    });

  } catch (error) {
    logger.error('Failed to process request:', error);
    return NextResponse.json({
      error: 'SERVER_ERROR',
      message: 'Failed to save your information. Please try again.'
    }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ 
        error: 'UNAUTHORIZED',
        message: 'Please sign in to continue'
      }, { status: 401 });
    }

    // Mock database response for now
    return NextResponse.json({
      success: true,
      data: null
    });

  } catch (error) {
    logger.error('Failed to get data:', error);
    return NextResponse.json({
      error: 'SERVER_ERROR',
      message: 'Failed to retrieve your information'
    }, { status: 500 });
  }
}