/**
 * Test script to verify Kenya pricing is working correctly
 * Run with: node test-kenya-pricing.js
 */

async function testKenyaPricing() {
  console.log('\n=== TESTING KENYA PRICING ===\n');
  
  const baseUrl = 'http://localhost:3000';
  
  try {
    // Test 1: Pricing API with Kenya country code
    console.log('1. Testing pricing API with country=KE...');
    const pricingResponse = await fetch(`${baseUrl}/api/pricing/by-country?country=KE`);
    const pricingData = await pricingResponse.json();
    
    console.log('Response:', JSON.stringify(pricingData, null, 2));
    
    // Verify Kenya pricing
    if (pricingData.country_code === 'KE' && pricingData.discount_percentage === 50) {
      console.log('✅ Kenya discount correctly applied: 50%');
      console.log('✅ Professional monthly: $' + pricingData.pricing.professional.monthly + ' (should be $7.50)');
      console.log('✅ Enterprise monthly: $' + pricingData.pricing.enterprise.monthly + ' (should be $22.50)');
    } else {
      console.log('❌ Kenya discount NOT applied correctly');
      console.log('   Country code:', pricingData.country_code);
      console.log('   Discount:', pricingData.discount_percentage + '%');
    }
    
    // Test 2: Payment methods API
    console.log('\n2. Testing payment methods API with country=KE...');
    const paymentResponse = await fetch(`${baseUrl}/api/payment-methods/available?country=KE`);
    const paymentData = await paymentResponse.json();
    
    console.log('Response:', JSON.stringify(paymentData, null, 2));
    
    if (paymentData.methods.includes('mpesa')) {
      console.log('✅ M-Pesa payment method available for Kenya');
    } else {
      console.log('❌ M-Pesa NOT available for Kenya');
    }
    
    // Test 3: Check other African countries
    console.log('\n3. Testing other African countries...');
    const testCountries = ['NG', 'GH', 'ZA', 'TZ', 'UG'];
    
    for (const country of testCountries) {
      const response = await fetch(`${baseUrl}/api/pricing/by-country?country=${country}`);
      const data = await response.json();
      console.log(`   ${country}: ${data.discount_percentage}% discount`);
    }
    
  } catch (error) {
    console.error('Error testing:', error);
  }
  
  console.log('\n=== TEST COMPLETE ===\n');
}

// Run the test
testKenyaPricing();