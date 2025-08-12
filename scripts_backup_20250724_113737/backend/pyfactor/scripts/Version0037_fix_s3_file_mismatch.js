// Version0037_fix_s3_file_mismatch.js
// Fixes S3 file name mismatch and adds IAM role configuration in create_minimal_package.sh
// Created: May 17, 2025

const fs = require('fs');
const path = require('path');

// Define paths
const scriptPath = path.resolve('/Users/kuoldeng/projectx/backend/pyfactor/scripts/create_minimal_package.sh');
const backupPath = scriptPath + '.backup-' + new Date().toISOString().replace(/:/g, '-');

// Get the latest S3 file name - using the most recently created file
const latestS3File = 'full-app-code-20250517230538.zip';
console.log(`Updating S3 reference to: ${latestS3File}`);

// First, create a backup of the original file
try {
  console.log('Creating backup of create_minimal_package.sh...');
  fs.copyFileSync(scriptPath, backupPath);
  console.log(`Backup created at ${backupPath}`);
} catch (error) {
  console.error('Error creating backup:', error);
  process.exit(1);
}

// Read the original script content
const originalContent = fs.readFileSync(scriptPath, 'utf8');

// Update the Dockerfile section to fix the file name mismatch and add IAM role
const updatedContent = originalContent.replace(
  /RUN mkdir -p \/tmp\/app_download(.|\n)*?echo "Application code downloaded and extracted successfully"/g, 
  `RUN mkdir -p /tmp/app_download && \\
    cd /tmp/app_download && \\
    echo "Downloading application code from S3..." && \\
    # Install AWS CLI for S3 downloads
    pip install awscli && \\
    # Configure AWS credentials with instance profile 
    echo "Using EC2 instance profile for AWS credentials" && \\
    # Download from S3 
    aws s3 cp s3://dott-app-deployments-dockerebmanual001/${latestS3File} . && \\
    unzip ${latestS3File} -d /var/app/current && \\
    echo "Application code downloaded and extracted successfully"`
);

// Write the updated script
try {
  console.log('Writing updated create_minimal_package.sh...');
  fs.writeFileSync(scriptPath, updatedContent);
  console.log('Updated script written successfully!');
} catch (error) {
  console.error('Error writing updated script:', error);
  process.exit(1);
}

console.log(`create_minimal_package.sh has been updated with the correct S3 file references: ${latestS3File}`);
console.log('The unzip command now uses the same filename as the download command');
console.log('Also added explicit notice about using EC2 instance profile for AWS credentials');
