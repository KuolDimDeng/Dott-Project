/**
 * Version0049_fix_nextjs_config_final.js
 * 
 * This script fixes the final syntax error in the Next.js configuration
 * 
 * Version: 1.0
 * Date: 2025-05-03
 * 
 * Changes:
 * - Completely rewrites the Next.js configuration file to ensure correct syntax
 */

import * as fs from 'fs';
import * as path from 'path';

// Configuration
const projectRoot = '/Users/kuoldeng/projectx';
const frontendRoot = path.join(projectRoot, 'frontend', 'pyfactor_next');
const nextConfigPath = path.join(frontendRoot, 'next.config.js');
const backupDir = path.join(projectRoot, 'scripts', 'backups');
const backupFileName = `next.config.js.backup-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const backupPath = path.join(backupDir, backupFileName);

// Function to create directory if it doesn't exist
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
};

// Function to create a backup of the file
const createBackup = (filePath, backupPath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    ensureDirectoryExists(path.dirname(backupPath));
    fs.writeFileSync(backupPath, content, 'utf8');
    console.log(`Created backup at: ${backupPath}`);
    return true;
  } catch (error) {
    console.error(`Error creating backup: ${error.message}`);
    return false;
  }
};

// Function to completely rewrite the Next.js configuration
const rewriteConfig = async () => {
  try {
    // Create the new configuration file content
    const newConfigContent = `/** @type {import('next').NextConfig} */
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development';
const isHttps = process.env.HTTPS === 'true';

// Log HTTPS settings for debugging
console.log(\`[NextJS Config] HTTPS settings - env.HTTPS: \${process.env.HTTPS}, isHttps: \${isHttps}\`);
console.log(\`[NextJS Config] SSL files - CRT: \${process.env.SSL_CRT_FILE}, KEY: \${process.env.SSL_KEY_FILE}\`);

// HTTPS configuration moved to package.json script instead of next.config.js
// The dev:https script should include --experimental-https which is how Next.js 13+ handles HTTPS

// Config focused on stability and compatibility
const nextConfig = {
  // Basic Next.js settings
  reactStrictMode: true,
  
  // Set the correct src directory
  distDir: 'dist',
  
  // Next.js 15 doesn't support 'dir' property
  // Instead, we rely on the default src directory structure
  
  // Set pageExtensions at the top level instead of in experimental
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  
  // Environment variables available on the client side
  env: {
    BACKEND_API_URL: process.env.BACKEND_API_URL || 'https://127.0.0.1:8000',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'https://127.0.0.1:8000',
    USE_DATABASE: process.env.USE_DATABASE || 'false',
    MOCK_DATA_DISABLED: process.env.MOCK_DATA_DISABLED || 'false',
    PROD_MODE: process.env.PROD_MODE || 'false',
    HTTPS_ENABLED: 'true' // Force HTTPS to true since we're using SSL
  },
  
  // Handle API routes that should be proxied to the backend
  async rewrites() {
    console.log(\`[NextJS Config] Setting up API proxy rewrites to: https://127.0.0.1:8000/api/\`);
    return [
      {
        source: '/api/:path*',
        destination: 'https://127.0.0.1:8000/api/:path*',
      },
    ];
  },
  
  // External packages for server components - moved from experimental per Next.js 15.3.1 guidance
  serverExternalPackages: [],
  
  // Experimental features that are still supported
  experimental: {
    // Enable server actions with correct configuration
    serverActions: {
      bodySizeLimit: '2mb',
      allowedOrigins: ['localhost:3000', '127.0.0.1:3000']
    }
  },
  
  // Use transpilePackages for client-side only
  transpilePackages: [
    '@aws-amplify/ui-react',
    'aws-amplify',
    // Include all AWS Amplify modular packages
    'aws-amplify/auth',
    'aws-amplify/utils',
    'aws-amplify/core',
    '@aws-amplify/core',
    '@aws-amplify/auth'
  ],
  
  // Webpack config focusing on pure CommonJS for stability and AWS Amplify compatibility
  webpack: (config, { isServer, dev }) => {
    // Create stub for datepicker CSS
    config.module.rules.push({
      test: /react-datepicker\\/dist\\/react-datepicker\\.css$/,
      use: 'null-loader',
    });

    // Set up aliases for problematic modules
    config.resolve.alias = {
      ...config.resolve.alias,
      'chart.js': path.resolve(__dirname, 'src/utils/stubs/chart-stub.js'),
      'react-chartjs-2': path.resolve(__dirname, 'src/utils/stubs/react-chartjs-2-stub.js'),
      'react-datepicker': path.resolve(__dirname, 'src/utils/stubs/datepicker-stub.js'),
      'react-datepicker/dist/react-datepicker.css': path.resolve(__dirname, 'src/utils/stubs/empty.css'),
    };

    // Handle CSS files
    if (!isServer) {
      // Force CSS extraction at the top level
      const miniCssExtractPlugin = new MiniCssExtractPlugin({
        filename: 'static/css/[name].[contenthash:8].css',
        chunkFilename: 'static/css/[name].[contenthash:8].chunk.css',
        ignoreOrder: true, // Prevents order warnings with CSS modules
      });

      // Ensure the plugin is added only once
      const hasPlugin = config.plugins.some(
        plugin => plugin instanceof MiniCssExtractPlugin
      );
      
      if (!hasPlugin) {
        config.plugins.push(miniCssExtractPlugin);
      }
    }
    
    // Fix Node.js polyfills and AWS SDK requirements
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
      crypto: false,
      'aws-crt': false
    };

    // Add module resolution for AWS Amplify v6 modular imports
    config.resolve = {
      ...config.resolve,
      extensionAlias: {
        ...config.resolve.extensionAlias,
        '.js': ['.js', '.ts', '.tsx']
      }
    };

    // Add SVG support
    config.module.rules.push({
      test: /\\.svg$/,
      use: ['@svgr/webpack'],
    });

    return config;
  },
  
  // Update image optimization configuration
  images: {
    // Disable image optimization completely
    unoptimized: true,
    
    // Allow SVGs
    dangerouslyAllowSVG: true,
    
    // Set content security policy
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    
    // Remote image domains
    domains: [
      'localhost',
      '127.0.0.1',
      'via.placeholder.com',
      'picsum.photos',
      'images.unsplash.com',
    ],
  }
};

module.exports = nextConfig;
`;
    
    // Write the updated configuration back to the file
    fs.writeFileSync(nextConfigPath, newConfigContent, 'utf8');
    console.log('Completely rewrote Next.js configuration file to fix all syntax issues');
    
    return true;
  } catch (error) {
    console.error(`Error rewriting Next.js configuration: ${error.message}`);
    return false;
  }
};

