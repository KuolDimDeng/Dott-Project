import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

export async function POST(request) {
  logger.info('🎯 [API] === PAYMENT PROCESSING REQUEST ===');
  
  try {
    const body = await request.json();
    logger.debug('🎯 [API] Request body:', { ...body, api_key: '[REDACTED]', secret_key: '[REDACTED]' });
    
    // Forward request to Django backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    logger.debug('🎯 [API] Forwarding to Django backend:', `${backendUrl}/api/payments/process/`);
    
    const response = await fetch(`${backendUrl}/api/payments/process/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward any authentication headers
        ...(request.headers.get('authorization') && {
          'Authorization': request.headers.get('authorization')
        }),
        ...(request.headers.get('cookie') && {
          'Cookie': request.headers.get('cookie')
        }),
      },
      body: JSON.stringify(body),
    });

    logger.debug('🎯 [API] Django backend response status:', response.status);

    const data = await response.json();
    logger.debug('🎯 [API] Django backend response data:', data);

    if (!response.ok) {
      logger.error('🎯 [API] Backend request failed:', data);
      return NextResponse.json(
        { 
          success: false, 
          message: data.message || 'Payment processing failed',
          error: data.error || 'Backend error'
        },
        { status: response.status }
      );
    }

    logger.info('🎯 [API] Payment processing completed successfully');
    return NextResponse.json(data);
  } catch (error) {
    logger.error('🎯 [API] Error processing payment:', error);
    logger.error('🎯 [API] Error details:', { message: error.message, stack: error.stack });

    return NextResponse.json(
      { 
        success: false, 
        message: 'Payment processing failed',
        error: error.message 
      },
      { status: 500 }
    );
  }
}