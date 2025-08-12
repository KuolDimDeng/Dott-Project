import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

export async function GET(request) {
  logger.info('🎯 [API] === PAYMENT GATEWAYS GET REQUEST ===');
  
  try {
    // Forward request to Django backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    logger.debug('🎯 [API] Forwarding to Django backend:', `${backendUrl}/api/payments/gateways/`);
    
    const response = await fetch(`${backendUrl}/api/payments/gateways/`, {
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
      
      // Return enhanced mock data if backend is not available
      logger.warn('🎯 [API] Falling back to mock payment gateways data');
      const mockData = {
        success: true,
        data: [
          {
            id: 1,
            name: 'Stripe',
            gateway_type: 'stripe',
            logo: '💳',
            status: 'active',
            testMode: false,
            supportedMethods: ['credit_card', 'debit_card', 'bank_transfer'],
            lastSync: '2025-01-06T10:30:00',
            monthlyVolume: 125000,
            successRate: 98.5,
            is_active: true,
            config: {
              webhook_url: 'https://api.dottapps.com/webhooks/stripe'
            }
          },
          {
            id: 2,
            name: 'M-Pesa',
            gateway_type: 'mpesa',
            logo: '📱',
            status: 'inactive',
            testMode: true,
            supportedMethods: ['mobile_money'],
            lastSync: null,
            monthlyVolume: 0,
            successRate: 0,
            is_active: false,
            config: {
              webhook_url: 'https://api.dottapps.com/webhooks/mpesa'
            }
          },
          {
            id: 3,
            name: 'Flutterwave',
            gateway_type: 'flutterwave',
            logo: '🌟',
            status: 'inactive',
            testMode: true,
            supportedMethods: ['credit_card', 'debit_card', 'mobile_money', 'bank_transfer'],
            lastSync: null,
            monthlyVolume: 0,
            successRate: 0,
            is_active: false,
            config: {
              webhook_url: 'https://api.dottapps.com/webhooks/flutterwave'
            }
          },
          {
            id: 4,
            name: 'Bank Transfer',
            gateway_type: 'bank_transfer',
            logo: '🏦',
            status: 'active',
            testMode: false,
            supportedMethods: ['ach', 'wire_transfer'],
            lastSync: '2025-01-06T09:15:00',
            monthlyVolume: 45000,
            successRate: 99.1,
            is_active: true,
            config: {
              webhook_url: 'https://api.dottapps.com/webhooks/bank_transfer'
            }
          }
        ],
        message: 'Payment gateways retrieved successfully (mock data)'
      };

      return NextResponse.json(mockData);
    }

    const data = await response.json();
    logger.debug('🎯 [API] Backend response data:', data);
    logger.info('🎯 [API] Payment gateways retrieved successfully from backend');

    return NextResponse.json(data);
  } catch (error) {
    logger.error('🎯 [API] Error fetching payment gateways:', error);
    logger.error('🎯 [API] Error details:', { message: error.message, stack: error.stack });

    // Return mock data on error
    const mockData = {
      success: true,
      data: [
        {
          id: 1,
          name: 'Stripe',
          gateway_type: 'stripe',
          logo: '💳',
          status: 'active',
          testMode: false,
          supportedMethods: ['credit_card', 'debit_card'],
          monthlyVolume: 125000,
          successRate: 98.5,
          is_active: true
        }
      ],
      message: 'Payment gateways retrieved successfully (fallback data due to error)'
    };

    return NextResponse.json(mockData);
  }
}