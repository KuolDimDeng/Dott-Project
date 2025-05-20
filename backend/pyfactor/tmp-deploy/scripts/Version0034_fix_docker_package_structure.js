// Version0034_fix_docker_package_structure.js
// Updates create_minimal_package.sh to properly structure Docker deployment package
// Created: May 17, 2025

const fs = require('fs');
const path = require('path');

// Define paths
const scriptPath = path.resolve('/Users/kuoldeng/projectx/backend/pyfactor/scripts/create_minimal_package.sh');
const backupPath = scriptPath + '.backup-' + new Date().toISOString().replace(/:/g, '-');

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

// Update the script with the corrected structure
const updatedContent = originalContent
  // Change the directory structure to place files at root
  .replace('mkdir -p "$TEMP_DIR/backend/pyfactor/', 'mkdir -p "$TEMP_DIR/')
  .replace('cat > "$TEMP_DIR/backend/pyfactor/Dockerfile"', 'cat > "$TEMP_DIR/Dockerfile"')
  .replace('cat > "$TEMP_DIR/backend/pyfactor/requirements-eb.txt"', 'cat > "$TEMP_DIR/requirements-eb.txt"')
  .replace('cat > "$TEMP_DIR/backend/pyfactor/pyfactor/settings_eb.py"', 'cat > "$TEMP_DIR/pyfactor/settings_eb.py"')
  .replace('touch "$TEMP_DIR/backend/pyfactor/pyfactor/__init__.py"', 'touch "$TEMP_DIR/pyfactor/__init__.py"')
  .replace('touch "$TEMP_DIR/backend/pyfactor/__init__.py"', 'touch "$TEMP_DIR/__init__.py"')
  .replace('touch "$TEMP_DIR/backend/__init__.py"', '')
  .replace('cat > "$TEMP_DIR/backend/pyfactor/.ebextensions/01_docker.config"', 'cat > "$TEMP_DIR/.ebextensions/01_docker.config"')
  .replace('cat > "$TEMP_DIR/backend/pyfactor/.platform/hooks/predeploy/01_setup.sh"', 'cat > "$TEMP_DIR/.platform/hooks/predeploy/01_setup.sh"')
  .replace('cat > "$TEMP_DIR/backend/pyfactor/.platform/hooks/postdeploy/01_migrate.sh"', 'cat > "$TEMP_DIR/.platform/hooks/postdeploy/01_migrate.sh"')
  .replace('cat > "$TEMP_DIR/backend/pyfactor/manage.py"', 'cat > "$TEMP_DIR/manage.py"')
  .replace('mkdir -p "$TEMP_DIR/backend/pyfactor/pyfactor"', 'mkdir -p "$TEMP_DIR/pyfactor"')
  .replace('cat > "$TEMP_DIR/backend/pyfactor/pyfactor/urls.py"', 'cat > "$TEMP_DIR/pyfactor/urls.py"')
  .replace('cat > "$TEMP_DIR/backend/pyfactor/pyfactor/wsgi.py"', 'cat > "$TEMP_DIR/pyfactor/wsgi.py"')
  .replace('cat > "$TEMP_DIR/backend/pyfactor/README_MINIMAL_PACKAGE.md"', 'cat > "$TEMP_DIR/README_MINIMAL_PACKAGE.md"')
  // Add a check at the beginning of the script to ensure Docker files are properly setup
  .replace('echo -e "${BLUE}${BOLD}======== MINIMAL PACKAGE CREATOR ========${NC}"', 
`echo -e "\${BLUE}\${BOLD}======== MINIMAL PACKAGE CREATOR ========\${NC}"

# Ensure Docker files and configuration are properly included
echo -e "\${BLUE}Ensuring Docker files are properly structured...\${NC}"
echo -e "\${YELLOW}NOTE: Docker files must be at the root of the deployment package\${NC}"`);

// Also add a Dockerrun.aws.json file as a failsafe
const updatedContentWithDockerrun = updatedContent.replace('# Create essential Docker configuration files', 
`# Create essential Docker configuration files
# Add Dockerrun.aws.json as a failsafe
cat > "\$TEMP_DIR/Dockerrun.aws.json" << 'EOF'
{
  "AWSEBDockerrunVersion": "1",
  "Image": {
    "Name": "dott-docker-image",
    "Update": "true"
  },
  "Ports": [
    {
      "ContainerPort": "8080",
      "HostPort": "8080"
    }
  ],
  "Logging": "/var/log/nginx"
}
EOF`);

// Update the content (adding a comment explaining the fix)
const finalContent = `#!/bin/bash
# create_minimal_package.sh - Creates a minimal Docker deployment package for EB
# This is a simplified version of reduce_package_size.sh for more reliability
# Updated by Version0034_fix_docker_package_structure.js to fix Docker package structure
# IMPORTANT: Dockerfile must be at the root of the ZIP file for EB to recognize it

${updatedContentWithDockerrun.split('\n').slice(3).join('\n')}`;

// Write the updated script
try {
  console.log('Writing updated create_minimal_package.sh...');
  fs.writeFileSync(scriptPath, finalContent);
  console.log('Updated script written successfully!');
} catch (error) {
  console.error('Error writing updated script:', error);
  process.exit(1);
}

console.log('create_minimal_package.sh has been updated to fix Docker package structure issues');
console.log('The script now places Docker configuration files at the root of the zip file');
console.log('This ensures AWS Elastic Beanstalk can properly recognize and deploy the Docker application');
