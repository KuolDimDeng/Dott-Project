#!/usr/bin/env node

/**
 * Version0041_configure_cognito_oauth_environment.mjs
 * 
 * Purpose: Configure Cognito OAuth environment variables for Google Sign-In functionality
 * 
 * This script adds the necessary environment variables for Cognito OAuth configuration
 * to support Google Sign-In with the existing Cognito setup.
 * 
 * @version 1.0
 * @author AI Assistant
 * @date 2025-02-04
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SCRIPT_VERSION = 'Version0041';
const SCRIPT_NAME = 'configure_cognito_oauth_environment';

// Get the project root (assuming script is in frontend/pyfactor_next/scripts)
const projectRoot = path.resolve(__dirname, '..');

/**
 * Create backup of a file with timestamp
 */
function createBackup(filePath) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${filePath}.backup_${timestamp}`;
    
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, backupPath);
      console.log(`✅ Created backup: ${backupPath}`);
      return backupPath;
    }
  } catch (error) {
    console.error(`❌ Error creating backup for ${filePath}:`, error.message);
  }
  return null;
}

/**
 * Update production environment file with OAuth configuration
 */
function updateProductionEnv() {
  const filePath = path.join(projectRoot, 'production.env');
  
  try {
    // Create backup first
    createBackup(filePath);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if OAuth configuration already exists
    if (content.includes('NEXT_PUBLIC_COGNITO_DOMAIN')) {
      console.log('ℹ️ OAuth configuration already exists in production.env');
      return;
    }
    
    // Add OAuth configuration after the existing Cognito configuration
    const cognitoSection = `# AWS Cognito Configuration
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_JPL8vGfb6
NEXT_PUBLIC_COGNITO_CLIENT_ID=1o5v84mrgn4gt87khtr179uc5b
NEXT_PUBLIC_COGNITO_DOMAIN=issunc

# OAuth Configuration for Google Sign-In
NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_IN=https://projectx-4bl3cb0l0-kuol-dengs-projects.vercel.app/auth/callback
NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_OUT=https://projectx-4bl3cb0l0-kuol-dengs-projects.vercel.app/auth/signin
NEXT_PUBLIC_OAUTH_SCOPES=email,profile,openid`;

    // Replace the existing AWS Configuration section
    content = content.replace(
      /# AWS Configuration[\s\S]*?NEXT_PUBLIC_COGNITO_CLIENT_ID=.*$/m,
      cognitoSection
    );
    
    // Write the updated content
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Updated production.env with OAuth configuration');
    
  } catch (error) {
    console.error('❌ Error updating production.env:', error.message);
    throw error;
  }
}

/**
 * Create .env.local file for local development
 */
function createLocalEnv() {
  const filePath = path.join(projectRoot, '.env.local');
  
  try {
    // Check if .env.local already exists
    if (fs.existsSync(filePath)) {
      console.log('ℹ️ .env.local already exists, updating with OAuth configuration');
      
      // Create backup first
      createBackup(filePath);
      
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Check if OAuth configuration already exists
      if (content.includes('NEXT_PUBLIC_COGNITO_DOMAIN')) {
        console.log('ℹ️ OAuth configuration already exists in .env.local');
        return;
      }
      
      // Add OAuth configuration
      const oauthConfig = `
# OAuth Configuration for Google Sign-In (Local Development)
NEXT_PUBLIC_COGNITO_DOMAIN=issunc
NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_IN=http://localhost:3000/auth/callback
NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_OUT=http://localhost:3000/auth/signin
NEXT_PUBLIC_OAUTH_SCOPES=email,profile,openid
`;
      
      content += oauthConfig;
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('✅ Updated .env.local with OAuth configuration');
      
    } else {
      // Create new .env.local file
      const envContent = `# PyFactor Local Development Environment
# Created: ${new Date().toISOString().split('T')[0]}

# API Configuration
NEXT_PUBLIC_API_URL=https://dott-env-fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com
BACKEND_API_URL=https://dott-env-fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com

# AWS Cognito Configuration
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_JPL8vGfb6
NEXT_PUBLIC_COGNITO_CLIENT_ID=1o5v84mrgn4gt87khtr179uc5b
NEXT_PUBLIC_COGNITO_DOMAIN=issunc

# OAuth Configuration for Google Sign-In (Local Development)
NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_IN=http://localhost:3000/auth/callback
NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_OUT=http://localhost:3000/auth/signin
NEXT_PUBLIC_OAUTH_SCOPES=email,profile,openid

# Development Configuration
NODE_ENV=development
USE_DATABASE=true
MOCK_DATA_DISABLED=true
ENABLE_COGNITO_INTEGRATION=true
ENABLE_AWS_RDS=true
ENABLE_LIVE_DATA=true

