// Version0001_fix_user_initials_CognitoAttributes.js
// v1.0
// Issue Reference: User Initials Display Issue in DashAppBar
//
// This script updates the getUserInitials method in CognitoAttributes.js to:
// - Always trim whitespace from given_name and family_name
// - Use only the documented attribute names (no variations)
// - Fallback to trimmed email or 'U' as last resort
//
// It also updates the script registry and provides a summary of changes.
//
// Usage: Run this script from the project root with `node scripts/Version0001_fix_user_initials_CognitoAttributes.js`
//
// Author: AI Assistant
// Date: 2025-05-05

import fs from 'fs';
import path from 'path';

const TARGET_FILE = path.resolve('src/utils/CognitoAttributes.js');
const REGISTRY_FILE = path.resolve('scripts/script_registry.md');
const REGISTRY_JSON = path.resolve('scripts/script_registry.json');
const BACKUP_DIR = path.resolve('scripts/backups');
const VERSION = 'v1.0';
const ISSUE_REF = 'User Initials Display Issue in DashAppBar';

function updateGetUserInitials(content) {
  // Replace the getUserInitials method with the improved version
  return content.replace(/getUserInitials\s*\([^)]*\)\s*{[\s\S]*?return 'U';[\s\S]*?}/,
`getUserInitials(attributes) {
    // Only use documented attribute names and always trim whitespace
    const firstName = this.getValue(attributes, this.GIVEN_NAME, '').trim();
    const lastName = this.getValue(attributes, this.FAMILY_NAME, '').trim();
    if (firstName && lastName) {
      return \`\${firstName.charAt(0).toUpperCase()}\${lastName.charAt(0).toUpperCase()}\`;
    }
    if (firstName) {
      return firstName.charAt(0).toUpperCase();
    }
    if (lastName) {
      return lastName.charAt(0).toUpperCase();
    }
    const email = this.getValue(attributes, this.EMAIL, '').trim();
    if (email && email.includes('@')) {
      const namePart = email.split('@')[0];
      return namePart.charAt(0).toUpperCase();
    }
    return 'U'; // Default fallback
  }`);
}

function updateRegistry() {
  // Update script_registry.md
  const entry = `\n- Version0001_fix_user_initials_CognitoAttributes.js (${VERSION}): Fixes user initials display logic in CognitoAttributes.js to trim whitespace and use only documented attribute names. [${new Date().toISOString()}] [${ISSUE_REF}]`;
  try {
    fs.appendFileSync(REGISTRY_FILE, entry);
  } catch (e) {
    console.error('Failed to update script_registry.md:', e);
  }
  // Update script_registry.json
  try {
    let json = [];
    if (fs.existsSync(REGISTRY_JSON)) {
      json = JSON.parse(fs.readFileSync(REGISTRY_JSON, 'utf-8'));
    }
    json.push({
      script: 'Version0001_fix_user_initials_CognitoAttributes.js',
      version: VERSION,
      date: new Date().toISOString(),
      issue: ISSUE_REF,
      status: 'executed',
      description: 'Fixes user initials display logic in CognitoAttributes.js to trim whitespace and use only documented attribute names.'
    });
    fs.writeFileSync(REGISTRY_JSON, JSON.stringify(json, null, 2));
  } catch (e) {
    console.error('Failed to update script_registry.json:', e);
  }
}

function main() {
  if (!fs.existsSync(TARGET_FILE)) {
    console.error('CognitoAttributes.js not found at', TARGET_FILE);
    process.exit(1);
  }
  // Backup already created by ops step
  let content = fs.readFileSync(TARGET_FILE, 'utf-8');
  const updated = updateGetUserInitials(content);
  if (content === updated) {
    console.log('No changes made to CognitoAttributes.js (already up to date)');
  } else {
    fs.writeFileSync(TARGET_FILE, updated, 'utf-8');
    console.log('Updated getUserInitials in CognitoAttributes.js');
  }
  updateRegistry();
  console.log('Script execution complete.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
} 