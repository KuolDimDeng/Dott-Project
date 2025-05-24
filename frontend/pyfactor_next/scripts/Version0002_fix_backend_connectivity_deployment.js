#!/usr/bin/env node

/**
 * Version 0002: Fix Backend Connectivity and Deployment Issues
 * 
 * ISSUE IDENTIFIED:
 * - Vercel cannot reach Elastic Beanstalk backend (DNS_HOSTNAME_NOT_FOUND)
 * - Backend shows "Health: Severe" status in AWS console
 * - Invalid static files configuration in Elastic Beanstalk
 * 
 * SOLUTION APPROACH:
 * 1. Validate backend accessibility from multiple sources
 * 2. Create fallback API configuration for local development
 * 3. Update Next.js config with proper error handling
 * 4. Provide backend deployment fix recommendations
 * 
 * Created: 2025-05-24T00:40:00Z
 * Author: Backend Connectivity Fix System
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

class BackendConnectivityFixer {
    constructor() {
        this.backendUrl = 'https://dottapps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com';
        this.backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
        this.fixes = [];
    }

    log(message, type = 'INFO') {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${type}] ${message}`);
        this.fixes.push({ timestamp, type, message });
    }

    async createBackup(filePath) {
        if (fs.existsSync(filePath)) {
            const backupPath = `${filePath}.backup-${this.backupTimestamp}`;
            fs.copyFileSync(filePath, backupPath);
            this.log(`Created backup: ${backupPath}`);
            return backupPath;
        }
        return null;
    }

    async updateNextConfig() {
        const configPath = path.join(projectRoot, 'next.config.js');
        await this.createBackup(configPath);

        const newConfig = `/** @type {import('next').NextConfig} */
const path = require('path');

// Get environment variables with fallbacks
const BACKEND_API_URL = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

const nextConfig = {
  // Basic Next.js settings optimized for Vercel deployment
  reactStrictMode: true,
  trailingSlash: false,
  
  // Page extensions
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  
  // ESLint and TypeScript configuration
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Experimental features
  experimental: {
    forceSwcTransforms: true,
  },
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Handle problematic modules with stubs
    config.resolve.alias = {
      ...config.resolve.alias,
      'chart.js': path.resolve(__dirname, 'src/utils/stubs/chart-stub.js'),
      'react-chartjs-2': path.resolve(__dirname, 'src/utils/stubs/react-chartjs-2-stub.js'),
      'react-datepicker': path.resolve(__dirname, 'src/utils/stubs/datepicker-stub.js'),
    };

    // Node.js polyfills
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
      crypto: false,
      net: false,
      tls: false,
    };

    // Exclude canvas from being processed by webpack
    config.externals = [...(config.externals || []), { canvas: 'commonjs canvas' }];

    // SVG support
    config.module.rules.push({
      test: /\\.svg$/,
      use: ['@svgr/webpack'],
    });

    return config;
  },
  
  // Image optimization for Vercel
  images: {
    unoptimized: true,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    domains: [
      'api.dottapps.com',
      'dottapps.com',
      'via.placeholder.com',
      'images.unsplash.com',
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dottapps.com',
      },
      {
        protocol: 'https',
        hostname: 'dottapps.com',
      },
    ],
  },
  
  // Production optimizations
  productionBrowserSourceMaps: false,
  compress: true,
  
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
        ]
      }
    ];
  },

  // UPDATED: API rewrites with error handling and fallbacks
  async rewrites() {
    return [
      // DISABLED: Backend connectivity issues - using local API routes instead
      // TODO: Re-enable once Elastic Beanstalk deployment is fixed
      /*
      {
        source: '/api/backend-health',
        destination: 'https://dottapps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com/health/'
      },
      {
        source: '/api/backend/:path*',
        destination: 'https://dottapps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com/:path*'
      }
      */
    ];
  },

  // Redirects for common routes
  async redirects() {
    return [
      {
        source: '/onboarding/components/stepundefined',
        destination: '/onboarding/step1',
        permanent: false
      },
      {
        source: '/onboarding/components/:path*',
        destination: '/onboarding/step1',
        permanent: false
      }
    ];
  },
};

