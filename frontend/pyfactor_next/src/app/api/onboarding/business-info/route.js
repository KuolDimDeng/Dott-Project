import { NextResponse } from 'next/server';
import { getCurrentUser } from 'aws-amplify/auth';
import { configureAmplify } from '@/config/amplify';
import { logger } from '@/utils/logger';

export async function POST(request) {
  try {
    // Ensure Amplify is configured
    configureAmplify();

    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get the request body
    const businessData = await request.json();

    // Create/update business record through backend API
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/businesses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.signInUserSession.accessToken.jwtToken}`,
        'X-Request-ID': crypto.randomUUID()
      },
      body: JSON.stringify({
        ...businessData,
        user_id: user.userId
      })
    });

    if (!response.ok) {
      throw new Error(`Backend request failed: ${response.status}`);
    }

    const business = await response.json();

    // Update onboarding status
    const statusResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/onboarding/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.signInUserSession.accessToken.jwtToken}`,
        'X-Request-ID': crypto.randomUUID()
      },
      body: JSON.stringify({
        business_info_completed: true,
        current_step: 'subscription'
      })
    });

    if (!statusResponse.ok) {
      throw new Error(`Failed to update onboarding status: ${statusResponse.status}`);
    }

    return NextResponse.json({ 
      success: true,
      business,
      message: 'Business information saved successfully'
    });

  } catch (error) {
    logger.error('Error saving business info:', {
      error: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to save business information'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Ensure Amplify is configured
    configureAmplify();

    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get business data through backend API
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/businesses/current`, {
      headers: {
        'Authorization': `Bearer ${user.signInUserSession.accessToken.jwtToken}`,
        'X-Request-ID': crypto.randomUUID()
      }
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Backend request failed: ${response.status}`);
    }

    const business = response.status === 404 ? null : await response.json();

    return NextResponse.json({ 
      success: true,
      business
    });

  } catch (error) {
    logger.error('Error fetching business info:', {
      error: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to fetch business information'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    // Ensure Amplify is configured
    configureAmplify();

    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get the request body
    const updates = await request.json();

    // Update business record through backend API
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/businesses/current`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.signInUserSession.accessToken.jwtToken}`,
        'X-Request-ID': crypto.randomUUID()
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error(`Backend request failed: ${response.status}`);
    }

    const business = await response.json();

    return NextResponse.json({ 
      success: true,
      business,
      message: 'Business information updated successfully'
    });

  } catch (error) {
    logger.error('Error updating business info:', {
      error: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to update business information'
      },
      { status: 500 }
    );
  }
}
