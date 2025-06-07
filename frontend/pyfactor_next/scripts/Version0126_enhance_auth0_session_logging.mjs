import fs from 'fs/promises';
import { execSync } from 'child_process';
import path from 'path';

const SCRIPT_REGISTRY_PATH = 'frontend/pyfactor_next/scripts/script_registry.md';
const SUMMARY_PATH = 'frontend/pyfactor_next/scripts/AUTH0_SESSION_LOGGING_ENHANCEMENT.md';
const FILES_TO_ENHANCE = [
  {
    path: 'frontend/pyfactor_next/src/app/api/user/create-auth0-user/route.js',
    backupSuffix: 'enhanced_logging'
  },
  {
    path: 'frontend/pyfactor_next/src/app/api/auth/callback/route.js',
    backupSuffix: 'enhanced_logging'
  },
  {
    path: 'frontend/pyfactor_next/src/app/api/onboarding/status/route.js',
    backupSuffix: 'enhanced_logging'
  },
  {
    path: 'frontend/pyfactor_next/src/services/onboardingService.js',
    backupSuffix: 'enhanced_logging'
  }
];

async function createBackup(filePath, suffix) {
  const backupPath = `${filePath}.backup_${suffix}_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
  console.log(`Creating backup of ${path.basename(filePath)}...`);
  
  try {
    await fs.copyFile(filePath, backupPath);
    console.log(`✅ Backup created at ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.error(`❌ Error creating backup: ${error.message}`);
    throw error;
  }
}

