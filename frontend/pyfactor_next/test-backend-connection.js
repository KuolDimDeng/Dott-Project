#!/usr/bin/env node

const https = require('https');
const http = require('http');

const BACKEND_URL = 'http://Dott-env-fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com';

console.log('🔍 Testing backend connectivity...');
console.log(`Backend URL: ${BACKEND_URL}`);

// Test health endpoint
const testUrl = `${BACKEND_URL}/health/`;
console.log(`Testing: ${testUrl}`);

const client = testUrl.startsWith('https:') ? https : http;

const req = client.get(testUrl, (res) => {
  console.log(`✅ Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`Response: ${data}`);
    if (res.statusCode === 200) {
      console.log('🎉 Backend is working correctly!');
    } else {
      console.log('⚠️ Backend returned non-200 status');
    }
  });
});

req.on('error', (err) => {
  console.error(`❌ Connection failed: ${err.message}`);
});

req.setTimeout(10000, () => {
  console.error('❌ Request timed out');
  req.destroy();
}); 