# Debug Configuration
NEXT_PUBLIC_DEBUG_MODE=true
NEXT_PUBLIC_LOG_LEVEL=debug
`;

      fs.writeFileSync(filePath, envContent, 'utf8');
      console.log('✅ Created .env.local with OAuth configuration');
    }
    
  } catch (error) {
    console.error('❌ Error creating/updating .env.local:', error.message);
    throw error;
  }
}

/**
 * Update amplify.env.example with OAuth configuration
 */
function updateAmplifyEnvExample() {
  const filePath = path.join(projectRoot, 'amplify.env.example');
  
  try {
    // Create backup first
    createBackup(filePath);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if OAuth configuration already exists
    if (content.includes('NEXT_PUBLIC_COGNITO_DOMAIN')) {
      console.log('ℹ️ OAuth configuration already exists in amplify.env.example');
      return;
    }
    
    // Add OAuth configuration section
    const oauthSection = `
# AWS Cognito Configuration
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_JPL8vGfb6
NEXT_PUBLIC_COGNITO_CLIENT_ID=1o5v84mrgn4gt87khtr179uc5b
NEXT_PUBLIC_COGNITO_DOMAIN=issunc

# OAuth Configuration for Google Sign-In
NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_IN=https://your-domain.vercel.app/auth/callback
NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_OUT=https://your-domain.vercel.app/auth/signin
NEXT_PUBLIC_OAUTH_SCOPES=email,profile,openid
`;

    // Add the OAuth section before the build settings
    content = content.replace(
      '# Build Settings',
      oauthSection + '\n# Build Settings'
    );
    
    // Write the updated content
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Updated amplify.env.example with OAuth configuration');
    
  } catch (error) {
    console.error('❌ Error updating amplify.env.example:', error.message);
    throw error;
  }
}

/**
 * Create OAuth configuration documentation
 */
function createOAuthDocumentation() {
  const docPath = path.join(projectRoot, 'OAUTH_CONFIGURATION.md');
  
  const documentation = `# OAuth Configuration for Google Sign-In

## Overview
This document describes the OAuth configuration required for Google Sign-In functionality using AWS Cognito.

## Environment Variables

### Required Variables

#### AWS Cognito Configuration
- \`NEXT_PUBLIC_AWS_REGION\`: AWS region (us-east-1)
- \`NEXT_PUBLIC_COGNITO_USER_POOL_ID\`: Cognito User Pool ID (us-east-1_JPL8vGfb6)
- \`NEXT_PUBLIC_COGNITO_CLIENT_ID\`: Cognito App Client ID (1o5v84mrgn4gt87khtr179uc5b)
- \`NEXT_PUBLIC_COGNITO_DOMAIN\`: Cognito Domain (issunc)

#### OAuth Configuration
- \`NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_IN\`: Redirect URL after successful sign-in
- \`NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_OUT\`: Redirect URL after sign-out
- \`NEXT_PUBLIC_OAUTH_SCOPES\`: OAuth scopes (email,profile,openid)

### Environment-Specific Values

#### Local Development (.env.local)
\`\`\`
NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_IN=http://localhost:3000/auth/callback
NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_OUT=http://localhost:3000/auth/signin
\`\`\`

#### Production (Vercel Environment Variables)
\`\`\`
NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_IN=https://projectx-4bl3cb0l0-kuol-dengs-projects.vercel.app/auth/callback
NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_OUT=https://projectx-4bl3cb0l0-kuol-dengs-projects.vercel.app/auth/signin
\`\`\`

## Cognito Configuration

### Google Identity Provider Settings
- **Provider Type**: Google
- **Client ID**: 732436158712-76jfo78t3g4tsa80ka462u2uoielvpof.apps.googleusercontent.com
- **Client Secret**: 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
- **Authorized Scopes**: profile, email, openid

### Hosted UI Domain
- **Domain**: issunc.auth.us-east-1.amazoncognito.com
- **Callback URLs**: 
  - https://projectx-4bl3cb0l0-kuol-dengs-projects.vercel.app/auth/callback
  - http://localhost:3000/auth/callback (for development)
- **Sign-out URLs**:
  - https://projectx-4bl3cb0l0-kuol-dengs-projects.vercel.app/auth/signin
  - http://localhost:3000/auth/signin (for development)

## Setup Instructions

### 1. Environment Variables
1. Copy the appropriate environment variables to your environment files
2. For local development, use \`.env.local\`
3. For production, set variables in Vercel dashboard

### 2. Cognito Configuration
1. Ensure the Google identity provider is configured in Cognito
2. Verify the hosted UI domain is set up
3. Add the callback URLs to the allowed redirect URLs
4. Add the sign-out URLs to the allowed sign-out URLs

### 3. Google OAuth App Configuration
1. Ensure the Google OAuth app has the correct redirect URIs configured
2. Verify the client ID and secret match the Cognito configuration

## Testing

### Local Development
1. Start the development server: \`pnpm dev\`
2. Navigate to \`http://localhost:3000/auth/signin\`
3. Click "Sign in with Google"
4. Complete the OAuth flow
5. Verify redirect to \`/auth/callback\`

### Production
1. Deploy to Vercel
2. Navigate to the production sign-in page
3. Test the Google Sign-In flow
4. Verify proper redirects and user attribute mapping

## Troubleshooting

### Common Issues

1. **Redirect URI Mismatch**
   - Verify callback URLs in Cognito match environment variables
   - Check Google OAuth app redirect URIs

2. **Domain Configuration**
   - Ensure Cognito hosted UI domain is properly configured
   - Verify domain name matches environment variable

3. **Environment Variables**
   - Check all required variables are set
   - Verify values match Cognito configuration

### Debug Steps

1. Check browser network tab for OAuth requests
2. Verify environment variables are loaded correctly
3. Check Cognito logs for authentication events
4. Review application logs for OAuth errors

## Security Considerations

- Never commit environment files with real credentials
- Use different OAuth redirect URLs for different environments
- Regularly rotate OAuth client secrets
- Monitor OAuth usage in Cognito console

## Version History

- **v1.0** (2025-02-04): Initial OAuth configuration setup
`;

  try {
    fs.writeFileSync(docPath, documentation, 'utf8');
    console.log('✅ Created OAuth configuration documentation');
  } catch (error) {
    console.error('❌ Error creating OAuth documentation:', error.message);
    throw error;
  }
}