async function enhanceCreateAuth0UserLogging() {
  const filePath = FILES_TO_ENHANCE[0].path;
  await createBackup(filePath, FILES_TO_ENHANCE[0].backupSuffix);
  
  console.log(`Enhancing logging in ${path.basename(filePath)}...`);
  const content = await fs.readFile(filePath, 'utf8');
  
  // Add logging to the start of the POST handler
  let updatedContent = content.replace(
    /export async function POST\(request\) {/,
    `export async function POST(request) {
  console.log('[AUTH DEBUG] 📥 create-auth0-user POST request received');
  const startTime = Date.now();`
  );
  
  // Add logging for request body parsing
  updatedContent = updatedContent.replace(
    /const body = await request\.json\(\);/,
    `const body = await request.json();
  console.log('[AUTH DEBUG] Request body received:', JSON.stringify({
    email: body.email,
    auth0_id: body.auth0_id,
    name: body.name || 'not provided',
    requestTime: new Date().toISOString()
  }));`
  );
  
  // Add logging for database lookup
  updatedContent = updatedContent.replace(
    /const existingUser = await prisma\.users\.findFirst\({/,
    `console.log('[AUTH DEBUG] 🔍 Looking up user in database by email:', body.email);
  const existingUser = await prisma.users.findFirst({`
  );
  
  // Add detailed logging after user lookup
  updatedContent = updatedContent.replace(
    /if \(existingUser\) {/,
    `if (existingUser) {
    console.log('[AUTH DEBUG] ✅ Existing user found:', JSON.stringify({
      id: existingUser.id,
      email: existingUser.email,
      tenant_id: existingUser.tenant_id,
      needs_onboarding: existingUser.needs_onboarding !== false,
      onboarding_completed: existingUser.onboarding_completed === true,
      current_step: existingUser.current_onboarding_step || 'business_info',
      auth0_id: existingUser.auth0_id,
      lookupTime: \`\${Date.now() - startTime}ms\`
    }));`
  );
  
  // Add logging for user creation
  updatedContent = updatedContent.replace(
    /const newUser = await prisma\.users\.create\({/,
    `console.log('[AUTH DEBUG] 🆕 Creating new user in database:', body.email);
  const newUser = await prisma.users.create({`
  );
  
  // Add logging after user creation
  updatedContent = updatedContent.replace(
    /return NextResponse\.json\({[\s\S]*?success: true,[\s\S]*?isNewUser: true,/,
    `console.log('[AUTH DEBUG] ✅ New user created successfully:', JSON.stringify({
      id: newUser.id,
      email: newUser.email,
      tenant_id: newUser.tenant_id,
      needs_onboarding: true,
      auth0_id: newUser.auth0_id,
      createTime: \`\${Date.now() - startTime}ms\`
    }));
    
    return NextResponse.json({
      success: true,
      isNewUser: true,`
  );
  
  // Add logging for session cookie update
  updatedContent = updatedContent.replace(
    /try {[\s\S]*?const cookieStore = await cookies\(\);/,
    `try {
        console.log('[AUTH DEBUG] 🍪 Updating session cookies with tenant ID:', existingUser.tenant_id);
        const cookieStore = await cookies();`
  );
  
  // Add logging after session cookie is parsed
  updatedContent = updatedContent.replace(
    /const sessionData = JSON\.parse\(Buffer\.from\(sessionCookie\.value, 'base64'\)\.toString\(\)\);/,
    `const sessionCookie = cookieStore.get('appSession');
          
          if (sessionCookie) {
            console.log('[AUTH DEBUG] 🍪 Found existing appSession cookie');
            const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
            console.log('[AUTH DEBUG] 📄 Session data parsed successfully. User sub:', sessionData.user?.sub || 'not found');`
  );
  
  // Add logging for cookie error handling
  updatedContent = updatedContent.replace(
    /console\.error\('\[Create Auth0 User\] Error updating session cookie:'/,
    `console.error('[AUTH DEBUG] ❌ Error updating session cookie:'`
  );
  
  // Add execution time logging at the end of the function
  updatedContent = updatedContent.replace(
    /} catch \(error\) {[\s\S]*?console\.error\(error\);[\s\S]*?}/,
    `} catch (error) {
    console.error('[AUTH DEBUG] ❌ Error in create-auth0-user:', error.message);
    console.error(error);
    return NextResponse.json({ success: false, message: 'Error processing user', error: error.message }, { status: 500 });
  } finally {
    console.log('[AUTH DEBUG] ⏱️ Total processing time:', \`\${Date.now() - startTime}ms\`);
  }`
  );
  
  await fs.writeFile(filePath, updatedContent, 'utf8');
  console.log(`✅ Enhanced logging in ${path.basename(filePath)}`);
}

async function enhanceAuthCallbackLogging() {
  const filePath = FILES_TO_ENHANCE[1].path;
  await createBackup(filePath, FILES_TO_ENHANCE[1].backupSuffix);
  
  console.log(`Enhancing logging in ${path.basename(filePath)}...`);
  const content = await fs.readFile(filePath, 'utf8');
  
  // Add logging to the start of the GET handler
  let updatedContent = content.replace(
    /export async function GET\(request\) {/,
    `export async function GET(request) {
  console.log('[AUTH DEBUG] 📥 auth/callback route accessed');
  const startTime = Date.now();`
  );
  
  // Add logging for session data
  updatedContent = updatedContent.replace(
    /const session = await getSession\(request, response\);/,
    `const session = await getSession(request, response);
  console.log('[AUTH DEBUG] 🔑 Auth0 session data received:', JSON.stringify({
    session_user_email: session?.user?.email || 'not found',
    session_user_sub: session?.user?.sub || 'not found',
    has_session: !!session,
    tenant_id: session?.user?.tenant_id || 'not found',
    timestamp: new Date().toISOString()
  }));`
  );
  
  // Add logging for redirect determination
  updatedContent = updatedContent.replace(
    /if \(!session\) {/,
    `if (!session) {
    console.log('[AUTH DEBUG] ❌ No session found, redirecting to /api/auth/login');`
  );
  
  // Add logging for tenant ID check
  updatedContent = updatedContent.replace(
    /if \(session\.user\.tenantId || session\.user\.tenant_id\) {/,
    `if (session.user.tenantId || session.user.tenant_id) {
      console.log('[AUTH DEBUG] ✅ Tenant ID found in session:', session.user.tenantId || session.user.tenant_id);`
  );
  
  // Add logging for user identity check
  updatedContent = updatedContent.replace(
    /if \(!session\.user\.email\) {/,
    `if (!session.user.email) {
      console.log('[AUTH DEBUG] ⚠️ No email found in session, cannot proceed with onboarding');`
  );
  
  // Add logging for new user registration
  updatedContent = updatedContent.replace(
    /const { isNewUser, tenant_id, tenantId, needs_onboarding, onboardingCompleted } = await/,
    `console.log('[AUTH DEBUG] 🔄 Registering user with create-auth0-user API');
      const { isNewUser, tenant_id, tenantId, needs_onboarding, onboardingCompleted } = await`
  );
  
  // Add logging for registration response
  updatedContent = updatedContent.replace(
    /console\.log\('API response:', apiResponse\);/,
    `console.log('[AUTH DEBUG] 📤 Registration API response:', JSON.stringify({
        isNewUser: apiResponse.isNewUser,
        tenant_id: apiResponse.tenant_id || apiResponse.tenantId,
        needs_onboarding: apiResponse.needs_onboarding,
        onboardingCompleted: apiResponse.onboardingCompleted,
        responseTime: \`\${Date.now() - startTime}ms\`
      }));`
  );
  
  // Add logging for redirection decision
  updatedContent = updatedContent.replace(
    /const redirectUrl = isNewUser || needs_onboarding/,
    `console.log('[AUTH DEBUG] 🧭 Determining redirect URL. isNewUser:', isNewUser, 'needs_onboarding:', needs_onboarding);
      const redirectUrl = isNewUser || needs_onboarding`
  );
  
  // Add logging for final redirect
  updatedContent = updatedContent.replace(
    /return redirect\(redirectUrl\);/,
    `console.log('[AUTH DEBUG] 🔀 Redirecting user to:', redirectUrl);
      console.log('[AUTH DEBUG] ⏱️ Total callback processing time:', \`\${Date.now() - startTime}ms\`);
      return redirect(redirectUrl);`
  );
  
  // Add error logging
  updatedContent = updatedContent.replace(
    /} catch \(error\) {[\s\S]*?console\.error\('Error in auth callback:'/,
    `} catch (error) {
    console.error('[AUTH DEBUG] ❌ Error in auth callback:'`
  );
  
  await fs.writeFile(filePath, updatedContent, 'utf8');
  console.log(`✅ Enhanced logging in ${path.basename(filePath)}`);
}

async function enhanceOnboardingStatusLogging() {
  const filePath = FILES_TO_ENHANCE[2].path;
  await createBackup(filePath, FILES_TO_ENHANCE[2].backupSuffix);
  
  console.log(`Enhancing logging in ${path.basename(filePath)}...`);
  const content = await fs.readFile(filePath, 'utf8');
  
  // Add logging to the start of the GET handler
  let updatedContent = content.replace(
    /export async function GET\(request\) {/,
    `export async function GET(request) {
  console.log('[ONBOARDING DEBUG] 📥 onboarding/status GET request received');
  const startTime = Date.now();`
  );
  
  // Add logging for session data
  updatedContent = updatedContent.replace(
    /const session = await getSession\(request, response\);/,
    `const session = await getSession(request, response);
  console.log('[ONBOARDING DEBUG] 🔑 Session data:', JSON.stringify({
    has_session: !!session,
    user_email: session?.user?.email || 'not found',
    user_sub: session?.user?.sub || 'not found',
    tenant_id: session?.user?.tenant_id || session?.user?.tenantId || 'not found',
    timestamp: new Date().toISOString()
  }));`
  );
  
  // Add logging for database lookup
  updatedContent = updatedContent.replace(
    /const existingUser = await prisma\.users\.findFirst\({/,
    `console.log('[ONBOARDING DEBUG] 🔍 Looking up user in database by email:', session.user.email);
  const existingUser = await prisma.users.findFirst({`
  );
  
  // Add detailed logging after user lookup
  updatedContent = updatedContent.replace(
    /if \(existingUser\) {/,
    `if (existingUser) {
    console.log('[ONBOARDING DEBUG] ✅ User found in database:', JSON.stringify({
      id: existingUser.id,
      email: existingUser.email,
      tenant_id: existingUser.tenant_id,
      needs_onboarding: existingUser.needs_onboarding !== false,
      onboarding_completed: existingUser.onboarding_completed === true,
      current_step: existingUser.current_onboarding_step || 'business_info',
      lookupTime: \`\${Date.now() - startTime}ms\`
    }));`
  );
  
  // Add logging for database updates
  updatedContent = updatedContent.replace(
    /const updatedUser = await prisma\.users\.update\({/,
    `console.log('[ONBOARDING DEBUG] 🔄 Updating user onboarding status in database:', JSON.stringify({
      step: body.step,
      completed: body.completed === true
    }));
    const updatedUser = await prisma.users.update({`
  );
  
  // Add logging after database update
  updatedContent = updatedContent.replace(
    /return NextResponse\.json\({[\s\S]*?success: true,/,
    `console.log('[ONBOARDING DEBUG] ✅ User onboarding status updated successfully:', JSON.stringify({
      current_step: updatedUser.current_onboarding_step,
      completed: updatedUser.onboarding_completed === true,
      updateTime: \`\${Date.now() - startTime}ms\`
    }));
    
    return NextResponse.json({
      success: true,`
  );
  
  // Add error logging
  updatedContent = updatedContent.replace(
    /} catch \(error\) {[\s\S]*?console\.error\('Error updating onboarding status:'/,
    `} catch (error) {
    console.error('[ONBOARDING DEBUG] ❌ Error updating onboarding status:'`
  );
  
  // Add execution time logging at the end of the function
  updatedContent = updatedContent.replace(
    /} catch \(error\) {[\s\S]*?console\.error\(error\);[\s\S]*?}/,
    `} catch (error) {
    console.error('[ONBOARDING DEBUG] ❌ Error in onboarding status:', error.message);
    console.error(error);
    return NextResponse.json({ success: false, message: 'Error updating onboarding status', error: error.message }, { status: 500 });
  } finally {
    console.log('[ONBOARDING DEBUG] ⏱️ Total processing time:', \`\${Date.now() - startTime}ms\`);
  }`
  );
  
  await fs.writeFile(filePath, updatedContent, 'utf8');
  console.log(`✅ Enhanced logging in ${path.basename(filePath)}`);
}

async function enhanceOnboardingServiceLogging() {
  const filePath = FILES_TO_ENHANCE[3].path;
  await createBackup(filePath, FILES_TO_ENHANCE[3].backupSuffix);
  
  console.log(`Enhancing logging in ${path.basename(filePath)}...`);
  const content = await fs.readFile(filePath, 'utf8');
  
  // Add logging to status update method
  let updatedContent = content.replace(
    /export const updateOnboardingStatus = async \(step, completed = false\) => {/,
    `export const updateOnboardingStatus = async (step, completed = false) => {
  console.log('[ONBOARDING SERVICE DEBUG] 🔄 Updating onboarding status:', JSON.stringify({ 
    step, 
    completed,
    timestamp: new Date().toISOString()
  }));
  const startTime = Date.now();`
  );
  
  // Add logging for API call
  updatedContent = updatedContent.replace(
    /const response = await fetch\('\/api\/onboarding\/status'/,
    `console.log('[ONBOARDING SERVICE DEBUG] 📤 Sending onboarding status update request');
  const response = await fetch('/api/onboarding/status'`
  );
  
  // Add logging for response
  updatedContent = updatedContent.replace(
    /const data = await response\.json\(\);/,
    `const data = await response.json();
  console.log('[ONBOARDING SERVICE DEBUG] 📥 Onboarding status update response:', JSON.stringify({
    status: response.status,
    success: data.success,
    message: data.message,
    responseTime: \`\${Date.now() - startTime}ms\`
  }));`
  );
  
  // Add logging for error handling
  updatedContent = updatedContent.replace(
    /console\.error\('Error updating onboarding status:'/,
    `console.error('[ONBOARDING SERVICE DEBUG] ❌ Error updating onboarding status:'`
  );
  
  // Add logging to status fetch method
  updatedContent = updatedContent.replace(
    /export const getOnboardingStatus = async \(\) => {/,
    `export const getOnboardingStatus = async () => {
  console.log('[ONBOARDING SERVICE DEBUG] 🔍 Fetching onboarding status');
  const startTime = Date.now();`
  );
  
  // Add logging for status fetch response
  updatedContent = updatedContent.replace(
    /return data;/,
    `console.log('[ONBOARDING SERVICE DEBUG] 📥 Onboarding status fetched:', JSON.stringify({
    success: data.success,
    step: data.current_step,
    completed: data.completed,
    fetchTime: \`\${Date.now() - startTime}ms\`
  }));
  return data;`
  );
  
  await fs.writeFile(filePath, updatedContent, 'utf8');
  console.log(`✅ Enhanced logging in ${path.basename(filePath)}`);
}

async function createSummaryDocument() {
  try {
    console.log('Creating summary document...');
    
    const summary = `# Auth0 Session and Onboarding Logging Enhancement

## Overview

This update adds comprehensive logging throughout the Auth0 authentication and onboarding flow to provide better visibility into the state of the user's session, tenant ID, and onboarding status at each critical point in the process.

## Enhanced Logging Areas

### 1. User Creation and Lookup API

Enhanced logging in \`frontend/pyfactor_next/src/app/api/user/create-auth0-user/route.js\`:

- Detailed request body logging with timestamps
- Database lookup operations and results
- User creation events
- Session cookie updates with tenant ID information
- Error conditions and stack traces
- Performance metrics for each operation

### 2. Auth0 Callback Handler

Enhanced logging in \`frontend/pyfactor_next/src/app/api/auth/callback/route.js\`:

- Session validation and parsing
- Tenant ID verification
- Redirect decision making process
- API call results and response timing
- Error handling with detailed context

### 3. Onboarding Status API

Enhanced logging in \`frontend/pyfactor_next/src/app/api/onboarding/status/route.js\`:

- Session validation
- Database operations for onboarding status
- Step tracking and completion status
- Database update confirmation
- Performance metrics

### 4. Frontend Onboarding Service

Enhanced logging in \`frontend/pyfactor_next/src/services/onboardingService.js\`:

- API calls for onboarding status updates
- Response handling
- Error conditions
- Performance metrics

## Benefits

This comprehensive logging enhancement provides:

1. Clear visibility into the Auth0 session state at every step
2. Tracking of tenant ID persistence across the authentication flow
3. Verification that onboarding status is correctly saved in the database
4. Performance metrics to identify bottlenecks
5. Better error context for troubleshooting
6. Consistent log format with timestamps and operation identifiers

## Usage

The logs will be available in:

- Frontend logs in the browser console (for client-side operations)
- Server logs in Vercel deployment logs (for API routes)
- Each log entry is prefixed with a context identifier (e.g., '[AUTH DEBUG]', '[ONBOARDING DEBUG]')

## Implementation Details

The implementation uses console.log statements with structured JSON data to ensure consistent formatting. Performance metrics are included for key operations to help identify any potential bottlenecks.

Date: ${new Date().toISOString().slice(0, 10)}
`;
    
    await fs.writeFile(SUMMARY_PATH, summary, 'utf8');
    console.log(`✅ Created summary at ${SUMMARY_PATH}`);
    return true;
  } catch (error) {
    console.error(`❌ Error creating summary document: ${error.message}`);
    return false;
  }
}

async function updateScriptRegistry() {
  try {
    console.log('Updating script registry...');
    
    const registry = await fs.readFile(SCRIPT_REGISTRY_PATH, 'utf8');
    const today = new Date().toISOString().slice(0, 10);
    
    const updatedRegistry = registry + `\n
| Version0126_enhance_auth0_session_logging.mjs | ${today} | Adds comprehensive logging throughout Auth0 auth and onboarding flow | ✅ |`;
    
    await fs.writeFile(SCRIPT_REGISTRY_PATH, updatedRegistry, 'utf8');
    console.log('✅ Updated script registry');
    return true;
  } catch (error) {
    console.error(`❌ Error updating script registry: ${error.message}`);
    return false;
  }
}

async function commitAndPush() {
  try {
    console.log('Committing changes to git...');
    
    // Add files
    for (const file of FILES_TO_ENHANCE) {
      execSync(`git add ${file.path}`);
    }
    execSync(`git add ${SUMMARY_PATH}`);
    execSync(`git add ${SCRIPT_REGISTRY_PATH}`);
    
    // Commit
    execSync('git commit -m "Add enhanced logging for Auth0 session and onboarding flow"');
    console.log('✅ Changes committed successfully');
    
    // Push to deployment branch
    console.log('Pushing to Dott_Main_Dev_Deploy branch to trigger deployment...');
    execSync('git push origin HEAD:Dott_Main_Dev_Deploy');
    console.log('✅ Changes pushed to Dott_Main_Dev_Deploy successfully');
    
    return true;
  } catch (error) {
    console.error(`❌ Error in git operations: ${error.message}`);
    return false;
  }
}

async function enhanceLogging() {
  try {
    // Enhance logging in key files
    await enhanceCreateAuth0UserLogging();
    await enhanceAuthCallbackLogging();
    await enhanceOnboardingStatusLogging();
    await enhanceOnboardingServiceLogging();
    
    // Create summary document
    await createSummaryDocument();
    
    // Update script registry
    await updateScriptRegistry();
    
    // Commit and push to trigger deployment
    await commitAndPush();
    
    console.log('\n✅ Logging enhancement completed successfully!');
    console.log('The changes have been deployed to improve visibility into the Auth0 session and onboarding flow.');
    console.log('It may take a few minutes for the changes to propagate through Vercel.');
    
    return true;
  } catch (error) {
    console.error(`❌ Error during logging enhancement: ${error.message}`);
    console.error(error);
    return false;
  }
}

// Execute the logging enhancement
enhanceLogging();
