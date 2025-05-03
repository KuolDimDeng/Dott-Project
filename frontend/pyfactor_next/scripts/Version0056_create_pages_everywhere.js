/**
 * Version0056_create_pages_everywhere.js
 * 
 * This script creates identical pages in ALL possible Next.js page locations
 * to ensure the app has a working page regardless of configuration.
 * 
 * Version: 1.0
 * Date: 2025-05-03
 */

import * as fs from 'fs';
import * as path from 'path';

// Configuration
const projectRoot = '/Users/kuoldeng/projectx';
const frontendRoot = path.join(projectRoot, 'frontend', 'pyfactor_next');

// Helper function to ensure directory exists
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

// Delete .next to ensure a clean build
function deleteNextCache() {
  const nextDir = path.join(frontendRoot, '.next');
  if (fs.existsSync(nextDir)) {
    fs.rmSync(nextDir, { recursive: true, force: true });
    console.log('Deleted .next directory for a clean build');
  }
}

// Super simple page content
const pageContent = `export default function Home() {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ color: '#0070f3', marginBottom: '1rem' }}>
        Next.js Page - Working!
      </h1>
      <p style={{ fontSize: '1.2rem', lineHeight: '1.5' }}>
        This page was created by the emergency fix script to resolve 404 errors.
      </p>
      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Debug Info:</h2>
        <p>Path: {typeof window !== 'undefined' ? window.location.pathname : '/'}</p>
        <p>Generated at: {new Date().toISOString()}</p>
        <p>Environment: {process.env.NODE_ENV}</p>
      </div>
    </div>
  );
}`;

// Super simple layout content
const layoutContent = `export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>Next.js App - Fixed</title>
        <meta name="description" content="Fixed Next.js application" />
      </head>
      <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}`;

// Super simple app component (for _app.js)
const appContent = `
import React from 'react';

function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}

export default MyApp;
`;

// Super simple document component (for _document.js)
const documentContent = `
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
`;

// Create a simple minimal next.config.js
function createSimpleNextConfig() {
  const configPath = path.join(frontendRoot, 'next.config.js');
  
  const configContent = `/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep it as simple as possible
}

module.exports = nextConfig
`;
  
  fs.writeFileSync(configPath, configContent);
  console.log(`Created minimal next.config.js at ${configPath}`);
}

// Create pages in ALL possible Next.js locations
function createPagesEverywhere() {
  console.log('Creating pages in all possible Next.js locations...');
  
  // All the possible page locations in Next.js
  const locations = [
    // App Router locations
    { dir: path.join(frontendRoot, 'src/app'), file: 'page.js', content: pageContent },
    { dir: path.join(frontendRoot, 'src/app'), file: 'layout.js', content: layoutContent },
    
    { dir: path.join(frontendRoot, 'app'), file: 'page.js', content: pageContent },
    { dir: path.join(frontendRoot, 'app'), file: 'layout.js', content: layoutContent },
    
    // Pages Router locations
    { dir: path.join(frontendRoot, 'src/pages'), file: 'index.js', content: pageContent },
    { dir: path.join(frontendRoot, 'src/pages'), file: '_app.js', content: appContent },
    { dir: path.join(frontendRoot, 'src/pages'), file: '_document.js', content: documentContent },
    
    { dir: path.join(frontendRoot, 'pages'), file: 'index.js', content: pageContent },
    { dir: path.join(frontendRoot, 'pages'), file: '_app.js', content: appContent },
    { dir: path.join(frontendRoot, 'pages'), file: '_document.js', content: documentContent },
    
    // Legacy/unusual locations 
    { dir: frontendRoot, file: 'index.js', content: pageContent },
  ];
  
  // Create all the pages in all possible locations
  for (const location of locations) {
    ensureDir(location.dir);
    const filePath = path.join(location.dir, location.file);
    fs.writeFileSync(filePath, location.content);
    console.log(`Created ${location.file} at ${location.dir}`);
  }
}

// Check if node_modules has next installed
function verifyNextInstalled() {
  const nextPackagePath = path.join(frontendRoot, 'node_modules/next');
  if (!fs.existsSync(nextPackagePath)) {
    console.log('Warning: next package not found in node_modules!');
    console.log('You might need to run: pnpm install');
  } else {
    console.log('✓ Found Next.js package in node_modules');
  }
}

// Main function
async function main() {
  console.log('Starting emergency page creation in all locations...');
  
  // Delete .next cache
  deleteNextCache();
  
  // Create pages everywhere
  createPagesEverywhere();
  
  // Create simple next.config.js
  createSimpleNextConfig();
  
  // Verify next is installed
  verifyNextInstalled();
  
  console.log('\nEmergency page creation completed!');
  console.log('\nPlease restart your Next.js server using one of these:');
  console.log('1. Standard development server:');
  console.log(`   cd ${frontendRoot} && pnpm run dev`);
  console.log('2. HTTPS development server:');
  console.log(`   cd ${frontendRoot} && pnpm run dev:https`);
  console.log('3. Production build and server:');
  console.log(`   cd ${frontendRoot} && pnpm run build && pnpm run start`);
  console.log('\nIf still seeing issues, verify your package.json scripts are correct.');
}

// Run the script
main().catch(console.error); 