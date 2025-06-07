#!/usr/bin/env node

/**
 * Script: Version0151_verify_auth0_hardcoded_values.mjs
 * Purpose: Scan for hardcoded Auth0 configuration values that may be causing issues
 * Date: 2025-06-07
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Config
const SCRIPT_REGISTRY_PATH = 'frontend/pyfactor_next/scripts/script_registry.md';
const BASE_DIR = 'frontend/pyfactor_next';
const AUTH0_DOMAIN_PATTERNS = [
  /['"]auth\.dottapps\.com['"]/g,
  /['"]dev-cbyy63jovi6zrcos\.us\.auth0\.com['"]/g,
  /['"]\w+\.auth0\.com['"]/g
];
const AUTH0_CLIENT_ID_PATTERNS = [
  /['"]9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF['"]/g,
  /clientId:\s*['"][a-zA-Z0-9]{24,}['"]/g
];
const CRITICAL_FILES = [
  'src/config/auth0.js',
  'src/app/api/auth/login/route.js',
  'src/app/api/auth/[...auth0]/route.js',
  'next.config.js',
  'src/utils/securityHeaders.js',
  'src/middleware.js'
];

// Report structure
const report = {
  hardcodedValues: [],
  inconsistentDomains: false,
  domainValues: new Set(),
  clientIdValues: new Set(),
  recommendations: []
};

// Documentation
const DOCUMENTATION = `# Auth0 Hardcoded Values Verification

## Problem
Hardcoded Auth0 configuration values can cause conflicts with environment variables, leading to authentication errors.

## Analysis Process
This script scans the codebase for:
1. Hardcoded Auth0 domains
2. Hardcoded Auth0 client IDs
3. Inconsistencies between different files
4. Security policy configurations that might restrict Auth0 connections

## Critical Files Examined
${CRITICAL_FILES.map(file => `- ${file}`).join('\n')}

## Findings
(Populated during script execution)

## Recommendations
(Populated during script execution)
`;

// Utility function to scan a file for patterns
function scanFileForPatterns(filePath, patterns, description) {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`Warning: File not found: ${filePath}`);
      return [];
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const matches = [];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        const line = content.split('\n')[lineNumber - 1].trim();
        
        matches.push({
          file: filePath,
          line: lineNumber,
          value: match[0],
          context: line,
          description
        });
        
        if (description.includes('domain')) {
          report.domainValues.add(match[0].replace(/['"]/g, ''));
        } else if (description.includes('client ID')) {
          report.clientIdValues.add(match[0].replace(/['"]/g, ''));
        }
      }
    });
    
    return matches;
  } catch (error) {
    console.error(`Error scanning file ${filePath}:`, error);
    return [];
  }
}

// Main execution
console.log('Starting Auth0 hardcoded values verification...');

// Scan critical files
CRITICAL_FILES.forEach(file => {
  const filePath = path.join(BASE_DIR, file);
  
  // Scan for Auth0 domains
  const domainMatches = scanFileForPatterns(
    filePath, 
    AUTH0_DOMAIN_PATTERNS,
    'Auth0 domain'
  );
  
  // Scan for client IDs
  const clientIdMatches = scanFileForPatterns(
    filePath,
    AUTH0_CLIENT_ID_PATTERNS,
    'Auth0 client ID'
  );
  
  report.hardcodedValues.push(...domainMatches, ...clientIdMatches);
});

// Check for domain inconsistencies
if (report.domainValues.size > 1) {
  report.inconsistentDomains = true;
  report.recommendations.push(
    'Multiple Auth0 domains found. Standardize on a single domain to prevent authentication issues.'
  );
}

// Check if using custom domain
const isUsingCustomDomain = Array.from(report.domainValues).some(domain => !domain.includes('.auth0.com'));
if (isUsingCustomDomain) {
  report.recommendations.push(
    'Custom Auth0 domain detected. Ensure all Auth0 API calls use the custom domain.'
  );
}

// Check environment variables
try {
  console.log('Checking environment variables...');
  const envFileContent = fs.existsSync(`${BASE_DIR}/.env.local`) 
    ? fs.readFileSync(`${BASE_DIR}/.env.local`, 'utf8')
    : '';
  
  const envDomain = envFileContent.match(/NEXT_PUBLIC_AUTH0_DOMAIN=(.+)$/m);
  const envClientId = envFileContent.match(/NEXT_PUBLIC_AUTH0_CLIENT_ID=(.+)$/m);
  
  if (envDomain && report.domainValues.size > 0) {
    const envDomainValue = envDomain[1].trim();
    if (!Array.from(report.domainValues).includes(envDomainValue)) {
      report.recommendations.push(
        `Environment variable NEXT_PUBLIC_AUTH0_DOMAIN (${envDomainValue}) doesn't match any hardcoded domains (${Array.from(report.domainValues).join(', ')}).`
      );
    }
  }
  
  if (envClientId && report.clientIdValues.size > 0) {
    const envClientIdValue = envClientId[1].trim();
    if (!Array.from(report.clientIdValues).includes(envClientIdValue)) {
      report.recommendations.push(
        'Environment variable NEXT_PUBLIC_AUTH0_CLIENT_ID doesn\'t match any hardcoded client IDs.'
      );
    }
  }
} catch (error) {
  console.error('Error checking environment variables:', error);
}

// Check for Content-Security-Policy issues
try {
  console.log('Checking Content-Security-Policy configuration...');
  const configFiles = [
    path.join(BASE_DIR, 'next.config.js'),
    path.join(BASE_DIR, 'src/utils/securityHeaders.js')
  ];
  
  configFiles.forEach(filePath => {
    if (!fs.existsSync(filePath)) return;
    
    const content = fs.readFileSync(filePath, 'utf8');
    const cspMatch = content.match(/Content-Security-Policy[^"']*["']([^"']+)["']/);
    
    if (cspMatch) {
      const cspValue = cspMatch[1];
      const authDomains = Array.from(report.domainValues);
      
      // Check if all Auth0 domains are in CSP
      authDomains.forEach(domain => {
        if (!cspValue.includes(domain)) {
          report.recommendations.push(
            `Auth0 domain "${domain}" is not included in Content-Security-Policy in ${filePath}.`
          );
        }
      });
    }
  });
} catch (error) {
  console.error('Error checking Content-Security-Policy:', error);
}

// Generate report
const reportContent = DOCUMENTATION
  .replace('(Populated during script execution)', report.hardcodedValues.length === 0 
    ? 'No hardcoded Auth0 values found.' 
    : report.hardcodedValues.map(match => 
        `- **${match.file}** (line ${match.line}): ${match.description} - ${match.value}\n  Context: \`${match.context}\``
      ).join('\n')
  )
  .replace('(Populated during script execution)', report.recommendations.length === 0
    ? 'No issues detected that require action.'
    : report.recommendations.map(rec => `- ${rec}`).join('\n')
  );

// Save report
const reportPath = path.join(BASE_DIR, 'scripts', 'AUTH0_HARDCODED_VALUES_REPORT.md');
fs.writeFileSync(reportPath, reportContent);
console.log(`Saved report to ${reportPath}`);

// Update script registry
function updateScriptRegistry() {
  if (!fs.existsSync(SCRIPT_REGISTRY_PATH)) {
    console.error(`Error: Script registry not found at ${SCRIPT_REGISTRY_PATH}`);
    return false;
  }
  
  const registry = fs.readFileSync(SCRIPT_REGISTRY_PATH, 'utf8');
  const updatedRegistry = registry + `\n| Version0151_verify_auth0_hardcoded_values.mjs | Verify Auth0 hardcoded values | 2025-06-07 | Completed | Identified ${report.hardcodedValues.length} hardcoded values, generated recommendations |`;
  
  fs.writeFileSync(SCRIPT_REGISTRY_PATH, updatedRegistry);
  console.log(`Updated script registry at ${SCRIPT_REGISTRY_PATH}`);
  
  return true;
}

// Run the registry update
updateScriptRegistry();

console.log('Summary:');
console.log(`- Found ${report.hardcodedValues.length} hardcoded Auth0 values`);
console.log(`- Found ${report.domainValues.size} unique Auth0 domains: ${Array.from(report.domainValues).join(', ')}`);
console.log(`- Found ${report.clientIdValues.size} unique Auth0 client IDs`);
console.log(`- Generated ${report.recommendations.length} recommendations`);

console.log('\nDomain analysis complete! Check the report for details.');
