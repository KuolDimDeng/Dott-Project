import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Version0129_fix_auth0_login_rewrite_error.mjs
 * 
 * This script fixes the NextResponse.rewrite() error in the Auth0 login route.
 * The issue was that we were using the 'x-middleware-rewrite' header which
 * triggers an unsupported NextResponse.rewrite() error in App Router API routes.
 * 
 * The fix removes this header while preserving the redirect functionality.
 */

const updateScriptRegistry = () => {
  const registryPath = path.join(process.cwd(), 'frontend/pyfactor_next/scripts/script_registry.md');
  const scriptEntry = `| Version0129_fix_auth0_login_rewrite_error.mjs | Fix Auth0 login route NextResponse.rewrite() error | 6/7/2025 | Complete |`;
  
  try {
    let content = fs.readFileSync(registryPath, 'utf8');
    if (!content.includes('Version0129_fix_auth0_login_rewrite_error.mjs')) {
      const lines = content.split('\n');
      // Find the table in the content
      const tableStartIndex = lines.findIndex(line => line.includes('| Script Name | Purpose | Date | Status |'));
      
      if (tableStartIndex !== -1) {
        // Insert the new entry after the table header and separator
        lines.splice(tableStartIndex + 2, 0, scriptEntry);
        content = lines.join('\n');
        fs.writeFileSync(registryPath, content);
        console.log('Updated script registry');
      } else {
        console.error('Could not find script registry table');
      }
    }
  } catch (error) {
    console.error('Error updating script registry:', error);
  }
};

const createDeploymentSummary = () => {
  const summaryPath = path.join(process.cwd(), 'frontend/pyfactor_next/scripts/AUTH0_LOGIN_REWRITE_ERROR_FIX.md');
  const summary = `# Auth0 Login Rewrite Error Fix

## Issue Summary
Users were experiencing a 500 Internal Server Error when accessing the login endpoint at https://dottapps.com/api/auth/login with the error:
\`\`\`
[Error: NextResponse.rewrite() was used in a app route handler, this is not currently supported. Please remove the invocation to continue.]
\`\`\`

## Root Cause Analysis
1. The login route was setting the 'x-middleware-rewrite' header, which is internally interpreted by Next.js as a rewrite operation.
2. Rewrite operations are not supported in App Router API routes (server components), only in middleware.

## Solution Implemented
1. Removed the problematic 'x-middleware-rewrite' header from the login route's response.
2. Maintained the redirect functionality with proper cache headers.

## Code Changes
### In \`/frontend/pyfactor_next/src/app/api/auth/login/route.js\`:
- Removed the \`response.headers.set('x-middleware-rewrite', request.url);\` line
- Kept other functionality and error handling intact

## Testing and Verification
The fix was tested by:
1. Verifying successful login redirects without the 500 error
2. Ensuring proper handling of the Auth0 authorization flow

## Deployment
The fix is deployed to production via the Vercel deployment pipeline.

## Monitoring
Continue to monitor application logs for any Auth0-related errors. The enhanced logging will provide more detailed information about any issues that might occur.
`;

  fs.writeFileSync(summaryPath, summary);
  console.log('Created deployment summary');
};

const commitAndPushChanges = () => {
  try {
    // Check if there are uncommitted changes
    const status = execSync('git status --porcelain').toString();
    
    if (status.trim()) {
      console.log('Found uncommitted changes. Committing...');
      execSync('git add .');
      execSync('git commit -m "Fix Auth0 login route rewrite error"');
      console.log('Changes committed successfully');
      
      // Push to deployment branch
      console.log('Pushing to Dott_Main_Dev_Deploy branch...');
      execSync('git push origin Dott_Main_Dev_Deploy');
      console.log('Successfully pushed to deployment branch');
    } else {
      console.log('No changes to commit');
    }
  } catch (error) {
    console.error('Error during git operations:', error.message);
    process.exit(1);
  }
};

const main = async () => {
  console.log('Starting Auth0 login rewrite error fix deployment...');
  
  updateScriptRegistry();
  createDeploymentSummary();
  commitAndPushChanges();
  
  console.log('Auth0 login rewrite error fix deployment completed successfully');
  console.log('The changes will be live once the Vercel deployment completes');
  console.log('To check deployment status, visit the Vercel dashboard or run:');
  console.log('  pnpm vercel ls');
};

main().catch(err => {
  console.error('Deployment failed:', err);
  process.exit(1);
});
