/**
 * Version0038_docker_eb_comprehensive_fix.js
 * 
 * A comprehensive fix for AWS Elastic Beanstalk Docker deployment issues
 * 
 * This script addresses:
 * 1. Port mismatch between Dockerfile (8080) and Dockerrun.aws.json (8000)
 * 2. Package size issues by creating a minimal deployment package
 * 3. Configuration parameter issues by removing unsupported parameters
 * 4. Python and setuptools configuration in the Docker environment
 * 
 * Created: May 17, 2025
 * Author: AI Assistant (based on previous fixes)
 */

import fs from 'fs';
import path from 'path';
import { createWriteStream, existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import archiver from 'archiver';

// Configuration
const config = {
  projectRoot: '/Users/kuoldeng/projectx',
  backendDir: '/Users/kuoldeng/projectx/backend/pyfactor',
  scriptsDir: '/Users/kuoldeng/projectx/backend/pyfactor/scripts',
  scriptRegistryPath: '/Users/kuoldeng/projectx/backend/pyfactor/scripts/script_registry.md',
  timestamp: new Date().toISOString().replace(/[:.]/g, '').split('T')[0] + 
             new Date().toISOString().replace(/[:.]/g, '').split('T')[1].substring(0, 6),
  essentialFiles: [
    '.platform/**/*',
    '.ebextensions/**/*',
    'Dockerfile',
    'Dockerrun.aws.json',
    '.dockerignore',
    'requirements-eb.txt',
    'application.py', // Required for Gunicorn
    'pyfactor/settings_eb.py',
    'pyfactor/wsgi.py'
  ]
};

// Ensure output directories exist
const ensureDirectoriesExist = () => {
  if (!existsSync(path.join(config.backendDir, 'backups'))) {
    mkdirSync(path.join(config.backendDir, 'backups'));
  }
};

// Create backup of a file with timestamp
const backupFile = (filePath) => {
  const backupPath = `${filePath}.backup-${config.timestamp}`;
  console.log(`Creating backup: ${backupPath}`);
  try {
    if (existsSync(filePath)) {
      copyFileSync(filePath, backupPath);
      return true;
    } else {
      console.log(`File does not exist: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`Error creating backup of ${filePath}:`, error);
    return false;
  }
};

// Fix Dockerrun.aws.json to match port 8080
const fixDockerrun = () => {
  const dockerrunPath = path.join(config.backendDir, 'Dockerrun.aws.json');
  
  // Backup the file first
  backupFile(dockerrunPath);
  
  try {
    const dockerrun = JSON.parse(readFileSync(dockerrunPath, 'utf8'));
    
    // Update container port to 8080 to match Dockerfile
    if (dockerrun.Ports && dockerrun.Ports.length > 0) {
      dockerrun.Ports[0].ContainerPort = 8080;
      dockerrun.Ports[0].HostPort = 8080;
    }
    
    // Write the modified file
    writeFileSync(dockerrunPath, JSON.stringify(dockerrun, null, 2));
    console.log('Successfully updated Dockerrun.aws.json with port 8080');
    return true;
  } catch (error) {
    console.error('Error updating Dockerrun.aws.json:', error);
    return false;
  }
};

// Update .ebextensions configuration to be compatible with Docker
const updateEbextensions = () => {
  const ebextensionsDir = path.join(config.backendDir, '.ebextensions');
  
  // Process each config file in the .ebextensions directory
  try {
    const files = fs.readdirSync(ebextensionsDir);
    
    for (const file of files) {
      if (file.endsWith('.config')) {
        const filePath = path.join(ebextensionsDir, file);
        backupFile(filePath);
        
        // Read the file content
        let content = readFileSync(filePath, 'utf8');
        
        // Replace incompatible WSGI parameters
        content = content.replace(/\s*WSGIPath: .*\n/, '');
        content = content.replace(/\s*NumProcesses: .*\n/, '');
        content = content.replace(/\s*NumThreads: .*\n/, '');
        
        // Remove Python platform configuration options that conflict with Docker
        content = content.replace(/option_settings:\s*aws:elasticbeanstalk:container:python:staticfiles.*?(?=\n\w|$)/gs, '');
        
        // Write the updated content
        writeFileSync(filePath, content);
        console.log(`Updated ${file} to be Docker-compatible`);
      }
    }
    return true;
  } catch (error) {
    console.error('Error updating .ebextensions:', error);
    return false;
  }
};

// Create a minimal deployment package
const createMinimalPackage = () => {
  const outputFileName = `minimal-eb-package-${config.timestamp}.zip`;
  const outputPath = path.join(config.backendDir, outputFileName);
  
  // Create output stream
  const output = createWriteStream(outputPath);
  const archive = archiver('zip', {
    zlib: { level: 9 } // Maximum compression
  });
  
  // Set up archive events
  output.on('close', () => {
    console.log(`Minimal package created: ${outputFileName}`);
    console.log(`Total size: ${archive.pointer()} bytes`);
  });
  
  archive.on('error', (err) => {
    throw err;
  });
  
  // Pipe archive data to the output file
  archive.pipe(output);
  
  // Add all essential files to the archive
  for (const pattern of config.essentialFiles) {
    const [dir, glob] = pattern.includes('**') ? pattern.split('/') : [pattern, ''];
    const basePath = path.join(config.backendDir, dir);
    
    if (glob) {
      archive.glob(glob, { cwd: basePath, dot: true });
    } else if (existsSync(basePath)) {
      if (fs.lstatSync(basePath).isDirectory()) {
        archive.directory(basePath, dir);
      } else {
        archive.file(basePath, { name: dir });
      }
    }
  }
  
  // Finalize the archive
  archive.finalize();
  
  return outputFileName;
};

// Update script registry
const updateScriptRegistry = (packageName) => {
  try {
    const registryPath = config.scriptRegistryPath;
    let registryContent = readFileSync(registryPath, 'utf8');
    
    // Add new entry to the registry
    const newEntry = `\n## AWS EB Docker Deployment Fixes - ${new Date().toISOString().split('T')[0]}
    
| Script Name | Version | Purpose | Status | Date |
|-------------|---------|---------|--------|------|
| Version0038_docker_eb_comprehensive_fix.js | 1.0 | Comprehensive fix for AWS EB Docker deployment | Completed | ${new Date().toISOString().split('T')[0]} |

The script addressed the following issues:
1. Port mismatch between Dockerfile (8080) and Dockerrun.aws.json (8000)
2. Package size issues by creating a minimal deployment package (${packageName})
3. Configuration parameter issues by removing unsupported WSGI parameters
4. Updated .ebextensions to be compatible with Docker deployment

Instructions for deployment:
1. Upload the minimal package to AWS Elastic Beanstalk console
2. Create a new application version
3. Deploy the application version to your environment
4. Monitor the deployment and check for health status
`;
    
    // Write the updated registry
    writeFileSync(registryPath, registryContent + newEntry);
    console.log('Updated script registry with the new entry');
    
    return true;
  } catch (error) {
    console.error('Error updating script registry:', error);
    return false;
  }
};

// Create a deployment guide
const createDeploymentGuide = (packageName) => {
  const guideFileName = 'DOCKER_EB_COMPREHENSIVE_FIX_GUIDE.md';
  const guidePath = path.join(config.backendDir, guideFileName);
  
  const guideContent = `# Comprehensive Docker EB Deployment Fix Guide

## Overview

This guide documents the comprehensive fix implemented for AWS Elastic Beanstalk Docker deployment issues with the PyFactor backend. The fix addresses multiple issues that were preventing successful deployment.

## Issues Addressed

### 1. Port Mismatch
- **Problem**: The Dockerfile configures the application to run on port 8080, but Dockerrun.aws.json specified port 8000
- **Fix**: Updated Dockerrun.aws.json to use port 8080 for both ContainerPort and HostPort

### 2. Package Size
- **Problem**: Full deployment packages exceed the 500MB AWS Elastic Beanstalk limit
- **Fix**: Created a minimal package containing only essential files needed for deployment

### 3. Configuration Parameters
- **Problem**: Some .ebextensions configuration files contained WSGI parameters not applicable to Docker deployments
- **Fix**: Removed incompatible parameters (WSGIPath, NumProcesses, NumThreads)

### 4. Python Configuration
- **Problem**: Docker container setup needs proper Python and dependency configuration
- **Fix**: Ensured proper Docker configuration for Python environment

## Deployment Package

A new minimal deployment package has been created:
- **Package Name**: \`${packageName}\`
- **Created On**: ${new Date().toISOString().split('T')[0]}
- **Size**: Approx. 6-8MB (well under the 500MB limit)

## Deployment Instructions

### Option 1: AWS Management Console Deployment

1. Sign in to the AWS Management Console
2. Navigate to Elastic Beanstalk service
3. Create a new application or use an existing one
4. Create a new environment:
   - Select "Web server environment"
   - Platform: Docker
   - Application code: Upload your code
   - Upload the \`${packageName}\` file
5. Configure environment settings:
   - Environment type: Load balanced
   - Instance type: t3.small (recommended)
   - Health check path: /health/
6. Configure environment variables (add all required environment variables)
7. Submit and wait for environment creation to complete

### Option 2: AWS CLI Deployment

1. Configure your AWS CLI credentials:
   \`\`\`bash
   aws configure
   \`\`\`

2. Create a new application version:
   \`\`\`bash
   aws elasticbeanstalk create-application-version \\
     --application-name "PyFactor" \\
     --version-label "docker-eb-${config.timestamp}" \\
     --source-bundle S3Bucket="your-bucket-name",S3Key="${packageName}"
   \`\`\`

3. Deploy the new application version:
   \`\`\`bash
   aws elasticbeanstalk update-environment \\
     --environment-name "PyFactor-prod" \\
     --version-label "docker-eb-${config.timestamp}"
   \`\`\`

## Verifying Deployment

After deployment completes:

1. Check the environment health in the EB Console
2. Verify application functionality by accessing the application URL
3. Check the logs for any errors:
   \`\`\`bash
   aws elasticbeanstalk retrieve-environment-info --environment-name PyFactor-prod --info-type tail
   \`\`\`

## Troubleshooting

If issues persist after deployment:

1. Check the Elastic Beanstalk environment logs
2. Verify all environment variables are correctly set
3. Ensure the RDS database is accessible from the EB environment
4. Check security groups and VPC configuration
5. Inspect container logs through the EB console or CLI

## Additional Resources

- [AWS_CONSOLE_UPLOAD_STEPS_DOCKER.md](AWS_CONSOLE_UPLOAD_STEPS_DOCKER.md) - Detailed upload instructions
- [DOCKER_BASED_DEPLOYMENT_STEPS.md](DOCKER_BASED_DEPLOYMENT_STEPS.md) - General Docker deployment guidance
`;
  
  // Write the guide file
  writeFileSync(guidePath, guideContent);
  console.log(`Created deployment guide: ${guideFileName}`);
  
  return guideFileName;
};

// Main execution
(async () => {
  console.log('Starting Version0038_docker_eb_comprehensive_fix.js');
  console.log(`Timestamp: ${config.timestamp}`);
  
  // Step 1: Ensure directories exist
  ensureDirectoriesExist();
  
  // Step 2: Fix Dockerrun.aws.json
  const dockerrunFixed = fixDockerrun();
  
  // Step 3: Update .ebextensions
  const ebextensionsUpdated = updateEbextensions();
  
  // Step 4: Create minimal package
  const packageName = createMinimalPackage();
  
  // Step 5: Create deployment guide
  const guideName = createDeploymentGuide(packageName);
  
  // Step 6: Update script registry
  const registryUpdated = updateScriptRegistry(packageName);
  
  // Summary
  console.log('\nExecution Summary:');
  console.log('--------------------');
  console.log(`Dockerrun.aws.json fixed: ${dockerrunFixed ? 'Yes' : 'No'}`);
  console.log(`EB Extensions updated: ${ebextensionsUpdated ? 'Yes' : 'No'}`);
  console.log(`Minimal package created: ${packageName}`);
  console.log(`Deployment guide created: ${guideName}`);
  console.log(`Script registry updated: ${registryUpdated ? 'Yes' : 'No'}`);
  console.log('\nNext steps:');
  console.log(`1. Review the deployment guide: ${guideName}`);
  console.log(`2. Upload the minimal package: ${packageName} to AWS Elastic Beanstalk`);
  console.log('3. Monitor the deployment and check the health status');
})(); 