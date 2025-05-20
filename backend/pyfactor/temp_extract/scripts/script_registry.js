// Script Registry for Tracking Deployment Solutions
// Contains execution history and status of all deployment-related scripts

const scripts = [
  // Original scripts
  {
    name: 'Version0001_fix_eb_deployment.py',
    executionDate: '2025-05-10 14:32:15',
    status: 'SUCCESS',
    description: 'Fixed initial EB deployment package issues'
  },
  {
    name: 'Version0002_fix_dependencies_conflict.py',
    executionDate: '2025-05-10 15:45:22',
    status: 'SUCCESS',
    description: 'Resolved package dependencies conflicts'
  },
  {
    name: 'Version0005_deployment_summary.md',
    executionDate: '2025-05-11 09:12:30',
    status: 'SUCCESS',
    description: 'Generated deployment summary for first wave of fixes'
  },
  {
    name: 'Version0007_fix_urllib3_conflict_v2.py',
    executionDate: '2025-05-11 11:45:18',
    status: 'SUCCESS',
    description: 'Fixed urllib3 version conflict with upgraded dependencies'
  },
  {
    name: 'Version0010_create_new_env.py', 
    executionDate: '2025-05-12 10:22:31',
    status: 'SUCCESS',
    description: 'Created new environment setup script to handle persistent issues'
  },
  {
    name: 'Version0012_prepare_eb_package.py',
    executionDate: '2025-05-13 08:15:44',
    status: 'SUCCESS',
    description: 'Prepared optimized EB package with correct files for deployment'
  },
  {
    name: 'Version0015_deployment_summary.md',
    executionDate: '2025-05-14 13:25:10',
    status: 'SUCCESS',
    description: 'Updated deployment summary for second wave of fixes'
  },
  {
    name: 'Version0020_fix_postgresql_dependency_al2023.py',
    executionDate: '2025-05-15 09:18:20',
    status: 'SUCCESS',
    description: 'Fixed PostgreSQL dependencies for Amazon Linux 2023'
  },
  {
    name: 'Version0025_docker_based_deployment.py',
    executionDate: '2025-05-17 07:45:23',
    status: 'SUCCESS',
    description: 'Created Docker-based deployment package for better compatibility with AWS EB'
  },
  {
    name: 'Version0027_fix_docker_deployment.py',
    executionDate: '2025-05-17 08:30:15',
    status: 'SUCCESS',
    description: 'Fixed Docker deployment issues with proxy server configuration'
  },
  // Docker fixes
  {
    name: 'Version0028_fix_docker_port_mismatch.py',
    executionDate: '2025-05-17 09:27:30',
    status: 'SUCCESS',
    description: 'Fixed Docker deployment port mismatch by changing the container port from 8000 to 8080 to align with Elastic Beanstalk Nginx expectations'
  },
  {
    name: 'Version0029_fix_docker_config_files.py',
    executionDate: '2025-05-17 09:38:37',
    status: 'SUCCESS',
    description: 'Removed unsupported parameters (WSGIPath, NumProcesses, NumThreads) from .ebextensions config files for Docker platform compatibility'
  },
  {
    name: 'Version0030_fix_postgresql_script_syntax.py',
    executionDate: '2025-05-17 10:10:56',
    status: 'SUCCESS',
    description: 'Fixed shell script syntax error in PostgreSQL installation script that was causing deployment failure'
  },
  {
    name: 'Version0031_fix_docker_python_setup.py',
    executionDate: '2025-05-17 10:30:25',
    status: 'SUCCESS',
    description: 'Fixed dependencies script syntax error and updated Dockerfile to ensure Python is installed'
  },
  {
    name: 'Version0032_fix_python_prebuild.py',
    executionDate: '2025-05-17 10:59:44',
    status: 'SUCCESS',
    description: 'Added Python installer script that runs before other prebuild hooks'
  },
  {
    name: 'Version0033_fix_setuptools_uninstall.py',
    executionDate: '2025-05-17 11:23:06',
    status: 'SUCCESS',
    description: 'Fixed setuptools uninstall error by using --ignore-installed flag'
  },
  {
    name: 'deploy_via_eb_cli.sh',
    executionDate: '2025-05-17 11:30:15',
    status: 'SUCCESS',
    description: 'EB CLI deployment script with improved file size handling and S3 direct upload'
  },
  {
    name: 'reduce_package_size.sh',
    executionDate: '2025-05-17 11:32:14',
    status: 'SUCCESS',
    description: 'Package size reduction tool to handle AWS EB 512MB file size limit'
  },
  {
    name: 'prepare_deployment.sh',
    executionDate: '2025-05-17 11:44:00',
    status: 'SUCCESS',
    description: 'Script to prepare Docker deployment package with all the necessary fixes applied'
  }
];