// Function to update script registry
const updateScriptRegistry = () => {
  try {
    const registryPath = path.join(projectRoot, 'scripts', 'script_registry.md');
    
    if (fs.existsSync(registryPath)) {
      const registry = fs.readFileSync(registryPath, 'utf8');
      const entry = `| Version0049_fix_nextjs_config_final.js | Completely rewrote Next.js configuration to fix all syntax issues | 2025-05-03 | Success |`;
      
      if (!registry.includes('Version0049_fix_nextjs_config_final.js')) {
        const updatedRegistry = registry.replace(
          /\| Script Name \| Purpose \| Execution Status \| Date \| Result \|\n\|[-]+\|[-]+\|[-]+\|[-]+\|[-]+\|/,
          `| Script Name | Purpose | Execution Status | Date | Result |\n|------------|---------|-----------------|------|--------|\n${entry}`
        );
        
        fs.writeFileSync(registryPath, updatedRegistry, 'utf8');
        console.log('Updated script registry');
      }
    }
    
    // Update JSON registry
    const jsonRegistryPath = path.join(projectRoot, 'scripts', 'script_registry.json');
    if (fs.existsSync(jsonRegistryPath)) {
      const jsonRegistry = JSON.parse(fs.readFileSync(jsonRegistryPath, 'utf8'));
      
      // Check if the entry already exists
      const exists = jsonRegistry.some(entry => entry.name === 'Version0049_fix_nextjs_config_final.js');
      
      if (!exists) {
        // Add the new entry at the beginning
        jsonRegistry.unshift({
          "name": "Version0049_fix_nextjs_config_final.js",
          "description": "Completely rewrote Next.js configuration to fix all syntax issues",
          "dateExecuted": new Date().toISOString(),
          "status": "success",
          "version": "1.0",
          "modifiedFiles": [
            "/Users/kuoldeng/projectx/frontend/pyfactor_next/next.config.js"
          ]
        });
        
        fs.writeFileSync(jsonRegistryPath, JSON.stringify(jsonRegistry, null, 2), 'utf8');
        console.log('Updated JSON script registry');
      }
    }
    
    return true;
  } catch (error) {
    console.error(`Error updating script registry: ${error.message}`);
    return false;
  }
};

// Main execution function
const main = async () => {
  console.log('Starting final Next.js configuration fix');
  
  // Create backup
  const backupCreated = createBackup(nextConfigPath, backupPath);
  if (!backupCreated) {
    console.error('Failed to create backup. Aborting.');
    return;
  }
  
  // Rewrite configuration
  const configRewritten = await rewriteConfig();
  if (!configRewritten) {
    console.error('Failed to rewrite Next.js configuration. Check the error above.');
    return;
  }
  
  // Update script registry
  updateScriptRegistry();
  
  console.log('Next.js configuration fix completed successfully');
  console.log('Please restart your Next.js development server to apply the changes');
  console.log('Run: cd ' + frontendRoot + ' && pnpm run dev:https');
};

// Execute the script
main().catch(error => {
  console.error('Script execution failed:', error);
}); 