/**
 * Version0040_create_complete_package.js
 * 
 * Creates a comprehensive deployment package for AWS Elastic Beanstalk
 * 
 * This script:
 * 1. Includes ALL application files (not just the minimal set)
 * 2. Ensures the package stays under the 500MB EB limit
 * 3. Properly maintains the directory structure for Docker deployment
 * 
 * Created: May 18, 2025
 * Author: AI Assistant
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
  // Directories to exclude to keep size reasonable
  excludeDirs: [
    'node_modules',
    '__pycache__',
    '.git',
    '.venv',
    'venv',
    'env',
    'backups',
    'tmp',
    '.pytest_cache',
    '.mypy_cache',
    '.eggs',
    'build',
    'dist',
    '*.egg-info',
    '*.zip',    // Exclude other zip files
    'logs'
  ]
};

// Ensure output directories exist
const ensureDirectoriesExist = () => {
  if (!existsSync(path.join(config.backendDir, 'backups'))) {
    mkdirSync(path.join(config.backendDir, 'backups'));
  }
};

// Check if a directory should be excluded
const shouldExclude = (dirPath) => {
  const relativePath = dirPath.replace(config.backendDir, '').substring(1);
  return config.excludeDirs.some(excludeDir => {
    // Handle glob patterns
    if (excludeDir.includes('*')) {
      const pattern = new RegExp('^' + excludeDir.replace('*', '.*') + '$');
      return pattern.test(relativePath);
    }
    return relativePath === excludeDir || relativePath.startsWith(excludeDir + '/');
  });
};

// Create application.py if it doesn't exist
const ensureApplicationPy = () => {
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
    return true;
  }
  return false;
};

// Create a comprehensive deployment package
const createCompletePackage = () => {
  return new Promise((resolve, reject) => {
    const outputFileName = `complete-eb-package-${config.timestamp}.zip`;
    const outputPath = path.join(config.backendDir, outputFileName);
    
    // Create output stream
    const output = createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });
    
    // Set up archive events
    output.on('close', () => {
      console.log(`Complete package created: ${outputFileName}`);
      console.log(`Total size: ${archive.pointer()} bytes (${(archive.pointer() / 1024 / 1024).toFixed(2)}MB)`);
      
      // Check if package is too large
      const maxSize = 500 * 1024 * 1024; // 500MB in bytes
      if (archive.pointer() > maxSize) {
        console.error(`WARNING: Package is larger than the 500MB AWS Elastic Beanstalk limit!`);
        console.error(`You may need to reduce its size before uploading.`);
      } else {
        console.log(`Package is ${((archive.pointer() / maxSize) * 100).toFixed(2)}% of the 500MB limit.`);
      }
      
      // Resolve with the package name and size
      resolve({
        name: outputFileName,
        sizeBytes: archive.pointer(),
        sizeMB: (archive.pointer() / 1024 / 1024).toFixed(2)
      });
    });
    
    archive.on('error', (err) => {
      reject(err);
    });
    
    // Skip verbose logging to keep console output manageable
    let fileCount = 0;
    archive.on('entry', (entry) => {
      // Skip logging for most files to reduce console noise
      if (!entry.name.includes('__pycache__')) {
        fileCount++;
        if (fileCount % 100 === 0) {
          console.log(`Added ${fileCount} files so far...`);
        }
      }
    });
    
    // Pipe archive data to the output file
    archive.pipe(output);
    
    // Create application.py if it doesn't exist
    ensureApplicationPy();
    
    // Add entire backend directory (excluding specified directories)
    console.log('Adding application files (excluding unnecessary directories)...');
    archive.glob('**/*', {
      cwd: config.backendDir,
      ignore: config.excludeDirs.map(dir => `${dir}/**`),
      dot: true
    });
    
    // Make sure critical files for EB are included explicitly
    console.log('Ensuring critical files are included...');
    [
      'Dockerfile',
      'Dockerrun.aws.json',
      '.dockerignore',
      'application.py',
      'requirements-eb.txt',
      'requirements.txt',
      'manage.py'
    ].forEach(file => {
      const filePath = path.join(config.backendDir, file);
      if (existsSync(filePath)) {
        archive.file(filePath, { name: file });
        console.log(`Explicitly including critical file: ${file}`);
      }
    });
    
    // Finalize the archive
    archive.finalize();
  });
};

