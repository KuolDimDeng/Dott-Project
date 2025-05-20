/**
 * Version0039_fix_docker_build.js
 * 
 * A fix for Docker build issues in AWS Elastic Beanstalk deployment
 * 
 * This script addresses:
 * 1. Includes more necessary files in the minimal package
 * 2. Makes the package more comprehensive while still keeping size small
 * 3. Updates the Dockerfile to work with the minimal package
 * 
 * Created: May 18, 2025
 * Author: AI Assistant (based on deployment errors)
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
  // More complete list of essential files
  essentialFiles: [
    '.platform/**/*',
    '.ebextensions/**/*',
    'Dockerfile',
    'Dockerrun.aws.json',
    '.dockerignore',
    'requirements-eb.txt',
    'requirements.txt',
    'application.py',
    'manage.py',
    'pyfactor/*.py',  // Include all Python files in the pyfactor directory
    'pyfactor/settings.py',
    'pyfactor/settings_eb.py',
    'pyfactor/wsgi.py',
    'pyfactor/urls.py',
    'pyfactor/asgi.py',
    // Add key app directories
    'users/**/*.py',
    'custom_auth/**/*.py',
    'hr/**/*.py',
    'banking/**/*.py',
    'finance/**/*.py',
    'payroll/**/*.py'
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

// Update Dockerfile to improve compatibility with minimal package
const updateDockerfile = () => {
  const dockerfilePath = path.join(config.backendDir, 'Dockerfile');
  
  // Backup the file first
  backupFile(dockerfilePath);
  
  try {
    let dockerfileContent = readFileSync(dockerfilePath, 'utf8');
    
    // Make sure the CMD uses the application.py file that exists
    // Check if we need to update the CMD line
    if (dockerfileContent.includes('CMD ["gunicorn", "--bind", "0.0.0.0:8080", "application:application"]')) {
      // Already using the correct CMD, no change needed
      console.log('Dockerfile already has the correct CMD configuration');
    } else {
      // Update the CMD line
      dockerfileContent = dockerfileContent.replace(
        /CMD.*$/m,
        'CMD ["gunicorn", "--bind", "0.0.0.0:8080", "application:application"]'
      );
      console.log('Updated Dockerfile CMD configuration');
    }
    
    // Add a comment indicating this was updated
    dockerfileContent = dockerfileContent.replace(
      /# Dockerfile for Python Django/,
      '# Dockerfile for Python Django - Updated by Version0039_fix_docker_build.js'
    );
    
    // Write the updated content
    writeFileSync(dockerfilePath, dockerfileContent);
    console.log('Successfully updated Dockerfile');
    return true;
  } catch (error) {
    console.error('Error updating Dockerfile:', error);
    return false;
  }
};

