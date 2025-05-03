/**
 * Version0054_fix_https_config.js
 * 
 * This script fixes HTTPS configuration issues in the Next.js app.
 * It specifically targets problems with SSL certificates and HTTPS server initialization.
 * 
 * Version: 1.0
 * Date: 2025-05-03
 */

import * as fs from 'fs';
import * as path from 'path';

// Configuration
const projectRoot = '/Users/kuoldeng/projectx';
const frontendRoot = path.join(projectRoot, 'frontend', 'pyfactor_next');
const backupDir = path.join(projectRoot, 'scripts', 'backups');

// Helper Functions
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

function backupFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  
  const fileName = path.basename(filePath);
  const backupPath = path.join(backupDir, `${fileName}.backup-${Date.now()}`);
  
  fs.copyFileSync(filePath, backupPath);
  console.log(`Backed up ${filePath} to ${backupPath}`);
}

// 1. Fix or create server.js for HTTPS support
function fixServerJs() {
  const serverJsPath = path.join(frontendRoot, 'server.js');
  backupFile(serverJsPath);
  
  const serverJsContent = `const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

// Get environment variables
const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// SSL options for local development
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, './certificates/localhost-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, './certificates/localhost.pem')),
};

// Prepare Next.js app
app.prepare().then(() => {
  // Create HTTPS server
  createServer(httpsOptions, (req, res) => {
    try {
      // Parse URL
      const parsedUrl = parse(req.url, true);
      
      // Let Next.js handle the request
      handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  }).listen(port, (err) => {
    if (err) throw err;
    
    console.log(\`> Ready on https://\${hostname}:\${port}\`);
    console.log('> HTTPS server successfully started');
  });
});
`;

  fs.writeFileSync(serverJsPath, serverJsContent);
  console.log(`Created/updated server.js with proper HTTPS configuration`);
}

// 2. Generate self-signed certificates if needed
function generateCertificates() {
  const certsDir = path.join(frontendRoot, 'certificates');
  ensureDir(certsDir);
  
  const keyPath = path.join(certsDir, 'localhost-key.pem');
  const certPath = path.join(certsDir, 'localhost.pem');
  
  // Check if certificates already exist
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    console.log('SSL certificates already exist, skipping generation');
    return;
  }
  
  // Create certificate files with default content (these are just placeholders)
  // In a real scenario, you would generate proper certificates using mkcert or a similar tool
  console.log('WARNING: Creating placeholder SSL certificates. In production, you should use proper certificates.');
  
  const keyContent = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCv8RbqsL1gZR99
PqRnkA6/0lQ/kI+6G5Sz5m43JSJS27q0n/z8quH1vWe5NSE/xuIr+fy3/YPX3+EU
cVwcEhfmHAYteG86CFrG5AizklVcEeRgrTzZTvTvhDsqnRqNcsKgYCOywypZ8psw
GQkYnZ8MQA4/CmYzG88+dzOgY76oJ74jq1iZYgHUQvQGn5M3rMVKQKQbdU6GrDQZ
OeQYB/MvgIWlcUZQOMKdV1tMjQbJbxGQNHhjJo9PD7AT3ZQBi9oFx6UvJKnpgLtp
R+gXDNiXpJ8V2R5JrFQbRhTLVXrGvhgR0o12OOpGigsGPP0taPkPIDpKYD8QJ9vP
LpIgA2hVAgMBAAECggEARI7YYhvfOq8CzH298bQZs4dE3zN7uPFQH8G++lsKe4Gl
S1KnryPiVYLntdfXMtOYgIJtceRKhOYTQYJNhyT1xyAgpbZcGzQ5tusHEE5HSptX
NjJOUmCWchbRk3DgCYHz1AJRnKVPLkdwMynPP/1ksHleu0FQhWW2ykgBnWFEfU8C
a8vK50ZJG05VSxWNsjaRtOn8AU7n0qWITBuDO6aKDQv0RQCrZTDVRnw1xAkHQg7h
kGI4dkcItaR2Is4wejAOqT+TL7Z6NOrO9I0EUQ1BRY1N+F93hs3UZua5RtIzQNRw
SAa5jLRkIdpQGbZMlZGiX4JzOB5M2aDrBmdawWQ+zQKBgQDS+uPw2BthxH3oKLQV
HE+1+6qZX3WnaGXLAg9fS7f5xQwlnWLzLJR5iMZzq7vSZZmXEE/rEA5ueF2BWwwk
1/Pf7vRDJXY/Hy810ZrYQQ9v6V+9a24lVWlIKXkNwBjQQq8PXrjm4jHOjYVz1ATq
eOzBJd8YACfhEIc2yZMN2G1UDwKBgQDVCyqXdXvlV8bs31BOQkNfwxTGbOJOUjH/
j1PRgiGYJQrBoHwdYW4PX4f54HZi0BtXDPrIBLprC+3KgK4s0MnRcCyd+XtpMJxL
mMkSzIklhUOVJGi4/XnPH/qAONDwEqiXCnxVWY75+Fp97k7lVvVJQAgLZxNU8a7t
TIeGdm+xOwKBgCvgoi5phx3xvpLdDk12TFPuoE6HPE93QYIPqG2pKLvs+1wUecGY
KmGmTPNxZeZbBWOcciTR6MbeRNTnLn5qUmd8YJ+DRQoBZxvLJZDmwXLJP5ep+hkt
WM24kZiWuE6q0MkQ+HOA1O3KDgsTk5lOGCpFc7sRPOpLQYrrzkNZ3tXvAoGAPoVK
5KPUdR3v8zVXyh01H4KBsVGe11y9JQ9DTJmSXahJGBuU1idWkpBXuWTXSA1EZF3+
NElNpJ+vGgbOHjIuYtDXwSVbpCW5REaKA5J9k2EPNUQtYyOdj2G0yXlEYpQ6ybE9
5A+5QbaWlCS0Kfk5vy5jYrkyHWdL2dHXXiTptOECgYEAwPGpyEHzlvIRT0XO1DwK
8fZMGs8qW/ny8iMuwgD4Oit8gjDnC1qtwbrTEGLjYXmDG8TYWdDIk9xHgV+poiTw
1MlJ0kN3/xtJnpJYCLIGCRVV7wJCvWWp3bOyYhYVBcFLe/tCBEKI9pBVLNeTw2wa
ztP2V11FQi2AxWIe4BTA/uM=
-----END PRIVATE KEY-----
`;

  const certContent = `-----BEGIN CERTIFICATE-----
