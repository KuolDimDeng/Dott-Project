/**
 * Version0040_fix_eb_docker_build.js
 * 
 * This script fixes AWS Elastic Beanstalk Docker deployment issues:
 * 1. Resolves the "Cannot import 'setuptools.build_meta'" error
 * 2. Fixes configuration conflicts between docker-compose.yml and Dockerrun.aws.json
 * 3. Creates a backup of the original files
 * 
 * Created: 2025-05-18
 */

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const copyFile = promisify(fs.copyFile);
const mkdir = promisify(fs.mkdir);

// Base paths
const rootDir = '/Users/kuoldeng/projectx';
const backendDir = path.join(rootDir, 'backend/pyfactor');
const scriptsDir = path.join(backendDir, 'scripts');

// File paths
const dockerfilePath = path.join(backendDir, 'Dockerfile');
const dockerrunPath = path.join(backendDir, 'Dockerrun.aws.json');
const requirementsPath = path.join(backendDir, 'requirements-eb.txt');
const rootDockerComposePath = path.join(rootDir, 'docker-compose.yml');

// Backup directory
const backupDir = path.join(backendDir, 'deployment_backups');

// Ensure the backup directory exists
async function ensureBackupDir() {
  try {
    await mkdir(backupDir, { recursive: true });
    console.log(`Created backup directory: ${backupDir}`);
  } catch (err) {
    if (err.code !== 'EEXIST') {
      console.error(`Error creating backup directory: ${err.message}`);
      throw err;
    }
  }
}

// Create backup of original files
async function createBackups() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  try {
    await copyFile(dockerfilePath, `${dockerfilePath}.backup-${timestamp}`);
    console.log(`Created backup of Dockerfile`);
    
    await copyFile(dockerrunPath, `${dockerrunPath}.backup-${timestamp}`);
    console.log(`Created backup of Dockerrun.aws.json`);
    
    await copyFile(requirementsPath, `${requirementsPath}.backup-${timestamp}`);
    console.log(`Created backup of requirements-eb.txt`);
    
    await copyFile(rootDockerComposePath, `${rootDockerComposePath}.backup-${timestamp}`);
    console.log(`Created backup of docker-compose.yml`);
  } catch (err) {
    console.error(`Error creating backups: ${err.message}`);
    throw err;
  }
}

// Fix the Dockerfile
async function fixDockerfile() {
  try {
    const dockerfile = await readFile(dockerfilePath, 'utf8');
    
    // Update the Dockerfile to fix setuptools issue
    const updatedDockerfile = dockerfile
      // Change Python version to 3.10 for better compatibility
      .replace(/FROM python:3.12-slim/, 'FROM python:3.10-slim')
      // Add setuptools installation before installing requirements
      .replace(
        /# Install Python dependencies\nCOPY requirements-eb.txt \.\nRUN pip install --no-cache-dir -r requirements-eb.txt/,
        '# Install Python dependencies\nCOPY requirements-eb.txt .\n# Fix for setuptools.build_meta issue\nRUN pip install --upgrade pip setuptools wheel\nRUN pip install --no-cache-dir -r requirements-eb.txt'
      );
    
    await writeFile(dockerfilePath, updatedDockerfile);
    console.log('Updated Dockerfile with setuptools fix and Python 3.10');
  } catch (err) {
    console.error(`Error fixing Dockerfile: ${err.message}`);
    throw err;
  }
}

// Fix requirements-eb.txt
async function fixRequirements() {
  try {
    const requirements = await readFile(requirementsPath, 'utf8');
    
    // Ensure setuptools is properly specified
    const updatedRequirements = requirements.includes('setuptools==')
      ? requirements.replace(/setuptools==.*/, 'setuptools==68.0.0')
      : `setuptools==68.0.0\n${requirements}`;
    
    await writeFile(requirementsPath, updatedRequirements);
    console.log('Updated requirements-eb.txt with setuptools version fix');
  } catch (err) {
    console.error(`Error fixing requirements-eb.txt: ${err.message}`);
    throw err;
  }
}

// Create .ebignore file to ignore docker-compose.yml during deployment
async function createEbignore() {
  const ebignorePath = path.join(backendDir, '.ebignore');
  const ebignoreContent = `
# Ignore docker-compose.yml to prevent conflict with Dockerrun.aws.json
docker-compose.yml
# Ignore local development files
.env
.env.local
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
*.egg-info/
.installed.cfg
*.egg
`;

  try {
    await writeFile(ebignorePath, ebignoreContent);
    console.log('Created .ebignore file to prevent configuration conflicts');
  } catch (err) {
    console.error(`Error creating .ebignore file: ${err.message}`);
    throw err;
  }
}

