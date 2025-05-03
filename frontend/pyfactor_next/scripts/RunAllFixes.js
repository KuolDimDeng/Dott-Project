#!/usr/bin/env node

/**
 * RunAllFixes.js
 * 
 * This script runs all the fix scripts in sequence to address the sign-in issues:
 * 1. Fix SQL syntax error in tenant initialization
 * 2. Fix database connection pool errors
 * 3. Fix logo image loading issues
 * 
 * Date: 2025-04-21
 * Author: Kubernetes Developer
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the current module's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// List of fix scripts to run in order
const scripts = [
  'Version0001_Fix_PostgreSQL_Tenant_Initialization.js',
  'Version0002_Fix_Database_Pool_Connection_Errors.js',
  'Version0003_Fix_Logo_Image_Loading.js'
];

// Counter for tracking progress
let completed = 0;
let successful = 0;
let failed = 0;

console.log('Starting to run all fix scripts in sequence...\n');

// Function to run a script and wait for it to complete
function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`RUNNING: ${scriptName} (${completed + 1}/${scripts.length})`);
    console.log(`${'='.repeat(80)}\n`);
    
    const scriptPath = join(__dirname, scriptName);
    const child = spawn('node', [scriptPath], { 
      stdio: 'inherit',
      shell: true 
    });
    
    child.on('close', (code) => {
      completed++;
      
      if (code === 0) {
        successful++;
        console.log(`\n✓ Successfully executed: ${scriptName}\n`);
        resolve();
      } else {
        failed++;
        console.log(`\n✗ Failed to execute: ${scriptName} (Exit code: ${code})\n`);
        resolve(); // Continue to next script even if this one fails
      }
    });
    
    child.on('error', (err) => {
      failed++;
      console.log(`\n✗ Error executing ${scriptName}: ${err.message}\n`);
      resolve(); // Continue to next script even if this one fails
    });
  });
}

// Run all scripts in sequence
async function runAllScripts() {
  for (const script of scripts) {
    await runScript(script);
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log('EXECUTION SUMMARY');
  console.log(`${'='.repeat(80)}`);
  console.log(`Total scripts: ${scripts.length}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  console.log(`${'='.repeat(80)}\n`);
  
  if (failed > 0) {
    console.log('\x1b[33m%s\x1b[0m', 'Some scripts failed execution. Please check the logs above for details.');
    console.log('You may need to run the failed scripts individually.\n');
  } else {
    console.log('\x1b[32m%s\x1b[0m', 'All scripts executed successfully!');
    console.log('The application should now be functioning correctly.\n');
  }
  
  console.log('Please restart your Next.js application to apply all fixes:');
  console.log('1. Stop the current server (Ctrl+C)');
  console.log('2. Run: pnpm run dev:https\n');
}

// Execute all scripts
runAllScripts().catch(err => {
  console.error('Error running scripts:', err);
  process.exit(1);
}); 