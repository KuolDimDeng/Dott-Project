#!/usr/bin/env node

/**
 * Version0097_fix_predeploy_python_docker_deployment.mjs
 * 
 * Fix "python: command not found" error in predeploy hooks for Docker deployment
 * 
 * This script:
 * 1. Scans all .sh files in .platform/hooks/predeploy/ for Python commands
 * 2. Creates backups of affected files
 * 3. Either removes hooks not needed for Docker or modifies them to not require Python
 * 4. Documents all changes made
 * 
 * Run with: node scripts/Version0097_fix_predeploy_python_docker_deployment.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Script configuration
const CONFIG = {
    hookDir: path.join(process.cwd(), '.platform/hooks/predeploy'),
    backupDir: path.join(process.cwd(), '.platform/hooks/predeploy/backups'),
    logFile: path.join(process.cwd(), 'scripts/logs/Version0097_predeploy_python_fix.log'),
    dryRun: false // Set to true to preview changes without applying them
};

// Create log function
const log = (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    
    // Ensure log directory exists
    const logDir = path.dirname(CONFIG.logFile);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    
    // Append to log file
    fs.appendFileSync(CONFIG.logFile, logMessage + '\n');
};

// Backup a file
const backupFile = (filePath) => {
    const fileName = path.basename(filePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `${fileName}.backup.${timestamp}`;
    const backupPath = path.join(CONFIG.backupDir, backupName);
    
    // Ensure backup directory exists
    if (!fs.existsSync(CONFIG.backupDir)) {
        fs.mkdirSync(CONFIG.backupDir, { recursive: true });
    }
    
    fs.copyFileSync(filePath, backupPath);
    log(`✅ Backed up: ${fileName} → ${backupName}`);
    return backupPath;
};

// Check if a file contains Python commands
const containsPythonCommands = (content) => {
    const pythonPatterns = [
        /\bpython\s+/g,
        /\bpython3\s+/g,
        /\bpip\s+/g,
        /\bpip3\s+/g,
        /python -m/g,
        /python3 -m/g
    ];
    
    return pythonPatterns.some(pattern => pattern.test(content));
};

// Fix Python commands in content for Docker deployment
const fixPythonCommands = (content, fileName) => {
    let modified = content;
    let changes = [];
    
    // For Docker deployments, these hooks typically aren't needed because:
    // 1. Django settings are configured in the Docker image
    // 2. CORS settings should be in settings.py or environment variables
    // 3. Syntax validation happens during image build
    
    if (fileName.includes('cors')) {
        // CORS configuration hooks - not needed for Docker
        log(`📝 ${fileName}: This CORS configuration hook is not needed for Docker deployments`);
        log(`   Django CORS should be configured in settings.py or via environment variables`);
        
        // Add a comment explaining why this is disabled for Docker
        modified = `#!/bin/bash
# DISABLED FOR DOCKER DEPLOYMENT
# This hook is not needed for Docker deployments because:
# 1. Django settings are configured during Docker image build
# 2. CORS settings should be in settings.py or environment variables
# 3. The Django app directory structure is different in Docker
#
# Original script content has been commented out below:

${content.split('\n').map(line => '# ' + line).join('\n')}
`;
        changes.push('Disabled entire script for Docker deployment');
    } else {
        // For other files, comment out Python commands
        const pythonLineRegex = /^(\s*)(python|python3|pip|pip3)\s+(.*)$/gm;
        modified = content.replace(pythonLineRegex, (match, indent, command, args) => {
            changes.push(`Commented out: ${command} ${args}`);
            return `${indent}# DOCKER FIX: Python not available in predeploy - ${match}`;
        });
        
        // Also fix lines with python -m
        const pythonModuleRegex = /^(\s*)(cd .* && )?(python|python3) -m (.*)$/gm;
        modified = modified.replace(pythonModuleRegex, (match, indent, cdPart, python, args) => {
            changes.push(`Commented out: ${python} -m ${args}`);
            return `${indent}# DOCKER FIX: Python not available in predeploy - ${match}`;
        });
    }
    
    return { modified, changes };
};

// Process a single hook file
const processHookFile = async (filePath) => {
    const fileName = path.basename(filePath);
    log(`\n🔍 Processing: ${fileName}`);
    
    try {
        // Read file content
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check if it contains Python commands
        if (!containsPythonCommands(content)) {
            log(`✅ No Python commands found in ${fileName}`);
            return { fileName, status: 'no_changes', changes: [] };
        }
        
        log(`⚠️  Python commands detected in ${fileName}`);
        
        // Create backup
        if (!CONFIG.dryRun) {
            backupFile(filePath);
        }
        
        // Fix Python commands
        const { modified, changes } = fixPythonCommands(content, fileName);
        
        // Write modified content
        if (!CONFIG.dryRun && modified !== content) {
            fs.writeFileSync(filePath, modified);
            log(`✅ Fixed ${fileName} - ${changes.length} changes made`);
            changes.forEach(change => log(`   - ${change}`));
        } else if (CONFIG.dryRun) {
            log(`🔍 DRY RUN - Would make ${changes.length} changes:`);
            changes.forEach(change => log(`   - ${change}`));
        }
        
        return { fileName, status: 'fixed', changes };
        
    } catch (error) {
        log(`❌ Error processing ${fileName}: ${error.message}`);
        return { fileName, status: 'error', error: error.message };
    }
};

// Main function
const main = async () => {
    log('\n🚀 Starting Docker predeploy Python fix script...');
    log(`📂 Hook directory: ${CONFIG.hookDir}`);
    log(`💾 Backup directory: ${CONFIG.backupDir}`);
    log(`📝 Dry run: ${CONFIG.dryRun}`);
    
    // Check if hook directory exists
    if (!fs.existsSync(CONFIG.hookDir)) {
        log('❌ Hook directory does not exist. No changes needed.');
        return;
    }
    
    // Get all .sh files in the predeploy directory
    const hookFiles = fs.readdirSync(CONFIG.hookDir)
        .filter(file => file.endsWith('.sh'))
        .map(file => path.join(CONFIG.hookDir, file));
    
    if (hookFiles.length === 0) {
        log('📭 No shell scripts found in predeploy directory.');
        return;
    }
    
    log(`\n📋 Found ${hookFiles.length} shell scripts to process`);
    
    // Process each file
    const results = [];
    for (const filePath of hookFiles) {
        const result = await processHookFile(filePath);
        results.push(result);
    }
    
    // Summary
    log('\n📊 Summary:');
    log('='.repeat(60));
    
    const fixed = results.filter(r => r.status === 'fixed').length;
    const noChanges = results.filter(r => r.status === 'no_changes').length;
    const errors = results.filter(r => r.status === 'error').length;
    
    log(`✅ Fixed: ${fixed} files`);
    log(`✅ No changes needed: ${noChanges} files`);
    if (errors > 0) {
        log(`❌ Errors: ${errors} files`);
    }
    
    // Detailed results
    log('\n📋 Detailed Results:');
    results.forEach(result => {
        if (result.status === 'fixed') {
            log(`\n✅ ${result.fileName}:`);
            result.changes.forEach(change => log(`   - ${change}`));
        } else if (result.status === 'error') {
            log(`\n❌ ${result.fileName}: ${result.error}`);
        }
    });
    
    // Docker deployment recommendations
    log('\n🐳 Docker Deployment Recommendations:');
    log('='.repeat(60));
    log('1. CORS configuration should be handled in Django settings.py');
    log('2. Use environment variables for dynamic configuration');
    log('3. Install Python packages in Dockerfile, not in hooks');
    log('4. Validate Django settings during Docker image build');
    log('5. Consider moving any necessary validations to container startup');
    
    // Create a summary file
    if (!CONFIG.dryRun) {
        const summaryPath = path.join(CONFIG.backupDir, 'fix_summary.md');
        const summaryContent = `# Docker Predeploy Python Fix Summary

Generated: ${new Date().toISOString()}

## Changes Made

${results.map(r => {
    if (r.status === 'fixed') {
        return `### ${r.fileName}
- Status: Fixed
- Changes:
${r.changes.map(c => `  - ${c}`).join('\n')}
`;
    } else if (r.status === 'no_changes') {
        return `### ${r.fileName}
- Status: No changes needed
`;
    } else {
        return `### ${r.fileName}
- Status: Error
- Error: ${r.error}
`;
    }
}).join('\n')}

## Recommendations

1. **CORS Configuration**: Move all CORS settings to Django settings.py or use environment variables
2. **Python Dependencies**: Install all Python packages in Dockerfile
3. **Validation**: Perform Django settings validation during Docker image build
4. **Hooks**: Consider removing these predeploy hooks entirely for Docker deployments

## Backup Location

All original files have been backed up to: \`${CONFIG.backupDir}\`
`;
        
        fs.writeFileSync(summaryPath, summaryContent);
        log(`\n📄 Summary saved to: ${summaryPath}`);
    }
    
    log('\n✅ Docker predeploy Python fix completed!');
};

// Run the script
main().catch(error => {
    log(`\n❌ Script failed: ${error.message}`);
    process.exit(1);
});