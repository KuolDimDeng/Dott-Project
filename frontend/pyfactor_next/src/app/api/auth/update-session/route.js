// src/app/api/auth/update-session/route.js
import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    const updates = await req.json();

    logger.debug('Session update requested:', {
      hasSession: !!session,
      updates,
      currentStatus: session?.user?.onboardingStatus
    });

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'No session found' },
        { status: 401 }
      );
    }

    // Create updated session object 
    const updatedSession = {
      ...session,
      user: {
        ...session.user,
        onboardingStatus: updates.onboardingStatus,
        currentStep: updates.currentStep,
        completedSteps: updates.completedSteps || [],
        businessInfo: updates.businessInfo || session.user.businessInfo,
        accessToken: session.user.accessToken,
        refreshToken: session.user.refreshToken,
        accessTokenExpires: session.user.accessTokenExpires,
        stepValidation: {
          ...(session.user.stepValidation || {}),
          ...(updates.stepValidation || {})
        }
      }
    };

    // Update the session token
    const token = {
      ...session.token,
      ...updatedSession.user,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000 + 24 * 60 * 60), // 24 hours
    };

    // Remove the problematic session update call
    // Since NextAuth will handle session updates automatically

    const cookieOptions = {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60
    };

    const response = NextResponse.json({
      success: true,
      session: updatedSession,
      token
    });

    // Set cookies for state persistence
    response.cookies.set(
      'onboarding-status',
      updates.onboardingStatus,
      cookieOptions
    );

    response.cookies.set(
      'current-step',
      updates.currentStep,
      cookieOptions
    );

    response.cookies.set(
      'onboarding-progress',
      JSON.stringify({
        status: updates.onboardingStatus,
        step: updates.currentStep,
        completed: updates.completedSteps
      }),
      cookieOptions
    );

    logger.debug('Session update successful:', {
      onboardingStatus: updates.onboardingStatus,
      currentStep: updates.currentStep,
      hasToken: !!token
    });

    return response;

  } catch (error) {
    logger.error('Session update failed:', {
      error: error.message,
      stack: error.stack
    });

    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}