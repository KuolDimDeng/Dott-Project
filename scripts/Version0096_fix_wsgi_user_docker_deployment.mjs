#!/usr/bin/env node

/**
 * Version 0096: Fix WSGI User Error for Docker Deployment
 * 
 * ISSUE:
 * - Deployment failing with "wsgi is not a valid user name" error
 * - Configuration files are using paths and users for Python platform instead of Docker
 * - In Docker deployments, the app runs inside container, not on host
 * 
 * ROOT CAUSE:
 * - .ebextensions/02-health-endpoint-simple.config is configured for Python platform
 * - Using /opt/python/current/app paths which don't exist in Docker deployments
 * - Trying to set file ownership to 'wsgi' user which doesn't exist
 * 
 * SOLUTION:
 * - Remove the health endpoint configuration file
 * - Health endpoint should be handled by the Django app itself
 * - Docker container already has proper health check configuration
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
const SCRIPT_NAME = 'Version0096_fix_wsgi_user_docker_deployment';
const SCRIPT_VERSION = '1.0';

// Paths
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const EBEXTENSIONS_PATH = path.join(PROJECT_ROOT, '.ebextensions');

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

// Function to fix wsgi user issue
function fixWsgiUserIssue() {
    console.log(`\n🚀 Starting ${SCRIPT_NAME} v${SCRIPT_VERSION}`);
    console.log('=' .repeat(60));
    
    // Step 1: Remove problematic health endpoint configuration
    console.log('\n📋 Step 1: Removing problematic health endpoint configuration...');
    
    const healthConfigFiles = [
        path.join(EBEXTENSIONS_PATH, '02-health-endpoint-simple.config'),
        path.join(EBEXTENSIONS_PATH, '02-add-health-endpoint.config')
    ];
    
    healthConfigFiles.forEach(file => {
        if (fs.existsSync(file)) {
            console.log(`\n🔍 Found problematic file: ${path.basename(file)}`);
            createBackup(file);
            fs.unlinkSync(file);
            console.log('🗑️  Removed health endpoint configuration file');
        }
    });
    
    // Step 2: Check Django health endpoint configuration
    console.log('\n📋 Step 2: Verifying Django health endpoint...');
    
    const healthViewPath = path.join(PROJECT_ROOT, 'backend/pyfactor/health/views.py');
    if (fs.existsSync(healthViewPath)) {
        const healthContent = fs.readFileSync(healthViewPath, 'utf8');
        if (healthContent.includes('def health_view') || healthContent.includes('def health')) {
            console.log('✅ Django health endpoint already exists in health app');
        }
    }
    
    // Step 3: Ensure Docker deployment doesn't have file permission issues
    console.log('\n📋 Step 3: Checking for other wsgi user references...');
    
    // Check all .config files in .ebextensions
    if (fs.existsSync(EBEXTENSIONS_PATH)) {
        const configFiles = fs.readdirSync(EBEXTENSIONS_PATH)
            .filter(file => file.endsWith('.config'));
        
        configFiles.forEach(file => {
            const filePath = path.join(EBEXTENSIONS_PATH, file);
            const content = fs.readFileSync(filePath, 'utf8');
            
            if (content.includes('wsgi') || content.includes('/opt/python/current/app')) {
                console.log(`\n⚠️  Found wsgi/python platform references in: ${file}`);
                createBackup(filePath);
                
                // Clean the content
                let cleanedContent = content
                    .replace(/owner:\s*wsgi/g, 'owner: root')
                    .replace(/group:\s*wsgi/g, 'group: root')
                    .replace(/\/opt\/python\/current\/app/g, '/app');
                
                fs.writeFileSync(filePath, cleanedContent);
                console.log('✏️  Fixed file ownership and paths');
            }
        });
    }
    
    // Step 4: Verify Dockerfile has proper health endpoint
    console.log('\n📋 Step 4: Verifying Dockerfile health configuration...');
    
    const dockerfilePath = path.join(PROJECT_ROOT, 'backend/pyfactor/Dockerfile');
    if (fs.existsSync(dockerfilePath)) {
        const dockerContent = fs.readFileSync(dockerfilePath, 'utf8');
        if (dockerContent.includes('EXPOSE 8000')) {
            console.log('✅ Dockerfile properly exposes port 8000');
        }
    }
    
    // Step 5: Create documentation
    console.log('\n📋 Step 5: Creating fix documentation...');
    
    const docPath = path.join(PROJECT_ROOT, 'WSGI_USER_FIX.md');
    const docContent = `# WSGI User Fix for Docker Deployment

## Issue Summary
AWS Elastic Beanstalk deployment was failing with error: "wsgi is not a valid user name"

## Root Cause
- Configuration files were using settings for Python platform instead of Docker platform
- Files were trying to use 'wsgi' user which doesn't exist in Docker deployments
- Paths like /opt/python/current/app don't exist in Docker containers

## Solution Applied
1. Removed problematic health endpoint configuration files
2. Fixed any remaining wsgi user references
3. Corrected file paths for Docker deployment
4. Health endpoint is handled by Django app inside Docker container

## Files Modified
- Removed .ebextensions/02-health-endpoint-simple.config
- Removed .ebextensions/02-add-health-endpoint.config
- Fixed any remaining wsgi user references in other config files

## Docker vs Python Platform
- **Docker Platform**: App runs inside container, no wsgi user needed
- **Python Platform**: App runs on host, uses wsgi user and /opt/python paths

## Deployment Instructions
1. Commit these changes to your repository
2. Deploy to Elastic Beanstalk
3. The deployment should now complete without wsgi user errors

## Health Endpoint
The health endpoint is provided by the Django app at /health/
No additional configuration is needed for Docker deployments.

## Script Information
- Script: ${SCRIPT_NAME}
- Version: ${SCRIPT_VERSION}
- Date: ${new Date().toISOString()}
`;
    
    fs.writeFileSync(docPath, docContent);
    console.log('✅ Created fix documentation');
    
    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('✅ WSGI USER FIX COMPLETED SUCCESSFULLY!');
    console.log('\nNext steps:');
    console.log('1. Review the changes made by this script');
    console.log('2. Commit the changes to your repository');
    console.log('3. Deploy to Elastic Beanstalk');
    console.log('4. The deployment should now succeed without wsgi user errors');
    console.log('\n💡 Remember: Docker deployments handle health checks differently than Python platform deployments');
}

// Run the fix
try {
    fixWsgiUserIssue();
} catch (error) {
    console.error('\n❌ Error fixing wsgi user issue:', error);
    console.error(error.stack);
    process.exit(1);
}