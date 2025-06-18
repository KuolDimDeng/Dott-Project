/**
 * Test script to debug session establishment
 * Run with: node scripts/test_session_establishment.js
 */

import fetch from 'node-fetch';
import FormData from 'form-data';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function testSessionEstablishment() {
  console.log('Testing session establishment flow...\n');
  
  // Test 1: Simulate form POST to establish-session
  console.log('1. Testing POST to /api/auth/establish-session');
  
  const form = new FormData();
  form.append('token', 'test-token-12345');
  form.append('redirectUrl', '/dashboard');
  form.append('timestamp', Date.now().toString());
  
  try {
    const response = await fetch(`${API_URL}/api/auth/establish-session`, {
      method: 'POST',
      body: form,
      redirect: 'manual' // Don't follow redirects
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.raw());
    
    if (response.status === 303 || response.status === 302) {
      console.log('Redirect location:', response.headers.get('location'));
    }
    
    // Check cookies set
    const cookies = response.headers.raw()['set-cookie'];
    if (cookies) {
      console.log('\nCookies set:');
      cookies.forEach(cookie => {
        const parts = cookie.split(';');
        const [name, value] = parts[0].split('=');
        console.log(`- ${name}: ${value ? value.substring(0, 20) + '...' : 'empty'}`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  console.log('\n2. Testing session retrieval');
  
  // Test 2: Try to get session
  try {
    const sessionResponse = await fetch(`${API_URL}/api/auth/session`, {
      headers: {
        'Cookie': 'session_token=test-token-12345'
      }
    });
    
    console.log('Session response status:', sessionResponse.status);
    
    if (sessionResponse.ok) {
      const data = await sessionResponse.json();
      console.log('Session data:', JSON.stringify(data, null, 2));
    } else {
      const text = await sessionResponse.text();
      console.log('Session error:', text);
    }
  } catch (error) {
    console.error('Session error:', error.message);
  }
}

testSessionEstablishment().catch(console.error);