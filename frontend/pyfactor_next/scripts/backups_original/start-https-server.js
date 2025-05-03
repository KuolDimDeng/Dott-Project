#!/usr/bin/env node

/**
 * HTTPS Server Starter
 * 
 * This script starts your backend server with HTTPS support using mkcert certificates.
 * Make sure you've generated certificates using mkcert before running this script.
 * 
 * Usage:
 *   node scripts/start-https-server.js
 */

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Default paths to look for certificates
const possibleCertPaths = [
  path.join(process.cwd(), 'certificates'),
  path.join(process.cwd(), '../certificates'),
  path.join(process.cwd(), '../../certificates'),
  path.join(process.env.HOME || process.env.USERPROFILE, '.certificates')
];

// Certificate filenames
const certFilename = 'localhost+1.pem';
const keyFilename = 'localhost+1-key.pem';

// Find certificates
let certPath = null;
let keyPath = null;

for (const dir of possibleCertPaths) {
  const potentialCertPath = path.join(dir, certFilename);
  const potentialKeyPath = path.join(dir, keyFilename);
  
  if (fs.existsSync(potentialCertPath) && fs.existsSync(potentialKeyPath)) {
    certPath = potentialCertPath;
    keyPath = potentialKeyPath;
    console.log(`Found certificates in ${dir}`);
    break;
  }
}

// If certificates not found, provide instructions
if (!certPath || !keyPath) {
  console.error('\x1b[31mError: SSL certificates not found!\x1b[0m');
  console.log('\nPlease create SSL certificates using mkcert:');
  console.log('\n1. Install mkcert:');
  console.log('   brew install mkcert  # macOS');
  console.log('   # or appropriate command for your OS');
  console.log('\n2. Install local CA:');
  console.log('   mkcert -install');
  console.log('\n3. Create certificates:');
  console.log('   mkdir -p certificates');
  console.log('   cd certificates');
  console.log('   mkcert localhost 127.0.0.1');
  console.log('\nThen try running this script again.');
  process.exit(1);
}

// Set environment variables for the server
const env = {
  ...process.env,
  HTTPS: 'true',
  SSL_CRT_FILE: certPath,
  SSL_KEY_FILE: keyPath,
  PORT: process.env.PORT || '8000'
};

// Determine the backend start command
// This should be adjusted based on your backend server start command
console.log('\x1b[34mStarting backend server with HTTPS support...\x1b[0m');
console.log(`Using certificate: ${certPath}`);
console.log(`Using key: ${keyPath}`);
console.log(`Server will be available at: https://localhost:${env.PORT}`);

// Start the backend server process
// Replace 'pnpm start' with your actual backend start command
const serverProcess = spawn('pnpm', ['start'], { 
  env,
  stdio: 'inherit',
  shell: true
});

// Handle process exit
serverProcess.on('exit', (code) => {
  if (code !== 0) {
    console.error(`\x1b[31mBackend server exited with code ${code}\x1b[0m`);
  }
});

// Handle process errors
serverProcess.on('error', (err) => {
  console.error('\x1b[31mFailed to start backend server:\x1b[0m', err);
});

// Handle interrupt signal
process.on('SIGINT', () => {
  console.log('\n\x1b[34mShutting down server...\x1b[0m');
  serverProcess.kill('SIGINT');
  process.exit(0);
}); 