// For use in browser if needed
if (typeof module !== 'undefined') {
  module.exports = { scripts };
}

// Version0029_fix_docker_config_files.py
// Executed: 2025-05-17 09:38:38
// Purpose: Fixed Docker deployment package configuration errors
scripts.push({
  name: 'Version0029_fix_docker_config_files.py',
  executionDate: '2025-05-17 09:38:38',
  status: 'SUCCESS',
  description: 'Removed unsupported parameters (WSGIPath, NumProcesses, NumThreads) from .ebextensions config files'
});

// Latest deployment fixes
// Executed: 2025-05-17 11:35:00
// Purpose: Fix for deployment file size issues and setuptools errors
scripts.push({
  name: 'Version0034_package_size_and_deployment_fix',
  executionDate: '2025-05-17 11:35:00',
  status: 'SUCCESS',
  description: 'Added package size reduction tool and improved EB CLI deployment with S3 direct upload for large packages'
});

// Package size reduction enhancement for AWS EB 512MB limit
// Executed: 2025-05-17 13:28:00
// Purpose: Fix for "Source bundle exceeds maximum allowed size: 524288000" error
scripts.push({
  name: 'Version0035_package_size_reduction_enhancement',
  executionDate: '2025-05-17 13:28:00',
  status: 'SUCCESS',
  description: 'Enhanced package size reduction workflow to handle large Docker deployment packages that exceed 512MB EB limit'
});

// Deployment script size awareness update
// Executed: 2025-05-17 13:28:30
// Purpose: Make deployment script aware of package size limits and reduced packages
scripts.push({
  name: 'Version0036_deploy_script_size_awareness',
  executionDate: '2025-05-17 13:28:30',
  status: 'SUCCESS',
  description: 'Updated deploy_via_eb_cli.sh to automatically prefer reduced packages and warn about oversized packages'
});

// Package size reduction documentation
// Executed: 2025-05-17 13:29:00
// Purpose: Document the size reduction process and options
scripts.push({
  name: 'PACKAGE_SIZE_REDUCTION_GUIDE.md',
  executionDate: '2025-05-17 13:29:00',
  status: 'SUCCESS',
  description: 'Added comprehensive guide for handling AWS Elastic Beanstalk 512MB package size limits'
});

// Manual AWS Console Upload Guide
// Executed: 2025-05-17 21:30:00
// Purpose: Provide step-by-step instructions for manually uploading packages via AWS Console
scripts.push({
  name: 'AWS_CONSOLE_MANUAL_UPLOAD_GUIDE.md',
  executionDate: '2025-05-17 21:30:00',
  status: 'SUCCESS',
  description: 'Created detailed guide for manually uploading large packages through AWS Console'
});

// Manual upload preparation script
// Executed: 2025-05-17 21:31:00
// Purpose: Create a properly named package for manual AWS Console upload
scripts.push({
  name: 'prepare_for_manual_upload.sh',
  executionDate: '2025-05-17 21:31:00',
  status: 'SUCCESS',
  description: 'Script to prepare Docker deployment packages for manual upload via AWS Console'
});

// S3 Upload Guide
// Executed: 2025-05-17 21:35:00
// Purpose: Provide detailed step-by-step instructions for S3 upload via AWS Console
scripts.push({
  name: 'S3_UPLOAD_STEP_BY_STEP.md',
  executionDate: '2025-05-17 21:35:00',
  status: 'SUCCESS',
  description: 'Created visual step-by-step guide for uploading large packages to Amazon S3'
});

// Complete Deployment Guide
// Executed: 2025-05-17 21:36:00
// Purpose: Provide a comprehensive reference for all large package deployment solutions
scripts.push({
  name: 'LARGE_PACKAGE_DEPLOYMENT_COMPLETE_GUIDE.md',
  executionDate: '2025-05-17 21:36:00',
  status: 'SUCCESS',
  description: 'Created complete reference guide that combines all deployment solutions for large packages'
});

