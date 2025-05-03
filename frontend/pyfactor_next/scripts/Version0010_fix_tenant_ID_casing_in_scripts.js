/**
 * Version0010_fix_tenant_ID_casing_in_scripts.js
 * 
 * This script fixes the attribute name casing for tenant_ID in the existing fix scripts.
 * The correct attribute name is 'custom:tenant_ID' (with uppercase ID) rather than variants
 * like 'custom:tenant_id' or 'custom:tenantId'.
 * 
 * Version: 1.0.0
 * Date: 2025-04-30
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
  // Scripts to fix
  targetScripts: [
    'Version0008_fix_dashboard_triple_rerender.js',
    'Version0009_fix_dashappbar_missing_user_data.js'
  ],
  
  // Paths
  scriptsDir: path.join(__dirname),
  backupsDir: path.join(__dirname, 'backups'),
  frontendTargetDir: path.join(__dirname, '..', 'frontend', 'pyfactor_next', 'public', 'scripts'),
  
  // Registry file
  registryFile: path.join(__dirname, 'script_registry.md'),
  
  // Patterns to fix
  patterns: [
    {
      search: /custom:tenant_id/g,
      replace: 'custom:tenant_ID'
    },
    {
      search: /custom:tenantId/g,
      replace: 'custom:tenant_ID'
    },
    {
      search: /custom:tenant_Id/g,
      replace: 'custom:tenant_ID'
    },
    {
      search: /custom:tenantID/g,
      replace: 'custom:tenant_ID'
    },
    {
      search: /custom:tenant-id/g,
      replace: 'custom:tenant_ID'
    },
    {
      search: /custom:tenant-ID/g,
      replace: 'custom:tenant_ID'
    }
  ]
};

/**
 * Create a backup of a file
 * @param {string} filePath - Path to the file to back up
 * @returns {string} Path to the backup file
 */
