#!/usr/bin/env node
/**
 * AWS Credentials Setup Helper
 * 
 * This script validates AWS credentials and guides the user through 
 * setting them up correctly in the .env.local file.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { 
  CognitoIdentityProviderClient, 
  ListUsersCommand 
} = require('@aws-sdk/client-cognito-identity-provider');
require('dotenv').config({ path: '.env.local' });

// Setup readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Environment file path
const envFilePath = path.join(process.cwd(), '.env.local');

// Main function
async function main() {
  console.log('🔑 AWS Credentials Setup Helper');
  console.log('==============================\n');
  
  // Check if .env.local exists
  if (!fs.existsSync(envFilePath)) {
    console.log('❌ .env.local file not found!');
    await createEnvFile();
  } else {
    console.log('✅ Found .env.local file');
    
    // Check if AWS credentials are present
    const envVars = getEnvVars();
    
    if (!envVars.AWS_ACCESS_KEY_ID || !envVars.AWS_SECRET_ACCESS_KEY) {
      console.log('❌ AWS credentials missing in .env.local');
      await updateCredentials(envVars);
    } else {
      console.log('AWS_ACCESS_KEY_ID present:', !!envVars.AWS_ACCESS_KEY_ID);
      console.log('AWS_SECRET_ACCESS_KEY present:', !!envVars.AWS_SECRET_ACCESS_KEY);
      
      // Test if credentials are valid
      const validCredentials = await testCredentials(
        envVars.AWS_ACCESS_KEY_ID,
        envVars.AWS_SECRET_ACCESS_KEY,
        envVars.NEXT_PUBLIC_COGNITO_REGION || 'us-east-1',
        envVars.NEXT_PUBLIC_COGNITO_USER_POOL_ID
      );
      
      if (!validCredentials) {
        console.log('❌ AWS credentials are invalid or lack permissions');
        await updateCredentials(envVars);
      } else {
        console.log('✅ AWS credentials are valid!');
        process.exit(0);
      }
    }
  }
}

// Create a new .env.local file
async function createEnvFile() {
  console.log('\nCreating a new .env.local file...');
  
  const template = `# AWS Cognito Configuration
NEXT_PUBLIC_COGNITO_REGION=us-east-1
NEXT_PUBLIC_COGNITO_USER_POOL_ID=
NEXT_PUBLIC_COGNITO_CLIENT_ID=

# AWS Credentials for Cognito Admin API
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
`;

  fs.writeFileSync(envFilePath, template);
  console.log('✅ Created .env.local template file');
  
  await updateCredentials({});
}

// Update AWS credentials in .env.local
async function updateCredentials(existingVars) {
  console.log('\n📝 Please enter your AWS credentials:');
  
  const accessKeyId = await askQuestion('AWS Access Key ID: ');
  const secretAccessKey = await askQuestion('AWS Secret Access Key: ');
  const region = await askQuestion('AWS Region (default: us-east-1): ') || 'us-east-1';
  const userPoolId = await askQuestion('Cognito User Pool ID: ');
  
  // Update env vars with new credentials
  const updatedVars = {
    ...existingVars,
    AWS_ACCESS_KEY_ID: accessKeyId,
    AWS_SECRET_ACCESS_KEY: secretAccessKey,
    NEXT_PUBLIC_COGNITO_REGION: region,
    NEXT_PUBLIC_COGNITO_USER_POOL_ID: userPoolId
  };
  
  // Write updated env vars to file
  writeEnvFile(updatedVars);
  
  console.log('\n✅ Credentials saved to .env.local');
  
  // Test new credentials
  const valid = await testCredentials(accessKeyId, secretAccessKey, region, userPoolId);
  
  if (valid) {
    console.log('✅ AWS credentials validated successfully!');
  } else {
    console.log('⚠️ Could not validate AWS credentials. Please check your IAM permissions.');
    console.log('The credentials were saved anyway, but may need additional configuration.');
  }
  
  process.exit(0);
}

// Test AWS credentials
async function testCredentials(accessKeyId, secretAccessKey, region, userPoolId) {
  if (!accessKeyId || !secretAccessKey || !userPoolId) {
    return false;
  }
  
  console.log('\nTesting AWS credentials...');
  
  const client = new CognitoIdentityProviderClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });
  
  try {
    console.log('Connecting to AWS Cognito...');
    const command = new ListUsersCommand({
      UserPoolId: userPoolId,
      Limit: 1
    });
    
    const result = await client.send(command);
    console.log(`Found ${result.Users?.length || 0} users (limited to 1 for testing)`);
    return true;
  } catch (error) {
    console.error('Error connecting to AWS Cognito:', error.message);
    
    if (error.name === 'UnrecognizedClientException' || error.name === 'InvalidSignatureException') {
      console.error('Invalid credentials. Make sure your AWS access keys are correct.');
    } else if (error.name === 'NotAuthorizedException') {
      console.error('Not authorized. Your IAM user needs Cognito permissions.');
    } else if (error.name === 'ResourceNotFoundException') {
      console.error('User pool not found. Check your Cognito User Pool ID.');
    }
    
    return false;
  }
}

// Helper to get env vars from .env.local
function getEnvVars() {
  try {
    const envContent = fs.readFileSync(envFilePath, 'utf8');
    const vars = {};
    
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^#][A-Za-z0-9_]+)=(.*)$/);
      if (match) {
        vars[match[1]] = match[2].trim();
      }
    });
    
    return vars;
  } catch (err) {
    return {};
  }
}

// Helper to write env vars to .env.local
function writeEnvFile(vars) {
  const lines = [];
  
  for (const [key, value] of Object.entries(vars)) {
    lines.push(`${key}=${value}`);
  }
  
  fs.writeFileSync(envFilePath, lines.join('\n') + '\n');
}

// Helper to prompt for input
function askQuestion(question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer.trim());
    });
  });
}

// Start the script
main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
}); 