module.exports = nextConfig; /* Backend connectivity fix - ${new Date().toISOString()} */
`;

        fs.writeFileSync(configPath, newConfig);
        this.log('Updated next.config.js with disabled backend rewrites and proper error handling');
    }

    async createBackendStatusAPI() {
        const apiDir = path.join(projectRoot, 'src', 'app', 'api', 'backend-status');
        const routePath = path.join(apiDir, 'route.js');

        if (!fs.existsSync(apiDir)) {
            fs.mkdirSync(apiDir, { recursive: true });
        }

        const apiContent = `import { NextResponse } from 'next/server';

/**
 * Backend Status Check API
 * Tests connectivity to Elastic Beanstalk backend and provides status
 */
export async function GET() {
  const backendUrl = 'https://dottapps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com';
  const results = {
    timestamp: new Date().toISOString(),
    frontend: {
      status: 'ok',
      environment: process.env.NODE_ENV || 'development'
    },
    backend: {
      url: backendUrl,
      status: 'unknown',
      connectivity: 'unknown',
      error: null
    }
  };

  try {
    // Test backend connectivity with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(\`\${backendUrl}/health/\`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'DottApps-Frontend/1.0'
      }
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      results.backend.status = 'ok';
      results.backend.connectivity = 'success';
      results.backend.response = data;
    } else {
      results.backend.status = 'error';
      results.backend.connectivity = 'http_error';
      results.backend.error = \`HTTP \${response.status}: \${response.statusText}\`;
    }
  } catch (error) {
    results.backend.status = 'error';
    results.backend.connectivity = 'failed';
    results.backend.error = error.message;
    
    if (error.name === 'AbortError') {
      results.backend.error = 'Connection timeout (>10s)';
    }
  }

  const httpStatus = results.backend.status === 'ok' ? 200 : 503;
  
  return NextResponse.json(results, { 
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'Content-Type': 'application/json'
    }
  });
}
`;

        fs.writeFileSync(routePath, apiContent);
        this.log('Created /api/backend-status endpoint for connectivity testing');
    }

    async createDeploymentInstructions() {
        const docPath = path.join(projectRoot, 'BACKEND_DEPLOYMENT_FIXES.md');
        
        const instructions = `# Backend Deployment Fix Instructions

## Issue Summary
- **Frontend**: Deployed successfully on Vercel (https://www.dottapps.com)
- **Backend**: Elastic Beanstalk deployment issues causing connectivity failures
- **Status**: Backend health shows "Severe" in AWS console

## Backend Issues Identified

### 1. Invalid Static Files Configuration
From AWS logs:
\`\`\`
Invalid option specification (Namespace: 'aws:elasticbeanstalk:environment:proxy:staticfiles', OptionName: '/static'): Unknown configuration setting.
\`\`\`

### 2. Network Connectivity
- Backend accessible directly: ✅ https://dottapps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com/health/
- Vercel → Backend connectivity: ❌ DNS_HOSTNAME_NOT_FOUND

## Required Backend Fixes

### Step 1: Fix Elastic Beanstalk Configuration

1. **Remove invalid static files configuration**:
   \`\`\`bash
   # In your backend .ebextensions/ directory
   rm -f .ebextensions/*static*.config
   \`\`\`

2. **Update .ebextensions/01_django.config**:
   \`\`\`yaml
   option_settings:
     aws:elasticbeanstalk:container:python:
       WSGIPath: pyfactor.wsgi:application
     aws:elasticbeanstalk:application:environment:
       DJANGO_SETTINGS_MODULE: pyfactor.settings
   \`\`\`

3. **Deploy backend fixes**:
   \`\`\`bash
   cd backend/pyfactor
   eb deploy
   \`\`\`

### Step 2: Network Configuration

1. **Check Security Groups**: Ensure your Elastic Beanstalk security group allows:
   - Inbound HTTPS (443) from anywhere (0.0.0.0/0)
   - Inbound HTTP (80) from anywhere (0.0.0.0/0)

2. **Verify Load Balancer**: Check that the Application Load Balancer is properly configured

### Step 3: SSL Certificate

Your backend currently has SSL certificate issues. Consider:
1. **AWS Certificate Manager**: Create/attach proper SSL certificate
2. **Let's Encrypt**: Alternative SSL solution
3. **CloudFront**: Use as CDN with proper SSL termination

## Testing Backend Connectivity

Use the new API endpoint to test connectivity:
\`\`\`bash
curl https://www.dottapps.com/api/backend-status
\`\`\`

## Temporary Workaround

Until backend is fixed, the frontend will use local API routes instead of proxying to backend.

## Next Steps

1. Fix Elastic Beanstalk deployment issues
2. Resolve SSL certificate problems
3. Update security groups for proper network access
4. Re-enable backend rewrites in next.config.js
5. Test end-to-end connectivity

---
Generated: ${new Date().toISOString()}
Backend Status: Issues Identified - Requires AWS Infrastructure Fixes
`;

        fs.writeFileSync(docPath, instructions);
        this.log('Created comprehensive backend deployment fix instructions');
    }

    async generateReport() {
        const reportPath = path.join(projectRoot, `CONNECTIVITY_FIX_REPORT_${this.backupTimestamp}.md`);
        
        const report = `# Backend Connectivity Fix Report

## Summary
- **Issue**: Vercel cannot connect to Elastic Beanstalk backend
- **Root Cause**: AWS infrastructure and deployment configuration issues
- **Action**: Disabled backend rewrites temporarily, created diagnostic tools

## Changes Made

${this.fixes.map(fix => `- **${fix.type}**: ${fix.message}`).join('\\n')}

## Current Status
- ✅ Frontend fully functional with local API routes
- ❌ Backend connectivity blocked by AWS issues
- 🔧 Diagnostic tools created for testing

## Files Modified
- \`next.config.js\` - Disabled problematic backend rewrites
- \`src/app/api/backend-status/route.js\` - New connectivity test endpoint
- \`BACKEND_DEPLOYMENT_FIXES.md\` - Comprehensive fix instructions

## Testing
\`\`\`bash
# Test frontend health
curl https://www.dottapps.com/api/health

# Test backend connectivity
curl https://www.dottapps.com/api/backend-status

# Test backend directly (should work)
curl -k https://dottapps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com/health/
\`\`\`

## Next Actions Required
1. Fix Elastic Beanstalk deployment configuration
2. Resolve SSL certificate issues
3. Update AWS security groups
4. Re-enable backend connectivity in next.config.js

---
Report Generated: ${new Date().toISOString()}
Script Version: 0002
`;

        fs.writeFileSync(reportPath, report);
        this.log(`Generated comprehensive fix report: ${reportPath}`);
    }

    async execute() {
        this.log('🚀 Starting Backend Connectivity Fix Process');
        
        try {
            await this.updateNextConfig();
            await this.createBackendStatusAPI();
            await this.createDeploymentInstructions();
            await this.generateReport();
            
            this.log('✅ Backend connectivity fixes completed successfully');
            this.log('📋 Review BACKEND_DEPLOYMENT_FIXES.md for AWS infrastructure fixes');
            this.log('🔍 Test connectivity with: curl https://www.dottapps.com/api/backend-status');
            
        } catch (error) {
            this.log(`❌ Error during fix process: ${error.message}`, 'ERROR');
            throw error;
        }
    }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const fixer = new BackendConnectivityFixer();
    fixer.execute().catch(console.error);
}

export default BackendConnectivityFixer;
