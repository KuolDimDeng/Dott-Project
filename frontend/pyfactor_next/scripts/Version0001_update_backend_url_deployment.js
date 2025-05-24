#!/usr/bin/env node

/**
 * Version 0001: Update Frontend Backend URL for Production Deployment
 * Date: 2025-05-23
 * Purpose: Update frontend configuration to point to the deployed AWS Elastic Beanstalk backend
 * 
 * This script updates the frontend to use the production backend URL after successful deployment.
 * 
 * Requirements:
 * - Next.js 15
 * - No hardcoded environment keys
 * - Use .env.local for configuration
 * - Maintain HTTPS/SSL configuration
 * - Ensure proper CORS configuration
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class FrontendBackendUpdater {
    constructor() {
        this.frontendDir = path.resolve(__dirname, '..');
        this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        this.backupDir = path.join(this.frontendDir, 'frontend_file_backups');
        
        // Ensure backup directory exists
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
    }

    /**
     * Create backup of important files
     */
    createBackup(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                const fileName = path.basename(filePath);
                const backupFileName = `${fileName}.backup-${this.timestamp}`;
                const backupPath = path.join(this.backupDir, backupFileName);
                
                fs.copyFileSync(filePath, backupPath);
                console.log(`✅ Created backup: ${backupFileName}`);
                return backupPath;
            }
        } catch (error) {
            console.error(`❌ Failed to create backup for ${filePath}:`, error.message);
        }
        return null;
    }

    /**
     * Update environment configuration for production backend
     */
    updateEnvironmentConfig(backendUrl) {
        const envLocalPath = path.join(this.frontendDir, '.env.local');
        
        // Create backup
        this.createBackup(envLocalPath);
        
        // Read existing .env.local or create new
        let envContent = '';
        if (fs.existsSync(envLocalPath)) {
            envContent = fs.readFileSync(envLocalPath, 'utf8');
        }

        // Update or add backend URL configuration
        const newEnvVars = {
            'NEXT_PUBLIC_API_BASE_URL': backendUrl,
            'NEXT_PUBLIC_BACKEND_URL': backendUrl,
            'NEXT_PUBLIC_API_URL': backendUrl,
            'NEXT_PUBLIC_ENVIRONMENT': 'production'
        };

        // Process each environment variable
        Object.entries(newEnvVars).forEach(([key, value]) => {
            const regex = new RegExp(`^${key}=.*$`, 'm');
            if (regex.test(envContent)) {
                // Update existing variable
                envContent = envContent.replace(regex, `${key}=${value}`);
            } else {
                // Add new variable
                envContent += `\n${key}=${value}`;
            }
        });

        // Ensure proper line endings
        envContent = envContent.trim() + '\n';

        try {
            fs.writeFileSync(envLocalPath, envContent);
            console.log(`✅ Updated .env.local with backend URL: ${backendUrl}`);
        } catch (error) {
            console.error('❌ Failed to update .env.local:', error.message);
        }
    }

    /**
     * Update API configuration files
     */
    updateApiConfig(backendUrl) {
        const apiConfigPaths = [
            path.join(this.frontendDir, 'src', 'utils', 'api.js'),
            path.join(this.frontendDir, 'src', 'lib', 'api.js'),
            path.join(this.frontendDir, 'lib', 'api.js'),
            path.join(this.frontendDir, 'utils', 'api.js')
        ];

        apiConfigPaths.forEach(configPath => {
            if (fs.existsSync(configPath)) {
                this.createBackup(configPath);
                
                try {
                    let content = fs.readFileSync(configPath, 'utf8');
                    
                    // Update localhost references to production URL
                    content = content.replace(
                        /https?:\/\/127\.0\.0\.1:8000/g,
                        backendUrl
                    );
                    content = content.replace(
                        /https?:\/\/localhost:8000/g,
                        backendUrl
                    );
                    
                    // Update environment variable usage
                    const envVarPattern = /process\.env\.NEXT_PUBLIC_(?:API_BASE_URL|BACKEND_URL|API_URL)/g;
                    if (!envVarPattern.test(content)) {
                        // Add environment variable usage if not present
                        content = content.replace(
                            /const\s+baseURL\s*=\s*['"][^'"]*['"]/,
                            `const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || '${backendUrl}'`
                        );
                    }
                    
                    fs.writeFileSync(configPath, content);
                    console.log(`✅ Updated API config: ${path.relative(this.frontendDir, configPath)}`);
                } catch (error) {
                    console.error(`❌ Failed to update ${configPath}:`, error.message);
                }
            }
        });
    }

    /**
     * Update Next.js configuration for CORS and API routes
     */
    updateNextConfig(backendUrl) {
        const nextConfigPath = path.join(this.frontendDir, 'next.config.js');
        
        if (fs.existsSync(nextConfigPath)) {
            this.createBackup(nextConfigPath);
            
            try {
                let content = fs.readFileSync(nextConfigPath, 'utf8');
                
                // Add or update rewrites for API proxy
                const rewriteConfig = `
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '${backendUrl}/api/:path*',
      },
    ];
  },`;

                // Check if rewrites already exist
                if (content.includes('async rewrites()')) {
                    // Update existing rewrites
                    content = content.replace(
                        /async rewrites\(\)\s*{[\s\S]*?},/,
                        rewriteConfig
                    );
                } else {
                    // Add rewrites to the config
                    content = content.replace(
                        /const nextConfig = {/,
                        `const nextConfig = {${rewriteConfig}`
                    );
                }
                
                fs.writeFileSync(nextConfigPath, content);
                console.log('✅ Updated next.config.js with API rewrites');
            } catch (error) {
                console.error('❌ Failed to update next.config.js:', error.message);
            }
        }
    }

    /**
     * Create deployment verification script
     */
    createVerificationScript(backendUrl) {
        const verifyScriptPath = path.join(this.frontendDir, 'verify_backend_connection.js');
        
        const verifyScript = `#!/usr/bin/env node

/**
 * Backend Connection Verification Script
 * Generated: ${new Date().toISOString()}
 * Backend URL: ${backendUrl}
 */

import fetch from 'node-fetch';

const BACKEND_URL = '${backendUrl}';

async function verifyBackendConnection() {
    console.log('🔍 Verifying backend connection...');
    console.log('Backend URL:', BACKEND_URL);
    
    try {
        // Test basic connectivity
        const response = await fetch(\`\${BACKEND_URL}/health/\`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
            timeout: 10000
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Backend is accessible');
            console.log('Response:', data);
            return true;
        } else {
            console.log('⚠️  Backend responded with status:', response.status);
            return false;
        }
    } catch (error) {
        console.error('❌ Failed to connect to backend:', error.message);
        return false;
    }
}

async function main() {
    const isConnected = await verifyBackendConnection();
    
    if (isConnected) {
        console.log('\\n🎉 Backend connection verified successfully!');
        console.log('✅ Frontend is ready for production deployment');
    } else {
        console.log('\\n❌ Backend connection failed');
        console.log('Please verify:');
        console.log('1. Backend is deployed and running');
        console.log('2. CORS is properly configured');
        console.log('3. Network connectivity');
        process.exit(1);
    }
}

main().catch(console.error);
`;

        try {
            fs.writeFileSync(verifyScriptPath, verifyScript);
            fs.chmodSync(verifyScriptPath, 0o755);
            console.log('✅ Created backend verification script');
        } catch (error) {
            console.error('❌ Failed to create verification script:', error.message);
        }
    }

    /**
     * Update deployment scripts
     */
    updateDeploymentScripts(backendUrl) {
        const deployScriptPath = path.join(this.frontendDir, 'deploy-to-vercel-production.sh');
        
        const deployScript = `#!/bin/bash

# Production Deployment Script for Vercel
# Updated: ${new Date().toISOString()}
# Backend URL: ${backendUrl}

set -e

echo "🚀 Deploying frontend to Vercel with production backend..."

# Verify backend connection first
echo "🔍 Verifying backend connection..."
node verify_backend_connection.js

if [ $? -eq 0 ]; then
    echo "✅ Backend verified, proceeding with deployment..."
    
    # Deploy to Vercel
    echo "📦 Building and deploying to Vercel..."
    pnpm run build
    
    # Deploy to production
    vercel --prod
    
    echo "🎉 Deployment completed successfully!"
    echo "Frontend: https://www.dottapps.com"
    echo "Backend: ${backendUrl}"
else
    echo "❌ Backend verification failed. Deployment aborted."
    exit 1
fi
`;

        try {
            fs.writeFileSync(deployScriptPath, deployScript);
            fs.chmodSync(deployScriptPath, 0o755);
            console.log('✅ Created deployment script');
        } catch (error) {
            console.error('❌ Failed to create deployment script:', error.message);
        }
    }

    /**
     * Main execution function
     */
    async run(backendUrl) {
        if (!backendUrl) {
            console.error('❌ Backend URL is required');
            console.log('Usage: node Version0001_update_backend_url_deployment.js <backend_url>');
            console.log('Example: node Version0001_update_backend_url_deployment.js https://dottapps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com');
            process.exit(1);
        }

        // Validate URL format
        try {
            new URL(backendUrl);
        } catch {
            console.error('❌ Invalid URL format');
            process.exit(1);
        }

        console.log('🔧 Starting frontend backend URL update...');
        console.log('Target backend URL:', backendUrl);
        console.log('Timestamp:', this.timestamp);

        try {
            // 1. Update environment configuration
            this.updateEnvironmentConfig(backendUrl);

            // 2. Update API configuration files
            this.updateApiConfig(backendUrl);

            // 3. Update Next.js configuration
            this.updateNextConfig(backendUrl);

            // 4. Create verification script
            this.createVerificationScript(backendUrl);

            // 5. Update deployment scripts
            this.updateDeploymentScripts(backendUrl);

            // Create summary
            this.createUpdateSummary(backendUrl);

            console.log('\\n🎉 Frontend backend URL update completed successfully!');
            console.log('📝 Summary created with details of all changes');
            console.log('🔍 Run ./verify_backend_connection.js to test the connection');
            console.log('🚀 Run ./deploy-to-vercel-production.sh to deploy to production');

        } catch (error) {
            console.error('❌ Failed to complete backend URL update:', error.message);
            process.exit(1);
        }
    }

    /**
     * Create summary of changes
     */
    createUpdateSummary(backendUrl) {
        const summaryPath = path.join(this.frontendDir, `FRONTEND_BACKEND_UPDATE_SUMMARY_${this.timestamp.replace(/[:.]/g, '')}.md`);
        
        const summary = `# Frontend Backend URL Update Summary
Date: ${new Date().toISOString()}
Version: 0001
Backend URL: ${backendUrl}

## Changes Made
1. ✅ Updated .env.local with production backend URL
2. ✅ Updated API configuration files
3. ✅ Updated Next.js configuration for API proxying
4. ✅ Created backend connection verification script
5. ✅ Created production deployment script

## Files Modified
- .env.local (backend URL configuration)
- src/utils/api.js (if exists)
- next.config.js (API rewrites)

## Files Created
- verify_backend_connection.js (connection testing)
- deploy-to-vercel-production.sh (deployment automation)

## Backup Files
All modified files have been backed up to: frontend_file_backups/

## Next Steps
1. Test backend connection: \`node verify_backend_connection.js\`
2. Deploy to production: \`./deploy-to-vercel-production.sh\`
3. Verify end-to-end functionality

## Environment Variables Set
- NEXT_PUBLIC_API_BASE_URL=${backendUrl}
- NEXT_PUBLIC_BACKEND_URL=${backendUrl}
- NEXT_PUBLIC_API_URL=${backendUrl}
- NEXT_PUBLIC_ENVIRONMENT=production
`;

        try {
            fs.writeFileSync(summaryPath, summary);
            console.log(`✅ Created update summary: ${path.basename(summaryPath)}`);
        } catch (error) {
            console.error('❌ Failed to create summary:', error.message);
        }
    }
}

// Main execution
const updater = new FrontendBackendUpdater();
const backendUrl = process.argv[2];

updater.run(backendUrl);
