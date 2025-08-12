import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

export async function PATCH(request, { params }) {
  logger.info('🎯 [API] === PAYMENT METHOD PATCH REQUEST ===');
  logger.debug('🎯 [API] Method ID:', params.id);
  
  try {
    const body = await request.json();
    logger.debug('🎯 [API] Request body:', { ...body, account_number: '[REDACTED]' });
    
    // Forward request to Django backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    logger.debug('🎯 [API] Forwarding to Django backend:', `${backendUrl}/api/payments/methods/${params.id}/`);
    
    const response = await fetch(`${backendUrl}/api/payments/methods/${params.id}/`, {
      method: 'PATCH',
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
          message: data.message || 'Failed to update payment method',
          error: data.error || 'Backend error'
        },
        { status: response.status }
      );
    }

    logger.info('🎯 [API] Payment method updated successfully');
    return NextResponse.json(data);
  } catch (error) {
    logger.error('🎯 [API] Error updating payment method:', error);
    logger.error('🎯 [API] Error details:', { message: error.message, stack: error.stack });

    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to update payment method',
        error: error.message 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  logger.info('🎯 [API] === PAYMENT METHOD DELETE REQUEST ===');
  logger.debug('🎯 [API] Method ID:', params.id);
  
  try {
    // Forward request to Django backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    logger.debug('🎯 [API] Forwarding to Django backend:', `${backendUrl}/api/payments/methods/${params.id}/`);
    
    const response = await fetch(`${backendUrl}/api/payments/methods/${params.id}/`, {
      method: 'DELETE',
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
    });

    logger.debug('🎯 [API] Django backend response status:', response.status);

    if (response.status === 204) {
      logger.info('🎯 [API] Payment method deleted successfully');
      return NextResponse.json({ 
        success: true, 
        message: 'Payment method deleted successfully' 
      });
    }

    const data = await response.json();
    logger.debug('🎯 [API] Django backend response data:', data);

    if (!response.ok) {
      logger.error('🎯 [API] Backend request failed:', data);
      return NextResponse.json(
        { 
          success: false, 
          message: data.message || 'Failed to delete payment method',
          error: data.error || 'Backend error'
        },
        { status: response.status }
      );
    }

    logger.info('🎯 [API] Payment method deleted successfully');
    return NextResponse.json(data);
  } catch (error) {
    logger.error('🎯 [API] Error deleting payment method:', error);
    logger.error('🎯 [API] Error details:', { message: error.message, stack: error.stack });

    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to delete payment method',
        error: error.message 
      },
      { status: 500 }
    );
  }
}