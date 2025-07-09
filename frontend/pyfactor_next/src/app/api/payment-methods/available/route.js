import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');
    
    logger.info('[PaymentMethods] Checking available methods for country:', country);
    
    // Define payment methods by country
    const paymentMethods = {
      // Kenya - M-Pesa is widely used
      'Kenya': ['card', 'mpesa'],
      'KE': ['card', 'mpesa'],
      
      // Other African countries with mobile money
      'Nigeria': ['card', 'flutterwave'],
      'NG': ['card', 'flutterwave'],
      'Ghana': ['card', 'mtn_mobile_money'],
      'GH': ['card', 'mtn_mobile_money'],
      'Uganda': ['card', 'mtn_mobile_money'],
      'UG': ['card', 'mtn_mobile_money'],
      'Tanzania': ['card', 'mpesa'],
      'TZ': ['card', 'mpesa'],
      'Rwanda': ['card', 'mtn_mobile_money'],
      'RW': ['card', 'mtn_mobile_money'],
      
      // Default for other countries
      'default': ['card']
    };
    
    // Get methods for the country
    const methods = paymentMethods[country] || paymentMethods['default'];
    
    // Return formatted response
    return NextResponse.json({
      country: country,
      methods: methods,
      primary_method: methods[0],
      // Add display names
      method_details: methods.map(method => {
        const details = {
          card: {
            id: 'card',
            name: 'Credit/Debit Card',
            description: 'Visa, Mastercard, American Express',
            icon: 'card'
          },
          mpesa: {
            id: 'mpesa',
            name: 'M-Pesa',
            description: 'Mobile Money Payment',
            icon: 'mobile',
            countries: ['KE', 'TZ']
          },
          flutterwave: {
            id: 'flutterwave',
            name: 'Bank Transfer',
            description: 'Pay via bank transfer',
            icon: 'bank',
            countries: ['NG']
          },
          mtn_mobile_money: {
            id: 'mtn_mobile_money',
            name: 'MTN Mobile Money',
            description: 'Mobile Money Payment',
            icon: 'mobile',
            countries: ['GH', 'UG', 'RW']
          }
        };
        
        return details[method] || { id: method, name: method, description: '', icon: 'default' };
      })
    });
    
  } catch (error) {
    logger.error('[PaymentMethods] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to get payment methods',
      methods: ['card'] // Fallback to card only
    }, { status: 500 });
  }
}