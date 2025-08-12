#!/usr/bin/env node

// Test script to debug location update API response
// Run with: node test-update.js

async function testLocationUpdate() {
  const API_URL = 'https://api.dottapps.com';
  
  try {
    // First, get a session (you'll need to update these credentials)
    console.log('🔍 Testing Location Update API...');
    console.log('================================');
    
    // Test data
    const locationId = 1;
    const updateData = {
      name: "Test Location Update",
      description: "Testing API response",
      is_active: true
    };
    
    // Make the request directly to the backend
    console.log(`\n📤 Sending PUT request to ${API_URL}/api/inventory/locations/${locationId}/`);
    console.log('Request body:', JSON.stringify(updateData, null, 2));
    
    const response = await fetch(`${API_URL}/api/inventory/locations/${locationId}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        // You'll need a valid session token here
        'Authorization': 'Session YOUR_SESSION_ID_HERE'
      },
      body: JSON.stringify(updateData)
    });
    
    console.log(`\n📊 Response Status: ${response.status} ${response.statusText}`);
    console.log('Response Headers:');
    response.headers.forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });
    
    // Get the raw response text
    const responseText = await response.text();
    console.log(`\n📋 Response Body (first 500 chars):`);
    console.log(responseText.substring(0, 500));
    
    // Try to parse as JSON
    try {
      const jsonData = JSON.parse(responseText);
      console.log('\n✅ Response is valid JSON:');
      console.log(JSON.stringify(jsonData, null, 2));
    } catch (error) {
      console.log('\n❌ Response is NOT valid JSON');
      console.log('Parse error:', error.message);
      
      // Check if it's HTML
      if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
        console.log('\n⚠️  Response appears to be HTML (possibly an error page)');
        
        // Extract title if present
        const titleMatch = responseText.match(/<title>(.*?)<\/title>/i);
        if (titleMatch) {
          console.log('Page title:', titleMatch[1]);
        }
      }
    }
    
  } catch (error) {
    console.error('\n❌ Request failed:', error);
  }
}

// Run the test
testLocationUpdate();