function createBackup(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File does not exist: ${filePath}`);
    return null;
  }
  
  // Create the backups directory if it doesn't exist
  if (!fs.existsSync(config.backupsDir)) {
    fs.mkdirSync(config.backupsDir, { recursive: true });
  }
  
  // Generate backup filename with timestamp
  const fileName = path.basename(filePath);
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, 'Z');
  const backupPath = path.join(config.backupsDir, `${fileName}.backup-${timestamp}`);
  
  // Copy the file to the backup location
  fs.copyFileSync(filePath, backupPath);
  console.log(`Created backup: ${backupPath}`);
  
  return backupPath;
}

/**
 * Fix attribute name casing in a script
 * @param {string} scriptPath - Path to the script to fix
 * @returns {boolean} True if the script was fixed
 */
function fixScript(scriptPath) {
  try {
    if (!fs.existsSync(scriptPath)) {
      console.error(`Script does not exist: ${scriptPath}`);
      return false;
    }
    
    // Create a backup
    createBackup(scriptPath);
    
    // Read the script
    let content = fs.readFileSync(scriptPath, 'utf8');
    
    // Count occurrences before replacement
    const occurrencesBefore = countPatternOccurrences(content);
    
    // Apply all replacements
    let hasChanges = false;
    for (const pattern of config.patterns) {
      if (pattern.search.test(content)) {
        content = content.replace(pattern.search, pattern.replace);
        hasChanges = true;
      }
    }
    
    // Only write if changes were made
    if (hasChanges) {
      fs.writeFileSync(scriptPath, content, 'utf8');
      
      // Count occurrences after replacement
      const occurrencesAfter = countPatternOccurrences(content);
      
      console.log(`Fixed ${scriptPath}:`);
      console.log(`  - Before: ${JSON.stringify(occurrencesBefore)}`);
      console.log(`  - After: ${JSON.stringify(occurrencesAfter)}`);
      
      return true;
    } else {
      console.log(`No changes needed for ${scriptPath}`);
      return false;
    }
  } catch (error) {
    console.error(`Error fixing script ${scriptPath}:`, error);
    return false;
  }
}

/**
 * Count occurrences of all patterns in content
 * @param {string} content - Content to check
 * @returns {Object} Object with counts for each pattern
 */
function countPatternOccurrences(content) {
  const result = {};
  
  // Count occurrences of search patterns
  for (const pattern of config.patterns) {
    // Reset lastIndex for global regex
    if (pattern.search instanceof RegExp) {
      pattern.search.lastIndex = 0;
    }
    
    // Count matches
    const matches = content.match(pattern.search) || [];
    result[pattern.search.toString()] = matches.length;
  }
  
  // Count occurrences of the correct pattern
  const correctPattern = /custom:tenant_ID/g;
  const correctMatches = content.match(correctPattern) || [];
  result['correct'] = correctMatches.length;
  
  return result;
}

/**
 * Update script registry to add this script
 */
function updateRegistry() {
  if (!fs.existsSync(config.registryFile)) {
    console.warn(`Registry file does not exist: ${config.registryFile}`);
    return;
  }
  
  // Create a backup
  createBackup(config.registryFile);
  
  // Read the registry
  let content = fs.readFileSync(config.registryFile, 'utf8');
  
  // Check if this script is already in the registry
  if (content.includes('Version0010_fix_tenant_ID_casing_in_scripts.js')) {
    console.log('Script already in registry');
    return;
  }
  
  // Find the script table
  const tableRegex = /\| Script Name \| Purpose \|[^\n]*\n\|[^\n]*\n/;
  const tableMatch = content.match(tableRegex);
  
  if (!tableMatch) {
    console.warn('Could not find script table in registry');
    return;
  }
  
  // Add this script to the registry
  const today = new Date().toISOString().split('T')[0];
  const scriptEntry = `| Version0010_fix_tenant_ID_casing_in_scripts.js | Fix attribute name casing for tenant_ID in existing fix scripts | ${today} | ✅ | Success | Version0008_fix_dashboard_triple_rerender.js, Version0009_fix_dashappbar_missing_user_data.js |\n`;
  
  // Insert after table header
  const tableEndIndex = tableMatch.index + tableMatch[0].length;
  content = content.slice(0, tableEndIndex) + scriptEntry + content.slice(tableEndIndex);
  
  // Add to execution history
  const historyRegex = /## Execution History\n\n/;
  const historyMatch = content.match(historyRegex);
  
  if (historyMatch) {
    const historyEndIndex = historyMatch.index + historyMatch[0].length;
    
    // Check if we already have a section for today
    const todaySectionRegex = new RegExp(`### ${today.replace(/-/g, '\\-')}`);
    const todaySectionMatch = content.match(todaySectionRegex);
    
    if (todaySectionMatch) {
      // Add to today's section
      const todaySectionEndIndex = todaySectionMatch.index + todaySectionMatch[0].length;
      const entryLine = `\n- Created Version0010_fix_tenant_ID_casing_in_scripts.js - Fixed attribute name casing for tenant_ID in existing fix scripts`;
      content = content.slice(0, todaySectionEndIndex) + entryLine + content.slice(todaySectionEndIndex);
    } else {
      // Add a new section for today
      const newSection = `### ${today}\n- Created Version0010_fix_tenant_ID_casing_in_scripts.js - Fixed attribute name casing for tenant_ID in existing fix scripts\n\n`;
      content = content.slice(0, historyEndIndex) + newSection + content.slice(historyEndIndex);
    }
  }
  
  // Write the updated registry
  fs.writeFileSync(config.registryFile, content, 'utf8');
  console.log('Updated script registry');
}

/**
 * Fix scripts in public directory too
 */
function fixPublicScripts() {
  console.log('\nChecking for scripts in frontend public directory...');
  
  for (const scriptName of config.targetScripts) {
    const publicScriptPath = path.join(config.frontendTargetDir, scriptName);
    
    if (fs.existsSync(publicScriptPath)) {
      console.log(`\nFixing public script: ${publicScriptPath}`);
      fixScript(publicScriptPath);
    } else {
      console.log(`Public script not found: ${publicScriptPath}`);
    }
  }
}

/**
 * Main function
 */
function main() {
  console.log('Fixing tenant_ID casing in scripts...\n');
  
  const fixedScripts = [];
  
  // Fix each script
  for (const scriptName of config.targetScripts) {
    const scriptPath = path.join(config.scriptsDir, scriptName);
    console.log(`Processing script: ${scriptName}`);
    
    const fixed = fixScript(scriptPath);
    if (fixed) {
      fixedScripts.push(scriptName);
    }
  }
  
  // Also fix scripts in public directory
  fixPublicScripts();
  
  // Update registry
  updateRegistry();
  
  // Summary
  console.log('\nSummary:');
  if (fixedScripts.length > 0) {
    console.log(`- Fixed ${fixedScripts.length} scripts: ${fixedScripts.join(', ')}`);
    console.log('- Updated script registry');
    console.log('\nYou should now deploy the fixed scripts using:');
    console.log('  node scripts/deploy_dashboard_fixes.js');
    console.log('\nThen restart your application.');
  } else {
    console.log('- No scripts needed fixing');
  }
}

// Run the main function
main(); 