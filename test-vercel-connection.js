#!/usr/bin/env node

const https = require('https');

// Your healthy EB backend URL
const BACKEND_URL = 'http://DottApp-clean.eba-dua2f3pi.us-east-1.elasticbeanstalk.com';

console.log('🔍 Testing backend connection for Vercel deployment...');
console.log(`Backend URL: ${BACKEND_URL}`);

// Test health endpoint
const testUrl = `${BACKEND_URL}/health/`;
console.log(`Testing: ${testUrl}`);

const http = require('http');
const req = http.get(testUrl, (res) => {
  console.log(`✅ Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`Response: ${data}`);
    if (res.statusCode === 200) {
      console.log('🎉 Backend is working! Ready for Vercel deployment.');
      console.log('\n📋 Next steps:');
      console.log('1. Run: cd frontend/pyfactor_next');
      console.log('2. Run: npx vercel --prod');
      console.log('3. Set environment variables in Vercel dashboard');
    } else {
      console.log('⚠️ Backend returned non-200 status');
    }
  });
});

req.on('error', (err) => {
  console.error(`❌ Connection failed: ${err.message}`);
});

req.setTimeout(5000, () => {
  console.error('❌ Request timed out');
  req.destroy();
}); 