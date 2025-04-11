// Direct test of AWS Cognito functionality
const { 
  CognitoIdentityProviderClient, 
  AdminConfirmSignUpCommand,
  ListUsersCommand
} = require('@aws-sdk/client-cognito-identity-provider');
require('dotenv').config({ path: '.env.local' });

// Get AWS credentials from environment variables
const region = process.env.NEXT_PUBLIC_COGNITO_REGION || 'us-east-1';
const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

// Log configuration values (redacted for security)
console.log('AWS Configuration:');
console.log('Region:', region);
console.log('User Pool ID:', userPoolId);
console.log('Access Key ID present:', !!accessKeyId);
console.log('Access Key ID first 4 chars:', accessKeyId ? accessKeyId.substring(0, 4) : 'NONE');
console.log('Secret Access Key present:', !!secretAccessKey);
console.log('Secret Access Key length:', secretAccessKey ? secretAccessKey.length : 0);

// Show warning if credentials are missing or look invalid
if (!accessKeyId || !secretAccessKey) {
  console.warn('\n⚠️ WARNING: AWS credentials missing in .env.local file!');
  console.warn('Make sure your .env.local file contains:');
  console.warn('AWS_ACCESS_KEY_ID=your_access_key_id');
  console.warn('AWS_SECRET_ACCESS_KEY=your_secret_access_key');
} else if (accessKeyId === 'your_access_key_id' || secretAccessKey === 'your_secret_access_key') {
  console.warn('\n⚠️ WARNING: AWS credentials appear to be placeholder values!');
  console.warn('Replace the placeholders with actual AWS credentials in your .env.local file.');
}

// Test email for confirmation
const testEmail = 'test@example.com';

// Create Cognito client
const client = new CognitoIdentityProviderClient({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey
  }
});

// Test 1: List Users (validate connectivity and permissions)
async function testListUsers() {
  try {
    console.log('\n--- Testing List Users ---');
    const command = new ListUsersCommand({
      UserPoolId: userPoolId,
      Limit: 10
    });
    
    console.log('Sending ListUsersCommand...');
    const result = await client.send(command);
    
    console.log('Success! Found', result.Users?.length || 0, 'users');
    console.log('First few users:', (result.Users || []).slice(0, 3).map(u => ({
      username: u.Username,
      status: u.UserStatus,
      created: u.UserCreateDate
    })));
    
    return true;
  } catch (error) {
    console.error('Error listing users:', error.message);
    console.error('Error code:', error.Code || error.code);
    console.error('Error name:', error.name);
    
    // Additional diagnostic info for credential issues
    if (error.name === 'UnrecognizedClientException' || 
        error.name === 'InvalidSignatureException' ||
        error.message.includes('security token') ||
        error.message.includes('credentials')) {
      console.error('\n🔑 CREDENTIALS ERROR DETECTED:');
      console.error('Your AWS credentials are invalid or expired. Please update them in your .env.local file.');
      console.error('Steps to fix:');
      console.error('1. Check your AWS IAM console and ensure your access keys are active');
      console.error('2. If needed, generate new access keys in the AWS IAM console');
      console.error('3. Update your .env.local file with the new credentials');
      console.error('4. Make sure your IAM user has permissions for Cognito operations');
    }
    
    return false;
  }
}

// Test 2: Confirm User
async function testConfirmUser(email) {
  try {
    console.log(`\n--- Testing Confirm User for ${email} ---`);
    const command = new AdminConfirmSignUpCommand({
      UserPoolId: userPoolId,
      Username: email
    });
    
    console.log('Sending AdminConfirmSignUpCommand...');
    const result = await client.send(command);
    
    console.log('Success! User confirmed:', email);
    console.log('Response metadata:', result.$metadata);
    return true;
  } catch (error) {
    console.error('Error confirming user:', error.message);
    console.error('Error code:', error.Code || error.code);
    console.error('Error name:', error.name);
    
    // Check specific error types
    if (error.name === 'UserNotFoundException') {
      console.log('User not found. This is expected if the test user doesn\'t exist.');
    } else if (error.name === 'NotAuthorizedException') {
      console.error('Not authorized. Check your AWS credentials and permissions.');
    }
    
    return false;
  }
}

// Run the tests
async function runTests() {
  try {
    // First test permission by listing users
    const listResult = await testListUsers();
    
    // If list users worked, try confirming a user
    if (listResult) {
      await testConfirmUser(testEmail);
    }
  } catch (error) {
    console.error('Unexpected error during tests:', error);
  }
}

// Execute tests
runTests(); 