// AWS CLI Direct Deployment Script
// Executed: 2025-05-17 22:13:00
// Purpose: Provide a CLI-based solution that bypasses AWS Console UI issues
scripts.push({
  name: 'aws_cli_deploy.sh',
  executionDate: '2025-05-17 22:13:00',
  status: 'SUCCESS',
  description: 'Created AWS CLI-based deployment script that bypasses AWS Console UI issues when deploying large packages'
});

// Minimal Package Creator Script
// Executed: 2025-05-17 22:34:00
// Purpose: Create minimal sized package to bypass 512MB limit
scripts.push({
  name: 'create_minimal_package.sh',
  executionDate: '2025-05-17 22:34:00',
  status: 'SUCCESS',
  description: 'Created a simplified tool that generates a minimal Docker deployment package to bypass the AWS EB 512MB size limit'
});

// Enhanced Minimal Package Creator
// Executed: 2025-05-17 22:39:00
// Purpose: Update minimal package to include app code setup from S3
scripts.push({
  name: 'create_minimal_package.sh',
  executionDate: '2025-05-17 22:39:00',
  status: 'UPDATED',
  description: 'Enhanced the minimal package creator to include proper application code download from S3 during deployment'
});

// Application Code S3 Preparation Script
// Executed: 2025-05-17 22:40:00
// Purpose: Create deployable application code package for S3
scripts.push({
  name: 'prepare_app_code_for_s3.sh',
  executionDate: '2025-05-17 22:40:00',
  status: 'SUCCESS',
  description: 'Created script to prepare full application code package for S3 upload to be used with minimal package deployment'
});

// Minimal Package Deployment Guide
// Executed: 2025-05-17 22:35:00
// Purpose: Document the minimal package deployment approach
scripts.push({
  name: 'MINIMAL_PACKAGE_DEPLOYMENT_GUIDE.md',
  executionDate: '2025-05-17 22:35:00',
  status: 'SUCCESS',
  description: 'Created comprehensive guide for deploying via minimal package approach to bypass the AWS EB 512MB size limit'
});

// Docker Package Structure Fix
// Executed: 2025-05-17 22:57:00
// Purpose: Fix the Docker package structure to ensure Dockerfile is at the root
scripts.push({
  name: 'Version0034_fix_docker_package_structure.js',
  executionDate: '2025-05-17 22:57:00',
  status: 'SUCCESS',
  description: 'Fixed Docker deployment package structure issue by ensuring Dockerfile is at the root of the ZIP file for AWS EB to properly recognize it'
});

// Directory Paths Fix in Minimal Package
// Executed: 2025-05-17 22:59:00
// Purpose: Fix directory paths in create_minimal_package.sh for proper package creation
scripts.push({
  name: 'Version0035_fix_directory_paths_in_minimal_package.js',
  executionDate: '2025-05-17 22:59:00',
  status: 'SUCCESS',
  description: 'Completely rewrote create_minimal_package.sh script to properly create all directory structures with Dockerfile at root level'
});

// S3 Reference Update in Minimal Package
// Executed: 2025-05-17 23:02:00
// Purpose: Update S3 file reference in the minimal package creator
scripts.push({
  name: 'Version0036_update_s3_reference.js',
  executionDate: '2025-05-17 23:02:00',
  status: 'SUCCESS',
  description: 'Updated S3 reference in create_minimal_package.sh to point to the latest application code package'
});

// Complete Deployment Workflow
// Executed: 2025-05-17 23:03:00
// Purpose: Create an all-in-one deployment script
scripts.push({
  name: 'complete_deployment.sh',
  executionDate: '2025-05-17 23:03:00',
  status: 'SUCCESS',
  description: 'Created all-in-one deployment script that handles package creation, S3 upload, and EB deployment'
});

// S3 File Mismatch Fix
// Executed: 2025-05-17 23:12:30
// Purpose: Fix S3 file mismatch in the Dockerfile
scripts.push({
  name: 'Version0037_fix_s3_file_mismatch.js',
  executionDate: '2025-05-17 23:12:30',
  status: 'SUCCESS',
  description: 'Fixed S3 file name mismatch in Dockerfile and added EC2 instance profile for AWS credentials'
});

// S3 Permissions Configuration
// Executed: 2025-05-17 23:13:00
// Purpose: Add IAM role permissions for S3 access
scripts.push({
  name: '06_s3_permissions.config',
  executionDate: '2025-05-17 23:13:00',
  status: 'SUCCESS',
  description: 'Added IAM role configuration and permissions for S3 bucket access from Elastic Beanstalk'
});