MIIDazCCAlOgAwIBAgIUBFMXM+Xgj/u2DHq8BVmyLYgoVacwDQYJKoZIhvcNAQEL
BQAwRTELMAkGA1UEBhMCQVUxEzARBgNVBAgMClNvbWUtU3RhdGUxITAfBgNVBAoM
GEludGVybmV0IFdpZGdpdHMgUHR5IEx0ZDAeFw0yMzA1MDMxMDM1MDhaFw0yNDA1
MDIxMDM1MDhaMEUxCzAJBgNVBAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEw
HwYDVQQKDBhJbnRlcm5ldCBXaWRnaXRzIFB0eSBMdGQwggEiMA0GCSqGSIb3DQEB
AQUAA4IBDwAwggEKAoIBAQCv8RbqsL1gZR99PqRnkA6/0lQ/kI+6G5Sz5m43JSJS
27q0n/z8quH1vWe5NSE/xuIr+fy3/YPX3+EUcVwcEhfmHAYteG86CFrG5AizklVc
EeRgrTzZTvTvhDsqnRqNcsKgYCOywypZ8pswGQkYnZ8MQA4/CmYzG88+dzOgY76o
J74jq1iZYgHUQvQGn5M3rMVKQKQbdU6GrDQZOeQYB/MvgIWlcUZQOMKdV1tMjQbJ
bxGQNHhjJo9PD7AT3ZQBi9oFx6UvJKnpgLtpR+gXDNiXpJ8V2R5JrFQbRhTLVXrG
vhgR0o12OOpGigsGPP0taPkPIDpKYD8QJ9vPLpIgA2hVAgMBAAGjUzBRMB0GA1Ud
DgQWBBQuXnhdAAqmB6UPnjCzObw0YF7c2jAfBgNVHSMEGDAWgBQuXnhdAAqmB6UP
njCzObw0YF7c2jAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3DQEBCwUAA4IBAQAR
vMJTpRVjoagzB3jcns3/Ky9QJ1rwVHoLGsH3fM1rqFbkizBxX4K0F/QIjP4CFJYu
GRKXQldUyNm/KKNvMLz5XE6L/C0ccIXmYWQwvXZOmYCvqHSbH1k/K4rkmzx7gTE/
KYkZ+HqwPqIVAxT1RXt8YAFZk6MomI3h6YE2FyLDLLQlE8KmMEO0YTb7oVVNzZv7
CPW6KvC+SZFeynQE5TlbDvMqjHPZkDTX9zr237LHgA9QLL0lZWCZp/hFCzyjGbAP
OKxOZOD3y3DEeFOiDHZODucRJl9XYEUJKYuYfmnt8iwBKDWvOV/SubnPikWs2Bq+
V3OBcxRaQwUXMoIBIl+j
-----END CERTIFICATE-----
`;

  fs.writeFileSync(keyPath, keyContent);
  fs.writeFileSync(certPath, certContent);
  console.log(`Created placeholder SSL certificates in ${certsDir}`);
}

// 3. Update package.json scripts for HTTPS
function updatePackageJsonScripts() {
  const packageJsonPath = path.join(frontendRoot, 'package.json');
  backupFile(packageJsonPath);
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Update scripts for HTTPS
    packageJson.scripts = {
      ...packageJson.scripts,
      'dev': 'node server.js',
      'dev:https': 'NODE_ENV=development node server.js',
      'build': 'next build',
      'start': 'NODE_ENV=production node server.js',
    };
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log(`Updated package.json scripts for HTTPS support`);
  } catch (error) {
    console.error(`Error updating package.json: ${error.message}`);
  }
}

// 4. Create a minimal .env.local for HTTPS configuration
function createEnvFile() {
  const envPath = path.join(frontendRoot, '.env.local');
  
  const envContent = `# Environment variables for Next.js HTTPS configuration
NODE_ENV=development
PORT=3000
HTTPS=true
SSL_CRT_FILE=./certificates/localhost.pem
SSL_KEY_FILE=./certificates/localhost-key.pem
NEXT_PUBLIC_FRONTEND_URL=https://localhost:3000
BACKEND_API_URL=https://127.0.0.1:8000
`;
  
  fs.writeFileSync(envPath, envContent);
  console.log(`Created/updated .env.local file with HTTPS configuration`);
}

// Main function
async function main() {
  console.log('Starting HTTPS configuration fixes...');
  
  // Create backup directory
  ensureDir(backupDir);
  
  // Apply fixes
  fixServerJs();
  generateCertificates();
  updatePackageJsonScripts();
  createEnvFile();
  
  console.log('\nHTTPS configuration fixes completed!');
  console.log('\nPlease restart your Next.js server using:');
  console.log(`cd ${frontendRoot} && pnpm run dev:https`);
}

// Run the script
main().catch(console.error); 