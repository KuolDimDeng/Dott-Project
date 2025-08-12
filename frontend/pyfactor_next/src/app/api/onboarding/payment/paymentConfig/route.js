import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

/**
 * Handle payment configuration API request
 * This is a simplified version that returns static payment configuration
 */
export async function GET(request) {
  try {
    logger.debug('[API] Payment config request');

    // Return hardcoded payment configuration
    return NextResponse.json({
      success: true,
      config: {
        publicKey: 'mock-stripe-pk',
        clientSecret: 'mock-client-secret',
        paymentIntentId: 'mock-payment-intent-id',
        amount: 3500, // $35.00
        currency: 'usd',
        description: 'Dott Professional Subscription',
        redirect: {
          success: '/dashboard',
          cancel: '/onboarding/subscription'
        }
      }
    });
  } catch (error) {
    logger.error('[API] Error getting payment config:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get payment configuration',
      message: error.message
    }, { status: 500 });
  }
} 