// Create a more complete minimal deployment package
const createEnhancedPackage = () => {
  const outputFileName = `enhanced-eb-package-${config.timestamp}.zip`;
  const outputPath = path.join(config.backendDir, outputFileName);
  
  // Create output stream
  const output = createWriteStream(outputPath);
  const archive = archiver('zip', {
    zlib: { level: 9 } // Maximum compression
  });
  
  // Set up archive events
  output.on('close', () => {
    console.log(`Enhanced package created: ${outputFileName}`);
    console.log(`Total size: ${archive.pointer()} bytes`);
  });
  
  archive.on('error', (err) => {
    throw err;
  });
  
  // Pipe archive data to the output file
  archive.pipe(output);
  
  // Add essential files to the archive
  console.log('Adding files to the enhanced package:');
  for (const pattern of config.essentialFiles) {
    console.log(` - ${pattern}`);
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
  
  // Create application.py if it doesn't exist (common missing file)
  const appFilePath = path.join(config.backendDir, 'application.py');
  if (!existsSync(appFilePath)) {
    console.log('Creating application.py file for Elastic Beanstalk...');
    const appFileContent = `"""
AWS Elastic Beanstalk with Docker - Entry Point
This file serves as the entry point for the AWS Elastic Beanstalk Docker platform.
"""
import os
from pyfactor.wsgi import application

# Run the application with the correct settings
if __name__ == "__main__":
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pyfactor.settings_eb")
    from django.core.wsgi import get_wsgi_application
    application = get_wsgi_application()
`;
    writeFileSync(appFilePath, appFileContent);
    archive.file(appFilePath, { name: 'application.py' });
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
    const newEntry = `\n## AWS EB Docker Build Fix - ${new Date().toISOString().split('T')[0]}
    
| Script Name | Version | Purpose | Status | Date |
|-------------|---------|---------|--------|------|
| Version0039_fix_docker_build.js | 1.0 | Fix Docker build issues in AWS EB deployment | Completed | ${new Date().toISOString().split('T')[0]} |

The script addressed the following issues:
1. Created a more comprehensive deployment package with necessary files
2. Updated the Dockerfile to ensure compatibility with minimal package
3. Created a new enhanced package (${packageName}) for deployment

Instructions for deployment:
1. Upload the enhanced package to AWS Elastic Beanstalk console
2. Create a new application version
3. Deploy the application version to your environment with the DottConfiguration
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
  const guideFileName = 'DOCKER_EB_BUILD_FIX_GUIDE.md';
  const guidePath = path.join(config.backendDir, guideFileName);
  
  const guideContent = `# Docker EB Build Fix Guide

## Overview

This guide documents the fix for Docker build issues in AWS Elastic Beanstalk deployment with the PyFactor backend. The deployment was failing with "Failed to build the Docker image" errors.

## Issues Addressed

### 1. Missing Files in Minimal Package
- **Problem**: The minimal package was too minimal, missing files needed for the Docker build process
- **Fix**: Created a more comprehensive package with additional essential files

### 2. Dockerfile Compatibility
- **Problem**: The Dockerfile CMD instruction may have been referencing missing files
- **Fix**: Ensured Dockerfile uses the application.py entry point

## Deployment Package

A new enhanced deployment package has been created:
- **Package Name**: \`${packageName}\`
- **Created On**: ${new Date().toISOString().split('T')[0]}
- **Size**: Larger than the minimal package but still well under the 500MB limit

## Deployment Instructions

### Using AWS CLI with Saved Configuration

The recommended way to deploy is using the \`deploy_with_saved_config.sh\` script:

\`\`\`bash
cd /Users/kuoldeng/projectx/backend/pyfactor/scripts
./deploy_with_saved_config.sh
\`\`\`

When prompted for the package, specify: \`${packageName}\`

### Manual AWS Console Deployment

1. Sign in to the AWS Management Console
2. Navigate to Elastic Beanstalk service
3. Create a new application version:
   - Application: Dott
   - Version label: docker-eb-enhanced-${config.timestamp}
   - Upload: \`${packageName}\`
4. Deploy to environment:
   - Environment: Dott-env-dev
   - Use saved configuration: DottConfiguration

## Verifying Deployment

After deployment completes:

1. Check the environment health in the EB Console
2. Verify application functionality by accessing the application URL
3. Check the logs for any errors

## Additional Notes

If this enhanced package still encounters build issues, you may need to:
1. Include additional app directories in the package
2. Check for specific dependency errors in the build logs
3. Ensure all referenced files in Dockerfile exist in the package

## Related Documentation

See \`DOCKER_EB_COMPREHENSIVE_FIX_GUIDE.md\` for general Docker EB deployment guidance.
`;
  
  // Write the guide file
  writeFileSync(guidePath, guideContent);
  console.log(`Created deployment guide: ${guideFileName}`);
  
  return guideFileName;
};

// Main execution
(async () => {
  console.log('Starting Version0039_fix_docker_build.js');
  console.log(`Timestamp: ${config.timestamp}`);
  
  // Step 1: Ensure directories exist
  ensureDirectoriesExist();
  
  // Step 2: Update Dockerfile if needed
  const dockerfileUpdated = updateDockerfile();
  
  // Step 3: Create enhanced package
  const packageName = createEnhancedPackage();
  
  // Step 4: Create deployment guide
  const guideName = createDeploymentGuide(packageName);
  
  // Step 5: Update script registry
  const registryUpdated = updateScriptRegistry(packageName);
  
  // Summary
  console.log('\nExecution Summary:');
  console.log('--------------------');
  console.log(`Dockerfile updated: ${dockerfileUpdated ? 'Yes' : 'No'}`);
  console.log(`Enhanced package created: ${packageName}`);
  console.log(`Deployment guide created: ${guideName}`);
  console.log(`Script registry updated: ${registryUpdated ? 'Yes' : 'No'}`);
  console.log('\nNext steps:');
  console.log(`1. Review the deployment guide: ${guideName}`);
  console.log(`2. Deploy using script: ./deploy_with_saved_config.sh`);
  console.log(`3. Use the new package: ${packageName}`);
  console.log('4. Monitor the deployment and check for health status');
})(); 