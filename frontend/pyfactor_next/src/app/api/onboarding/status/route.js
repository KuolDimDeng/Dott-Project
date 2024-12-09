// src/app/api/onboarding/status/route.js
import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

export async function GET() {
  try {
    // Return initial onboarding state
    return NextResponse.json({
      currentStep: 'step1',
      completed: [],
      data: {}
    });
  } catch (error) {
    logger.error('Failed to get onboarding status:', error);
    return NextResponse.json(
      { error: 'Failed to get onboarding status' },
      { status: 500 }
    );
  }
}