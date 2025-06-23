#!/usr/bin/env node
/**
 * Test script to debug customer listing issue
 * Run this to test the customer API endpoint
 */

const fetch = require('node-fetch');

async function testCustomerListing() {
  console.log('=== Testing Customer API ===\n');
  
  const API_URL = 'https://api.dottapps.com';
  const FRONTEND_URL = 'https://dottapps.com';
  
  // You'll need to provide a valid session ID
  const SESSION_ID = process.env.SESSION_ID || 'YOUR_SESSION_ID_HERE';
  
  if (SESSION_ID === 'YOUR_SESSION_ID_HERE') {
    console.error('Please set SESSION_ID environment variable');
    console.log('Example: SESSION_ID=your-session-id node test_customer_listing.js');
    return;
  }
  
  console.log('Testing backend API directly...');
  
  try {
    // Test backend directly
    const backendResponse = await fetch(`${API_URL}/api/crm/customers/`, {
      method: 'GET',
      headers: {
        'Authorization': `Session ${SESSION_ID}`,
        'Content-Type': 'application/json',
      }
    });
    
    console.log(`Backend response status: ${backendResponse.status}`);
    const backendData = await backendResponse.json();
    console.log('Backend response:', JSON.stringify(backendData, null, 2));
    
    // Test frontend proxy
    console.log('\nTesting frontend proxy...');
    const frontendResponse = await fetch(`${FRONTEND_URL}/api/crm/customers`, {
      method: 'GET',
      headers: {
        'Cookie': `sid=${SESSION_ID}`,
        'Content-Type': 'application/json',
      }
    });
    
    console.log(`Frontend response status: ${frontendResponse.status}`);
    const frontendData = await frontendResponse.json();
    console.log('Frontend response:', JSON.stringify(frontendData, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testCustomerListing();