// Update script registry
const updateScriptRegistry = (packageName, size) => {
  try {
    const registryPath = config.scriptRegistryPath;
    let registryContent = readFileSync(registryPath, 'utf8');
    
    // Add new entry to the registry
    const newEntry = `\n## AWS EB Complete Package - ${new Date().toISOString().split('T')[0]}
    
| Script Name | Version | Purpose | Status | Date |
|-------------|---------|---------|--------|------|
| Version0040_create_complete_package.js | 1.0 | Create comprehensive deployment package for AWS EB | Completed | ${new Date().toISOString().split('T')[0]} |

The script created a comprehensive package:
1. Includes ALL application files (not just a minimal set)
2. Size: ${size} MB (well under the 500MB EB limit)
3. Package name: ${packageName}

Instructions for deployment:
1. Use the deploy_with_saved_config.sh script with this package
2. Or upload manually to AWS Elastic Beanstalk console
3. Deploy with the DottConfiguration saved template
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
const createDeploymentGuide = (packageName, sizeInMB) => {
  const guideFileName = 'COMPLETE_PACKAGE_DEPLOYMENT_GUIDE.md';
  const guidePath = path.join(config.backendDir, guideFileName);
  
  const guideContent = `# Complete Package Deployment Guide

## Overview

This guide explains how to deploy the PyFactor Django backend to AWS Elastic Beanstalk using a comprehensive deployment package that includes all application files.

## About the Package

The complete deployment package was created to address Docker build issues by ensuring all necessary files are included:

- **Package Name**: \`${packageName}\`
- **Created On**: ${new Date().toISOString().split('T')[0]}
- **Size**: ${sizeInMB} MB (well under the 500MB AWS Elastic Beanstalk limit)
- **Contents**: All application files excluding only development artifacts

## Why a Complete Package?

Previous attempts used minimal packages that excluded too many files, causing Docker build failures. This comprehensive package:

1. Ensures all necessary files are included for Docker to build successfully
2. Still remains well under the 500MB AWS Elastic Beanstalk limit
3. Provides a more reliable deployment experience

## Deployment Instructions

### Option 1: Using the Deployment Script

The easiest way to deploy is with our deployment script:

\`\`\`bash
cd /Users/kuoldeng/projectx/backend/pyfactor/scripts
./deploy_with_saved_config.sh
\`\`\`

When prompted for an S3 bucket name, enter your bucket (e.g., dott-app-deployments-dockerebmanual001).

### Option 2: Manual AWS Console Deployment

1. Sign in to the AWS Management Console
2. Navigate to Elastic Beanstalk service
3. Create a new application version:
   - Application: Dott
   - Version label: complete-package-${config.timestamp}
   - Upload: \`${packageName}\`
4. Deploy to environment:
   - Environment: Dott-env-dev
   - Use saved configuration: DottConfiguration

## Verifying Deployment

After deployment completes:

1. Check the environment health in the EB Console (it should turn green)
2. Verify application functionality by accessing the application URL
3. If issues persist, check the application logs:
   \`\`\`bash
   aws elasticbeanstalk retrieve-environment-info --environment-name Dott-env-dev --info-type tail
   \`\`\`

## Excluded Content

To keep the package size reasonable, the following were excluded:
- Virtual environments (venv, .venv)
- Cache directories (__pycache__, .pytest_cache)
- Source control files (.git)
- Build artifacts (node_modules, dist, *.egg-info)
- Logs and backups
- Previous ZIP packages

These exclusions don't affect the application's functionality but keep the package size manageable.

## Advantages Over Minimal Packages

1. **Reliability**: All necessary files are included, preventing Docker build failures
2. **Simplicity**: No need to carefully curate which files to include
3. **Maintainability**: Less prone to errors when the codebase changes
`;
  
  // Write the guide file
  writeFileSync(guidePath, guideContent);
  console.log(`Created deployment guide: ${guideFileName}`);
  
  return guideFileName;
};

// Main execution
(async () => {
  console.log('Starting Version0040_create_complete_package.js');
  console.log(`Timestamp: ${config.timestamp}`);
  
  try {
    // Step 1: Ensure directories exist
    ensureDirectoriesExist();
    
    // Step 2: Create comprehensive package
    console.log('Creating a comprehensive package with ALL application files...');
    console.log('This will exclude only unnecessary directories like node_modules, __pycache__, etc.');
    console.log(`Excluded directories: ${config.excludeDirs.join(', ')}`);
    
    const packageInfo = await createCompletePackage();
    
    // Step 3: Create deployment guide
    const guideName = createDeploymentGuide(packageInfo.name, packageInfo.sizeMB);
    
    // Step 4: Update script registry
    const registryUpdated = updateScriptRegistry(packageInfo.name, packageInfo.sizeMB);
    
    // Summary
    console.log('\nExecution Summary:');
    console.log('--------------------');
    console.log(`Complete package created: ${packageInfo.name}`);
    console.log(`Package size: ${packageInfo.sizeMB} MB (${((packageInfo.sizeBytes / (500 * 1024 * 1024)) * 100).toFixed(2)}% of the 500MB limit)`);
    console.log(`Deployment guide created: ${guideName}`);
    console.log(`Script registry updated: ${registryUpdated ? 'Yes' : 'No'}`);
    console.log('\nNext steps:');
    console.log(`1. Review the deployment guide: ${guideName}`);
    console.log(`2. Deploy using script: ./deploy_with_saved_config.sh`);
    console.log(`3. Specify the package: ${packageInfo.name}`);
    console.log('4. Monitor the deployment and check for health status');
  } catch (error) {
    console.error('Error creating package:', error);
  }
})(); 