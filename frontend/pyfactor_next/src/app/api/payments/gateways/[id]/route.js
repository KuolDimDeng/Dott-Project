import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

export async function PATCH(request, { params }) {
  logger.info('🎯 [API] === PAYMENT GATEWAY PATCH REQUEST ===');
  logger.debug('🎯 [API] Gateway ID:', params.id);
  
  try {
    const body = await request.json();
    logger.debug('🎯 [API] Request body:', { 
      ...body, 
      config: { 
        ...body.config, 
        api_key: '[REDACTED]', 
        secret_key: '[REDACTED]' 
      } 
    });
    
    // Forward request to Django backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    logger.debug('🎯 [API] Forwarding to Django backend:', `${backendUrl}/api/payments/gateways/${params.id}/`);
    
    const response = await fetch(`${backendUrl}/api/payments/gateways/${params.id}/`, {
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
          message: data.message || 'Failed to update payment gateway',
          error: data.error || 'Backend error'
        },
        { status: response.status }
      );
    }

    logger.info('🎯 [API] Payment gateway updated successfully');
    return NextResponse.json(data);
  } catch (error) {
    logger.error('🎯 [API] Error updating payment gateway:', error);
    logger.error('🎯 [API] Error details:', { message: error.message, stack: error.stack });

    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to update payment gateway',
        error: error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  logger.info('🎯 [API] === PAYMENT GATEWAY GET REQUEST ===');
  logger.debug('🎯 [API] Gateway ID:', params.id);
  
  try {
    // Forward request to Django backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    logger.debug('🎯 [API] Forwarding to Django backend:', `${backendUrl}/api/payments/gateways/${params.id}/`);
    
    const response = await fetch(`${backendUrl}/api/payments/gateways/${params.id}/`, {
      method: 'GET',
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

    if (!response.ok) {
      logger.error('🎯 [API] Backend request failed with status:', response.status);
      
      // Return mock data for specific gateway if backend is not available
      logger.warn('🎯 [API] Falling back to mock gateway data');
      const mockGateways = {
        '1': {
          id: 1,
          name: 'Stripe',
          gateway_type: 'stripe',
          status: 'active',
          config: {
            test_mode: false,
            webhook_url: 'https://api.dottapps.com/webhooks/stripe'
          }
        },
        '2': {
          id: 2,
          name: 'M-Pesa',
          gateway_type: 'mpesa',
          status: 'inactive',
          config: {
            test_mode: true,
            webhook_url: 'https://api.dottapps.com/webhooks/mpesa'
          }
        }
      };

      const mockData = {
        success: true,
        data: mockGateways[params.id] || null,
        message: 'Payment gateway retrieved successfully (mock data)'
      };

      if (!mockData.data) {
        return NextResponse.json(
          { success: false, message: 'Gateway not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(mockData);
    }

    const data = await response.json();
    logger.debug('🎯 [API] Backend response data:', data);
    logger.info('🎯 [API] Payment gateway retrieved successfully from backend');

    return NextResponse.json(data);
  } catch (error) {
    logger.error('🎯 [API] Error fetching payment gateway:', error);
    logger.error('🎯 [API] Error details:', { message: error.message, stack: error.stack });

    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch payment gateway',
        error: error.message 
      },
      { status: 500 }
    );
  }
}