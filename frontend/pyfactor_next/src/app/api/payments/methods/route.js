import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

export async function GET(request) {
  logger.info('🎯 [API] === PAYMENT METHODS GET REQUEST ===');
  
  try {
    // Forward request to Django backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    logger.debug('🎯 [API] Forwarding to Django backend:', `${backendUrl}/api/payments/methods/`);
    
    const response = await fetch(`${backendUrl}/api/payments/methods/`, {
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
      
      // Return mock data if backend is not available
      logger.warn('🎯 [API] Falling back to mock payment methods data');
      const mockData = {
        success: true,
        data: [
          {
            id: 1,
            name: 'Main Business Account',
            type: 'bank_account',
            accountNumber: '****1234',
            bankName: 'Chase Bank',
            isDefault: true,
            isActive: true,
            created_at: '2025-01-01T12:00:00Z'
          },
          {
            id: 2,
            name: 'M-Pesa Business',
            type: 'mpesa',
            accountNumber: '254****7890',
            bankName: 'Safaricom',
            isDefault: false,
            isActive: true,
            created_at: '2025-01-03T12:00:00Z'
          }
        ],
        message: 'Payment methods retrieved successfully (mock data)'
      };

      return NextResponse.json(mockData);
    }

    const data = await response.json();
    logger.debug('🎯 [API] Backend response data:', data);
    logger.info('🎯 [API] Payment methods retrieved successfully from backend');

    return NextResponse.json(data);
  } catch (error) {
    logger.error('🎯 [API] Error fetching payment methods:', error);
    logger.error('🎯 [API] Error details:', { message: error.message, stack: error.stack });

    // Return mock data on error
    const mockData = {
      success: true,
      data: [
        {
          id: 1,
          name: 'Main Business Account',
          type: 'bank_account',
          accountNumber: '****1234',
          bankName: 'Chase Bank',
          isDefault: true,
          isActive: true,
          created_at: '2025-01-01T12:00:00Z'
        }
      ],
      message: 'Payment methods retrieved successfully (fallback data due to error)'
    };

    return NextResponse.json(mockData);
  }
}

export async function POST(request) {
  logger.info('🎯 [API] === PAYMENT METHODS POST REQUEST ===');
  
  try {
    const body = await request.json();
    logger.debug('🎯 [API] Request body:', { ...body, account_number: '[REDACTED]' });
    
    // Forward request to Django backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    logger.debug('🎯 [API] Forwarding to Django backend:', `${backendUrl}/api/payments/methods/`);
    
    const response = await fetch(`${backendUrl}/api/payments/methods/`, {
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
          message: data.message || 'Failed to create payment method',
          error: data.error || 'Backend error'
        },
        { status: response.status }
      );
    }

    logger.info('🎯 [API] Payment method created successfully');
    return NextResponse.json(data);
  } catch (error) {
    logger.error('🎯 [API] Error creating payment method:', error);
    logger.error('🎯 [API] Error details:', { message: error.message, stack: error.stack });

    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to create payment method',
        error: error.message 
      },
      { status: 500 }
    );
  }
}