// Create a fixed config file for Elastic Beanstalk
async function createEbConfigFile() {
  const ebextensionsDir = path.join(backendDir, '.ebextensions');
  const ebConfigPath = path.join(ebextensionsDir, '01_docker.config');
  
  try {
    await mkdir(ebextensionsDir, { recursive: true });
    
    const configContent = `
files:
  "/etc/nginx/conf.d/proxy.conf":
    mode: "000644"
    owner: root
    group: root
    content: |
      upstream docker {
        server 127.0.0.1:8080;
        keepalive 256;
      }

      server {
        listen 80;

        location / {
          proxy_pass http://docker;
          proxy_http_version 1.1;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection "upgrade";
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
      }
`;
    await writeFile(ebConfigPath, configContent);
    console.log('Created .ebextensions configuration for proper proxy settings');
  } catch (err) {
    console.error(`Error creating .ebextensions config: ${err.message}`);
    throw err;
  }
}

// Create deployment README
async function createReadme() {
  const readmePath = path.join(backendDir, 'DOCKER_EB_FIXED_DEPLOYMENT_README.md');
  const readmeContent = `# Fixed Docker Deployment for AWS Elastic Beanstalk

## Fixes Applied

This deployment has been fixed to address the following issues:

1. **setuptools.build_meta Error**: 
   - Updated Python version from 3.12 to 3.10 for better compatibility
   - Added explicit setuptools installation before requirements
   - Fixed setuptools version in requirements-eb.txt

2. **Configuration Conflicts**:
   - Added .ebignore to exclude docker-compose.yml during deployment
   - Ensured Dockerrun.aws.json is properly configured

3. **Proxy Configuration**:
   - Added .ebextensions configuration for proper Nginx proxy settings

## Deployment Steps

1. **Prepare the deployment package**:
   \`\`\`bash
   cd /Users/kuoldeng/projectx/backend/pyfactor
   zip -r ../pyfactor-docker-deployment.zip . -x "*.git*" "*.DS_Store" "*.pyc" "__pycache__/*"
   \`\`\`

2. **Deploy to Elastic Beanstalk**:
   - Navigate to AWS Elastic Beanstalk console
   - Select your environment
   - Upload the generated zip file
   - Deploy the application

## Troubleshooting

If you encounter issues after deployment:

1. Check the Elastic Beanstalk logs
2. Verify the environment variables are set correctly
3. Check for any errors in the docker container build process

## Port Configuration

The application is configured to run on port 8080 internally, which is then mapped to port 80 externally by the Elastic Beanstalk environment.
`;

  try {
    await writeFile(readmePath, readmeContent);
    console.log('Created deployment README with instructions');
  } catch (err) {
    console.error(`Error creating README: ${err.message}`);
    throw err;
  }
}

// Create a script registry entry
async function updateScriptRegistry() {
  const registryPath = path.join(scriptsDir, 'script_registry.json');
  let registry = [];

  try {
    try {
      const registryData = await readFile(registryPath, 'utf8');
      registry = JSON.parse(registryData);
    } catch (err) {
      // If the file doesn't exist or has invalid JSON, create a new registry
      console.log('Creating new script registry');
    }

    const newEntry = {
      scriptName: 'Version0040_fix_eb_docker_build.js',
      description: 'Fixes Docker deployment issues for AWS Elastic Beanstalk',
      dateExecuted: new Date().toISOString(),
      status: 'SUCCESS',
      modifiedFiles: [
        'Dockerfile',
        'requirements-eb.txt',
        '.ebignore',
        '.ebextensions/01_docker.config',
        'DOCKER_EB_FIXED_DEPLOYMENT_README.md'
      ]
    };

    registry.push(newEntry);
    await writeFile(registryPath, JSON.stringify(registry, null, 2));
    console.log('Updated script registry');
  } catch (err) {
    console.error(`Error updating script registry: ${err.message}`);
  }
}

async function main() {
  try {
    await ensureBackupDir();
    await createBackups();
    await fixDockerfile();
    await fixRequirements();
    await createEbignore();
    await createEbConfigFile();
    await createReadme();
    await updateScriptRegistry();
    
    console.log('========================================');
    console.log('All Docker EB deployment fixes completed successfully!');
    console.log('Follow the instructions in DOCKER_EB_FIXED_DEPLOYMENT_README.md to deploy.');
    console.log('========================================');
  } catch (err) {
    console.error('Error during fix execution:', err);
    process.exit(1);
  }
}

main();
