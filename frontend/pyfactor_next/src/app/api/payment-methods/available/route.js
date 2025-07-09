import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');
    
    logger.info('[PaymentMethods] Checking available methods for country:', country);
    
    // Define payment methods by country
    // Currently only Kenya has M-Pesa enabled
    const paymentMethods = {
      // Kenya - M-Pesa is widely used
      'Kenya': ['card', 'mpesa'],
      'KE': ['card', 'mpesa'],
      
      // Other countries - card only for now
      // Mobile money will be added later
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
            countries: ['KE']
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