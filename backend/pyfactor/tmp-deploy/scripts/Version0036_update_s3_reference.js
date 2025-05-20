// Version0036_update_s3_reference.js
// Updates the Dockerfile in create_minimal_package.sh to download the latest application code from S3
// Created: May 17, 2025

const fs = require('fs');
const path = require('path');

// Define paths
const scriptPath = path.resolve('/Users/kuoldeng/projectx/backend/pyfactor/scripts/create_minimal_package.sh');
const backupPath = scriptPath + '.backup-' + new Date().toISOString().replace(/:/g, '-');

// Get the latest S3 file name from command line arguments or use default
const latestS3File = process.argv[2] || 'full-app-code-20250517230112.zip';
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

// Update the S3 file reference in the Dockerfile section
const updatedContent = originalContent.replace(
  /aws s3 cp s3:\/\/dott-app-deployments-dockerebmanual001\/[^\.]+\.zip/g, 
  `aws s3 cp s3://dott-app-deployments-dockerebmanual001/${latestS3File}`
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

console.log(`create_minimal_package.sh has been updated with the latest S3 file reference: ${latestS3File}`);
console.log('This ensures that the Dockerfile will download the most recent application code from S3');
console.log('The next time create_minimal_package.sh is run, it will use this updated S3 reference');
