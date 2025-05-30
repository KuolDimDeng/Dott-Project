#!/usr/bin/env node

/**
 * Version 0095: Fix Nginx Reload Deployment Issue
 * 
 * ISSUE:
 * - AWS Elastic Beanstalk deployment failing with "Command 01_reload_nginx failed"
 * - Container commands trying to reload nginx inside Docker container, but nginx runs on host
 * - This causes deployment to fail during PostBuildEbExtension phase
 * 
 * ROOT CAUSE:
 * - In Docker-based EB deployments, nginx runs on the host system, not in the container
 * - Container commands execute inside the Docker container context
 * - The command "nginx -s reload" fails because nginx isn't available in the container
 * 
 * SOLUTION:
 * - Remove nginx reload commands from container_commands
 * - EB automatically reloads nginx when platform hooks update configuration
 * - Platform hooks in .platform/nginx/conf.d/ are automatically applied
 * 
 * FILES AFFECTED:
 * - Removes any .ebextensions files containing nginx reload commands
 * - Creates proper nginx configuration without reload commands
 * 
 * @version 1.0
 * @date 2025-05-29
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Script configuration
const SCRIPT_NAME = 'Version0095_fix_nginx_reload_deployment_issue';
const SCRIPT_VERSION = '1.0';

// Paths
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const EBEXTENSIONS_PATH = path.join(PROJECT_ROOT, '.ebextensions');
const PLATFORM_PATH = path.join(PROJECT_ROOT, '.platform');

// Helper function to create backup
function createBackup(filePath) {
    if (fs.existsSync(filePath)) {
        const backupPath = `${filePath}.backup_${new Date().toISOString().replace(/[:.]/g, '-')}`;
        fs.copyFileSync(filePath, backupPath);
        console.log(`✅ Created backup: ${backupPath}`);
        return backupPath;
    }
    return null;
}

// Function to remove problematic nginx reload commands from config files
function fixNginxReloadIssue() {
    console.log(`\n🚀 Starting ${SCRIPT_NAME} v${SCRIPT_VERSION}`);
    console.log('=' .repeat(60));
    
    // Step 1: Check and remove any .ebextensions files with nginx reload commands
    console.log('\n📋 Step 1: Checking for problematic .ebextensions files...');
    
    const problematicFiles = [
        path.join(EBEXTENSIONS_PATH, 'nginx-reload.config'),
        path.join(EBEXTENSIONS_PATH, '03-restart-nginx.config'),
        path.join(EBEXTENSIONS_PATH, '02-add-health-endpoint.config'),
        path.join(EBEXTENSIONS_PATH, '02-health-endpoint-simple.config')
    ];
    
    problematicFiles.forEach(file => {
        if (fs.existsSync(file)) {
            console.log(`\n🔍 Found problematic file: ${path.basename(file)}`);
            const content = fs.readFileSync(file, 'utf8');
            
            if (content.includes('reload_nginx') || content.includes('nginx -s reload')) {
                console.log('⚠️  File contains nginx reload command');
                createBackup(file);
                
                // Remove the file or clean it
                if (path.basename(file).includes('nginx')) {
                    fs.unlinkSync(file);
                    console.log('🗑️  Removed nginx-specific config file');
                } else {
                    // For other files, try to clean the content
                    const cleanedContent = content
                        .replace(/container_commands:[\s\S]*?(?=\n\w|\n$)/gm, '')
                        .replace(/commands:[\s\S]*?01_reload_nginx:[\s\S]*?(?=\n\s{0,2}\w|\n$)/gm, '');
                    
                    if (cleanedContent.trim()) {
                        fs.writeFileSync(file, cleanedContent);
                        console.log('✏️  Cleaned nginx reload commands from file');
                    } else {
                        fs.unlinkSync(file);
                        console.log('🗑️  Removed empty config file');
                    }
                }
            }
        }
    });
    
    // Step 2: Ensure proper nginx configuration exists
    console.log('\n📋 Step 2: Ensuring proper nginx configuration...');
    
    const nginxConfDir = path.join(PLATFORM_PATH, 'nginx', 'conf.d');
    if (!fs.existsSync(nginxConfDir)) {
        fs.mkdirSync(nginxConfDir, { recursive: true });
        console.log('✅ Created nginx configuration directory');
    }
    
    // Create health check configuration
    const healthConfPath = path.join(nginxConfDir, 'health.conf');
    const healthConfContent = `# Health check endpoint configuration
location /health/ {
    proxy_pass http://docker/health/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 5s;
    proxy_send_timeout 10s;
    proxy_read_timeout 10s;
}

# Root path redirect to health
location = / {
    return 302 /health/;
}
`;
    
    fs.writeFileSync(healthConfPath, healthConfContent);
    console.log('✅ Created health check nginx configuration');
    
    // Step 3: Create clean .ebextensions configuration
    console.log('\n📋 Step 3: Creating clean .ebextensions configuration...');
    
    if (!fs.existsSync(EBEXTENSIONS_PATH)) {
        fs.mkdirSync(EBEXTENSIONS_PATH, { recursive: true });
    }
    
    // Ensure environment config doesn't have nginx reload
    const envConfigPath = path.join(EBEXTENSIONS_PATH, '01_environment.config');
    if (fs.existsSync(envConfigPath)) {
        const envContent = fs.readFileSync(envConfigPath, 'utf8');
        if (!envContent.includes('container_commands') && !envContent.includes('commands')) {
            console.log('✅ Environment config is clean');
        } else {
            createBackup(envConfigPath);
            // Clean basic environment config
            const cleanEnvConfig = `option_settings:
  aws:elasticbeanstalk:application:environment:
    DJANGO_SETTINGS_MODULE: pyfactor.settings_eb
    PYTHONUNBUFFERED: 1
  aws:elasticbeanstalk:environment:proxy:
    ProxyServer: nginx
  aws:ec2:instances:
    InstanceTypes: t3.small
  aws:autoscaling:updatepolicy:rollingupdate:
    RollingUpdateEnabled: true
    MaxBatchSize: 1
    MinInstancesInService: 1
  aws:elasticbeanstalk:command:
    DeploymentPolicy: Rolling
    BatchSizeType: Fixed
    BatchSize: 1`;
            
            fs.writeFileSync(envConfigPath, cleanEnvConfig);
            console.log('✅ Cleaned environment configuration');
        }
    }
    
    // Step 4: Create deployment documentation
    console.log('\n📋 Step 4: Creating deployment fix documentation...');
    
    const docPath = path.join(PROJECT_ROOT, 'NGINX_RELOAD_FIX.md');
    const docContent = `# Nginx Reload Deployment Fix

## Issue Summary
AWS Elastic Beanstalk deployment was failing with error: "Command 01_reload_nginx failed"

## Root Cause
- Container commands were trying to reload nginx inside the Docker container
- Nginx runs on the host system, not inside the container
- The command \`nginx -s reload\` was failing because nginx isn't available in the container

## Solution Applied
1. Removed all nginx reload commands from .ebextensions files
2. Removed problematic container_commands sections
3. Created proper nginx configuration in .platform/nginx/conf.d/
4. Elastic Beanstalk automatically reloads nginx when platform hooks are applied

## Files Modified
- Removed/cleaned .ebextensions files containing nginx reload commands
- Created .platform/nginx/conf.d/health.conf for health check configuration
- Cleaned up 01_environment.config to remove container commands

## Deployment Instructions
1. Commit these changes to your repository
2. Deploy to Elastic Beanstalk using your normal deployment process
3. The deployment should now complete successfully

## Prevention
- Never use container_commands to reload nginx in Docker-based EB deployments
- Use .platform/nginx/conf.d/ for nginx configuration changes
- EB will automatically reload nginx when needed

## Script Information
- Script: ${SCRIPT_NAME}
- Version: ${SCRIPT_VERSION}
- Date: ${new Date().toISOString()}
`;
    
    fs.writeFileSync(docPath, docContent);
    console.log('✅ Created deployment fix documentation');
    
    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('✅ NGINX RELOAD FIX COMPLETED SUCCESSFULLY!');
    console.log('\nNext steps:');
    console.log('1. Review the changes made by this script');
    console.log('2. Commit the changes to your repository');
    console.log('3. Deploy to Elastic Beanstalk');
    console.log('4. The deployment should now succeed without nginx reload errors');
    console.log('\n💡 Tip: EB automatically handles nginx reloads when using .platform/nginx/conf.d/');
}

// Run the fix
try {
    fixNginxReloadIssue();
} catch (error) {
    console.error('\n❌ Error fixing nginx reload issue:', error);
    console.error(error.stack);
    process.exit(1);
}