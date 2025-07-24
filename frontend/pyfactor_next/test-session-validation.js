#!/usr/bin/env node

// Test script to debug session validation
const sessionToken = process.argv[2];

if (!sessionToken) {
  console.error('Usage: node test-session-validation.js <session-token>');
  process.exit(1);
}

const API_URL = 'https://api.dottapps.com';

async function testSessionValidation() {
  console.log('Testing session validation for:', sessionToken);
  console.log('---');
  
  try {
    // Test 1: Validate endpoint
    console.log('1. Testing /api/sessions/validate/{id}/ endpoint...');
    const validateResponse = await fetch(`${API_URL}/api/sessions/validate/${sessionToken}/`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('   Status:', validateResponse.status);
    console.log('   Headers:', Object.fromEntries(validateResponse.headers));
    
    if (validateResponse.ok) {
      const data = await validateResponse.json();
      console.log('   Response:', JSON.stringify(data, null, 2));
    } else {
      const error = await validateResponse.text();
      console.log('   Error:', error);
    }
    
    console.log('---');
    
    // Test 2: Current endpoint with session header
    console.log('2. Testing /api/sessions/current/ endpoint with Authorization header...');
    const currentResponse = await fetch(`${API_URL}/api/sessions/current/`, {
      headers: {
        'Authorization': `Session ${sessionToken}`,
        'Accept': 'application/json'
      }
    });
    
    console.log('   Status:', currentResponse.status);
    console.log('   Headers:', Object.fromEntries(currentResponse.headers));
    
    if (currentResponse.ok) {
      const data = await currentResponse.json();
      console.log('   Response:', JSON.stringify(data, null, 2));
    } else {
      const error = await currentResponse.text();
      console.log('   Error:', error);
    }
    
    console.log('---');
    
    // Test 3: Direct session detail endpoint
    console.log('3. Testing /api/sessions/{id}/ endpoint...');
    const detailResponse = await fetch(`${API_URL}/api/sessions/${sessionToken}/`, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    console.log('   Status:', detailResponse.status);
    console.log('   Headers:', Object.fromEntries(detailResponse.headers));
    
    if (detailResponse.ok) {
      const data = await detailResponse.json();
      console.log('   Response:', JSON.stringify(data, null, 2));
    } else {
      const error = await detailResponse.text();
      console.log('   Error:', error);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testSessionValidation();