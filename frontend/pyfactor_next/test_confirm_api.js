// Simple test script for the confirm-user API
const axios = require('axios');

// You can change this to any test email you want to confirm
const testEmail = 'test@example.com';

// Load AWS credentials from environment
require('dotenv').config({ path: '.env.local' });

// Log environment variables (redacted for security)
console.log('Environment variables present:');
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '[PRESENT]' : '[MISSING]');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '[PRESENT]' : '[MISSING]');
console.log('COGNITO_USER_POOL_ID:', process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '[MISSING]');
console.log('COGNITO_CLIENT_ID:', process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '[MISSING]');
console.log('COGNITO_REGION:', process.env.NEXT_PUBLIC_COGNITO_REGION || '[MISSING]');

// Make the API call
const testConfirmUser = async () => {
  try {
    console.log(`Testing confirm-user API with email: ${testEmail}`);
    
    const response = await axios.post('http://localhost:3000/api/admin/confirm-user', {
      email: testEmail
    }, {
      // Set a longer timeout
      timeout: 10000
    });
    
    console.log('API Response:', response.data);
    console.log('Status:', response.status);
    
    return response.data;
  } catch (error) {
    console.error('API Error:');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('Connection refused. Make sure the development server is running on port 3000.');
      console.error('Run the server with: pnpm dev');
    } else if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
      
      if (error.response.data) {
        console.error('Data:', typeof error.response.data === 'string' 
          ? error.response.data 
          : JSON.stringify(error.response.data, null, 2));
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received. Request details:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error message:', error.message);
    }
    
    console.error('Error config:', error.config);
  }
};

// Run the test
testConfirmUser(); 