/**
 * Update script registry
 */
function updateScriptRegistry() {
  const registryPath = path.join(__dirname, 'script_registry.md');
  
  try {
    let content = fs.readFileSync(registryPath, 'utf8');
    
    const newEntry = `
### ${SCRIPT_VERSION}_${SCRIPT_NAME}.mjs
- **Version**: ${SCRIPT_VERSION} v1.0
- **Purpose**: Configure Cognito OAuth environment variables for Google Sign-In functionality
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: ${new Date().toISOString().split('T')[0]}
- **Execution Date**: ${new Date().toISOString()}
- **Target Files**: 
  - /production.env (updated with OAuth configuration)
  - /.env.local (created/updated with local OAuth settings)
  - /amplify.env.example (updated with OAuth example)
  - /OAUTH_CONFIGURATION.md (created documentation)
- **Description**: Configures environment variables needed for Cognito OAuth with Google Sign-In
- **Key Features**:
  - Added Cognito domain configuration
  - Configured OAuth redirect URLs for production and development
  - Set up OAuth scopes for Google Sign-In
  - Created comprehensive documentation
  - Environment-specific configuration for local and production
- **OAuth Configuration**:
  - Domain: issunc.auth.us-east-1.amazoncognito.com
  - Scopes: email, profile, openid
  - Production redirect: https://projectx-4bl3cb0l0-kuol-dengs-projects.vercel.app/auth/callback
  - Local redirect: http://localhost:3000/auth/callback
- **Requirements Addressed**: Conditions 22, 23, 25, 30
`;

    // Add the new entry before the last line
    const lines = content.split('\n');
    lines.splice(-1, 0, newEntry);
    content = lines.join('\n');
    
    fs.writeFileSync(registryPath, content, 'utf8');
    console.log('✅ Updated script registry');
    
  } catch (error) {
    console.error('❌ Error updating script registry:', error.message);
    throw error;
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log(`🚀 Starting ${SCRIPT_VERSION}_${SCRIPT_NAME}.mjs`);
  console.log('📋 Purpose: Configure Cognito OAuth environment variables for Google Sign-In');
  console.log('');
  
  try {
    // Step 1: Update production environment
    console.log('📝 Step 1: Updating production environment...');
    updateProductionEnv();
    
    // Step 2: Create/update local environment
    console.log('📝 Step 2: Creating/updating local environment...');
    createLocalEnv();
    
    // Step 3: Update Amplify environment example
    console.log('📝 Step 3: Updating Amplify environment example...');
    updateAmplifyEnvExample();
    
    // Step 4: Create OAuth documentation
    console.log('📝 Step 4: Creating OAuth documentation...');
    createOAuthDocumentation();
    
    // Step 5: Update script registry
    console.log('📝 Step 5: Updating script registry...');
    updateScriptRegistry();
    
    console.log('');
    console.log('✅ OAuth environment configuration completed successfully!');
    console.log('');
    console.log('📋 Summary of changes:');
    console.log('  ✅ Updated production.env with OAuth configuration');
    console.log('  ✅ Created/updated .env.local for local development');
    console.log('  ✅ Updated amplify.env.example with OAuth example');
    console.log('  ✅ Created comprehensive OAuth documentation');
    console.log('  ✅ Updated script registry');
    console.log('');
    console.log('🔧 Next steps:');
    console.log('  1. Set environment variables in Vercel dashboard');
    console.log('  2. Verify Cognito hosted UI domain configuration');
    console.log('  3. Test Google Sign-In in both local and production');
    console.log('  4. Verify OAuth callback URLs in Google OAuth app');
    console.log('');
    console.log('📚 Documentation: /OAUTH_CONFIGURATION.md');
    
  } catch (error) {
    console.error('❌ Script execution failed:', error.message);
    process.exit(1);
  }
}

// Execute the script
main(); 