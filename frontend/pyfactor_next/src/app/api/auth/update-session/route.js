// src/app/api/auth/update-session/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { logger } from '@/utils/logger';
import { encode } from 'next-auth/jwt';

const useSecureCookies = process.env.NEXTAUTH_URL?.startsWith('https://') ?? !!process.env.VERCEL;

export async function POST(req) {
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  try {
    const updates = await req.json();
    const session = await getServerSession(authOptions);

    if (!session) {
      logger.warn('No active session found:', { requestId, timestamp });
      return NextResponse.json(
        { success: false, message: 'No session found' },
        { status: 401 }
      );
    }

    // Create token update with complete state
    const tokenUpdate = {
      ...session.user,
      onboardingStatus: updates.onboardingStatus || 'subscription',
      currentStep: updates.currentStep || 'subscription',
      completedSteps: [
        ...(session.user?.completedSteps || []),
        'business-info'
      ].filter((step, index, self) => self.indexOf(step) === index),
      businessInfo: updates.businessInfo || session.user?.businessInfo || {},
      stepValidation: {
        ...(session.user?.stepValidation || {}),
        'business-info': true,
        ...(updates.stepValidation || {})
      },
      sub: session.user?.id || session.user?.sub,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
      jti: crypto.randomUUID()
    };

    // Encode JWT token
    const encodedToken = await encode({
      token: tokenUpdate,
      secret: process.env.NEXTAUTH_SECRET
    });

    // Update JWT
    const newToken = await authOptions.callbacks.jwt({
      token: tokenUpdate,
      trigger: 'update'
    });

    if (!newToken) {
      throw new Error('Failed to generate JWT token');
    }

    // Update session
    const newSession = await authOptions.callbacks.session({
      session,
      token: newToken,
      trigger: 'update'
    });

    if (!newSession) {
      throw new Error('Failed to update session state');
    }

    logger.debug('Session state updated:', {
      requestId,
      timestamp,
      changes: {
        statusChanged: session.user?.onboardingStatus !== newSession.user.onboardingStatus,
        stepChanged: session.user?.currentStep !== newSession.user.currentStep,
        completedStepsChanged: true,
        previousStatus: session.user?.onboardingStatus,
        newStatus: 'subscription',
        previousStep: session.user?.currentStep,
        newStep: 'subscription'
      }
    });

    const response = NextResponse.json({ 
      success: true, 
      session: newSession 
    });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60
    };

    // Set JWT cookie
    response.cookies.set(
      `${useSecureCookies ? '__Secure-' : ''}next-auth.session-token`,
      encodedToken,
      cookieOptions
    );

    // Set middleware cookie
    response.cookies.set(
      'onboarding-progress',
      JSON.stringify({
        status: 'subscription',
        step: 'subscription',
        completed: ['business-info']
      }),
      { ...cookieOptions, httpOnly: false }
    );

    logger.debug('Session update successful:', {
      requestId,
      timestamp,
      finalState: {
        onboardingStatus: 'subscription',
        currentStep: 'subscription',
        completedSteps: ['business-info'],
        hasToken: true,
        cookiesSet: true
      }
    });

    return response;

  } catch (error) {
    logger.error('Session update failed:', {
      requestId,
      timestamp,
      error: {
        message: error.message,
        stack: error.stack,
        type: error.constructor.name
      }
    });

    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}