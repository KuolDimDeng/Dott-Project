/**
 * Test script to verify Kenya pricing against production API
 * Run with: node test-kenya-production.js
 */

async function testKenyaPricingProduction() {
  console.log('\n=== TESTING KENYA PRICING (PRODUCTION) ===\n');
  
  const baseUrl = 'https://api.dottapps.com';
  
  try {
    // Test 1: Direct backend pricing API with Kenya country code
    console.log('1. Testing backend pricing API directly with country=KE...');
    const pricingResponse = await fetch(`${baseUrl}/api/onboarding/api/pricing/by-country/?country=KE`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Country-Code': 'KE',
        'CF-IPCountry': 'KE'
      }
    });
    
    console.log('   Status:', pricingResponse.status);
    console.log('   Headers:', Object.fromEntries(pricingResponse.headers.entries()));
    
    if (pricingResponse.ok) {
      const pricingData = await pricingResponse.json();
      console.log('   Response:', JSON.stringify(pricingData, null, 2));
      
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
    } else {
      const text = await pricingResponse.text();
      console.log('❌ Error response:', text.substring(0, 200));
    }
    
    // Test 2: Debug endpoint
    console.log('\n2. Testing debug endpoint for Kenya...');
    const debugResponse = await fetch(`${baseUrl}/api/onboarding/api/debug/kenya-pricing/`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('   Status:', debugResponse.status);
    
    if (debugResponse.ok) {
      const debugData = await debugResponse.json();
      console.log('   Response:', JSON.stringify(debugData, null, 2));
    } else {
      const text = await debugResponse.text();
      console.log('❌ Error response:', text.substring(0, 200));
    }
    
    // Test 3: Check other African countries
    console.log('\n3. Testing other African countries...');
    const testCountries = ['NG', 'GH', 'ZA', 'TZ', 'UG'];
    
    for (const country of testCountries) {
      const response = await fetch(`${baseUrl}/api/onboarding/api/pricing/by-country/?country=${country}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Country-Code': country,
          'CF-IPCountry': country
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ${country}: ${data.discount_percentage}% discount (${data.country_code})`);
      } else {
        console.log(`   ${country}: Error ${response.status}`);
      }
    }
    
  } catch (error) {
    console.error('Error testing:', error);
  }
  
  console.log('\n=== TEST COMPLETE ===\n');
}

// Run the test
testKenyaPricingProduction();