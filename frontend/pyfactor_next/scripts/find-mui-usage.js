#!/usr/bin/env node

/**
 * Script to find Material-UI (MUI) usage in the codebase
 * This helps identify components that need to be replaced with Tailwind CSS versions
 * 
 * Usage:
 * node scripts/find-mui-usage.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const SRC_DIR = path.join(__dirname, '..', 'src');
const EXCLUDED_DIRS = ['node_modules', '.next', 'build', 'dist', 'public'];
const MUI_PATTERNS = [
  '@mui/material',
  '@mui/icons-material',
  '@mui/styles',
  '@mui/system',
  '@mui/lab',
  '@emotion/react',
  '@emotion/styled',
  'createTheme',
  'ThemeProvider',
  'CssBaseline',
  'makeStyles',
  'withStyles',
  'styled \\(',
  'styled\\(',
];

// ANSI color codes for console output
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// Statistics
const stats = {
  totalFiles: 0,
  filesWithMui: 0,
  componentCounts: {},
};

/**
 * Find MUI component imports in a file
 */
function findMuiComponentsInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const components = [];
    
    // Check for MUI imports
    const importMatches = content.match(/import\s+{([^}]+)}\s+from\s+['"]@mui\/material['"]/g);
    if (importMatches) {
      importMatches.forEach(match => {
        const componentsInImport = match
          .replace(/import\s+{/, '')
          .replace(/}\s+from\s+['"]@mui\/material['"]/, '')
          .split(',')
          .map(comp => comp.trim())
          .filter(comp => comp);
        
        components.push(...componentsInImport);
      });
    }
    
    // Check for destructured imports
    const destructuredMatches = content.match(/import\s+[\w\s{},]*\s+from\s+['"]@mui\/material['"]/g);
    if (destructuredMatches) {
      destructuredMatches.forEach(match => {
        if (match.includes('{')) {
          const componentsSection = match.substring(
            match.indexOf('{') + 1,
            match.indexOf('}')
          );
          const componentsInImport = componentsSection
            .split(',')
            .map(comp => comp.trim())
            .filter(comp => comp);
          
          components.push(...componentsInImport);
        }
      });
    }
    
    return components;
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error.message);
    return [];
  }
}

/**
 * Check if file has any MUI usage
 */
function hasMuiUsage(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    for (const pattern of MUI_PATTERNS) {
      if (content.includes(pattern) || new RegExp(pattern).test(content)) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error(`Error checking file ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Process all files in a directory recursively
 */
function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const relativePath = path.relative(SRC_DIR, filePath);
    
    // Skip excluded directories
    if (EXCLUDED_DIRS.some(excluded => relativePath.startsWith(excluded))) {
      continue;
    }
    
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (
      stat.isFile() && 
      (filePath.endsWith('.js') || 
       filePath.endsWith('.jsx') || 
       filePath.endsWith('.ts') || 
       filePath.endsWith('.tsx'))
    ) {
      stats.totalFiles++;
      
      if (hasMuiUsage(filePath)) {
        stats.filesWithMui++;
        console.log(`${COLORS.yellow}MUI usage found in:${COLORS.reset} ${COLORS.cyan}${relativePath}${COLORS.reset}`);
        
        const components = findMuiComponentsInFile(filePath);
        if (components.length > 0) {
          console.log(`  ${COLORS.magenta}Components:${COLORS.reset} ${components.join(', ')}`);
          
          // Update component counts
          components.forEach(comp => {
            stats.componentCounts[comp] = (stats.componentCounts[comp] || 0) + 1;
          });
        }
      }
    }
  }
}

/**
 * Display summary of findings
 */
function displaySummary() {
  console.log('\n' + '='.repeat(80));
  console.log(`${COLORS.green}SUMMARY${COLORS.reset}`);
  console.log('='.repeat(80));
  console.log(`Total files scanned: ${stats.totalFiles}`);
  console.log(`Files with MUI usage: ${stats.filesWithMui}`);
  console.log(`Percentage of files using MUI: ${((stats.filesWithMui / stats.totalFiles) * 100).toFixed(2)}%`);
  
  if (Object.keys(stats.componentCounts).length > 0) {
    console.log('\n' + `${COLORS.green}MUI Component Usage (sorted by frequency):${COLORS.reset}`);
    
    // Sort components by usage count
    const sortedComponents = Object.entries(stats.componentCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([comp, count]) => `${comp}: ${count}`)
      .join('\n');
    
    console.log(sortedComponents);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`${COLORS.green}Next Steps:${COLORS.reset}`);
  console.log('1. Start by replacing the most frequently used components');
  console.log('2. Check the migration guide at src/components/replaced/MIGRATION.md');
  console.log('3. Run this script again after migrating to track progress');
  console.log('='.repeat(80) + '\n');
}

// Main function
function main() {
  console.log(`${COLORS.green}Scanning for MUI usage in ${SRC_DIR}...${COLORS.reset}\n`);
  processDirectory(SRC_DIR);
  displaySummary();
}

main(); 