import { NextResponse } from 'next/server';

// Payment methods available by country
const PAYMENT_METHODS_BY_COUNTRY = {
  // Africa
  'KE': ['card', 'mpesa'], // Kenya - M-Pesa
  'NG': ['card', 'bank_transfer'], // Nigeria
  'GH': ['card', 'mtn_mobile_money'], // Ghana - MTN Mobile Money
  'ZA': ['card', 'bank_transfer'], // South Africa
  'TZ': ['card', 'mpesa'], // Tanzania - M-Pesa
  'UG': ['card', 'mtn_mobile_money', 'airtel_money'], // Uganda
  'RW': ['card', 'mtn_mobile_money'], // Rwanda
  'ZM': ['card', 'mtn_mobile_money', 'airtel_money'], // Zambia
  'ZW': ['card', 'ecocash'], // Zimbabwe - EcoCash
  'ET': ['card', 'bank_transfer'], // Ethiopia
  'EG': ['card', 'bank_transfer'], // Egypt
  'MA': ['card', 'bank_transfer'], // Morocco
  'TN': ['card', 'bank_transfer'], // Tunisia
  'SN': ['card', 'orange_money'], // Senegal - Orange Money
  'CI': ['card', 'orange_money', 'mtn_mobile_money'], // Côte d'Ivoire
  'CM': ['card', 'mtn_mobile_money', 'orange_money'], // Cameroon
  
  // Asia
  'IN': ['card', 'upi', 'bank_transfer'], // India - UPI
  'BD': ['card', 'bkash'], // Bangladesh - bKash
  'PK': ['card', 'jazzcash', 'easypaisa'], // Pakistan
  'ID': ['card', 'gopay', 'ovo'], // Indonesia
  'PH': ['card', 'gcash', 'paymaya'], // Philippines
  'VN': ['card', 'momo'], // Vietnam - MoMo
  'TH': ['card', 'promptpay'], // Thailand
  'MY': ['card', 'grabpay', 'boost'], // Malaysia
  'SG': ['card', 'paynow'], // Singapore
  
  // Latin America
  'BR': ['card', 'pix', 'boleto'], // Brazil
  'MX': ['card', 'oxxo', 'spei'], // Mexico
  'AR': ['card', 'mercadopago'], // Argentina
  'CO': ['card', 'pse', 'efecty'], // Colombia
  'PE': ['card', 'pago_efectivo'], // Peru
  'CL': ['card', 'webpay'], // Chile
  
  // Default for other countries
  'DEFAULT': ['card']
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');
    
    console.log('🎯 [Payment Methods API] Country requested:', country);
    
    // Get payment methods for country
    let methods = PAYMENT_METHODS_BY_COUNTRY[country?.toUpperCase()] || PAYMENT_METHODS_BY_COUNTRY['DEFAULT'];
    
    console.log('🎯 [Payment Methods API] Available methods:', methods);
    
    // Additional debug for Kenya
    if (country?.toUpperCase() === 'KE') {
      console.log('🎯 [Payment Methods API] Kenya detected - M-Pesa should be available');
      console.log('🎯 [Payment Methods API] Methods include M-Pesa?', methods.includes('mpesa'));
    }
    
    return NextResponse.json({
      country: country?.toUpperCase() || 'US',
      methods: methods,
      default_method: methods[0]
    });
    
  } catch (error) {
    console.error('Error getting payment methods:', error);
    return NextResponse.json({
      country: 'US',
      methods: ['card'],
      default_method: 'card'
    });
  }
}