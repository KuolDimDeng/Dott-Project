/**
 * Test script for Paystack payment verification
 * Run with: node test.js
 */

const testPaystackVerification = async () => {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  
  // Test data
  const testReference = 'test_reference_123'; // Replace with actual Paystack reference
  
  try {
    console.log('Testing Paystack verification endpoint...');
    
    const response = await fetch(`${API_URL}/api/payments/verify-paystack`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add session cookie if testing with authentication
        'Cookie': 'sid=your_session_id_here'
      },
      body: JSON.stringify({
        reference: testReference
      })
    });
    
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('✅ Verification successful!');
      console.log('Subscription:', data.subscription);
      console.log('Payment:', data.payment);
    } else {
      console.log('❌ Verification failed:', data.error);
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
};

// Mock Paystack response for local testing
const mockPaystackResponse = {
  status: true,
  message: "Verification successful",
  data: {
    id: 123456789,
    domain: "test",
    status: "success",
    reference: "test_reference_123",
    amount: 1500, // Amount in kobo (15.00 NGN)
    message: null,
    gateway_response: "Successful",
    paid_at: "2025-01-10T10:00:00.000Z",
    created_at: "2025-01-10T09:59:00.000Z",
    channel: "card",
    currency: "NGN",
    ip_address: "127.0.0.1",
    metadata: {
      plan: "professional",
      billing_cycle: "monthly",
      subscription_plan: "professional",
      custom_fields: []
    },
    fees: 23,
    fees_split: null,
    customer: {
      id: 12345,
      first_name: "Test",
      last_name: "User",
      email: "test@example.com",
      phone: "",
      metadata: null,
      customer_code: "CUS_test123"
    },
    authorization: {
      authorization_code: "AUTH_test123",
      bin: "408408",
      last4: "4081",
      exp_month: "12",
      exp_year: "2025",
      channel: "card",
      card_type: "visa",
      bank: "Test Bank",
      country_code: "NG",
      brand: "visa",
      reusable: true,
      signature: "SIG_test123"
    },
    plan: null,
    split: {},
    subaccount: {},
    order_id: null,
    paidAt: "2025-01-10T10:00:00.000Z",
    requested_amount: 1500,
    pos_transaction_data: null,
    source: null
  }
};

// Run the test
testPaystackVerification();