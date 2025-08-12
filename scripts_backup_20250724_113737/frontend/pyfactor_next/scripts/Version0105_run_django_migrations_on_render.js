#!/usr/bin/env node

/**
 * Version0105_run_django_migrations_on_render.js
 * 
 * Instructions to fix Django session table issue on Render
 * 
 * Author: Claude
 * Date: 2025-01-18
 */

const fs = require('fs');
const path = require('path');

const SCRIPT_VERSION = "0105";
const SCRIPT_NAME = "run_django_migrations_on_render";

console.log('='.repeat(60));
console.log(`Django Session Table Fix Instructions`);
console.log(`Version: ${SCRIPT_VERSION}`);
console.log('='.repeat(60));
console.log();

console.log('URGENT: Django session table is missing in production!');
console.log('This is causing the 500 error when trying to establish sessions.');
console.log();

console.log('To fix this issue, SSH into your Render backend service and run:');
console.log();
console.log('1. First, try the quick fix script:');
console.log('   bash scripts/quick_fix_django_sessions.sh');
console.log();
console.log('2. If that doesn\'t work, run migrations manually:');
console.log('   python manage.py migrate sessions --run-syncdb');
console.log('   python manage.py migrate');
console.log();
console.log('3. Or use the Python migration script:');
console.log('   python scripts/fix_django_session_table.py');
console.log();

console.log('Error Details:');
console.log('- Error: relation "django_session" does not exist');
console.log('- Location: Django CSRF middleware trying to access sessions');
console.log('- Impact: All session operations failing with 500 error');
console.log();

console.log('Root Cause:');
console.log('- Django is configured to use database-backed sessions');
console.log('- The django_session table was never created in production');
console.log('- Django\'s session middleware requires this table to exist');
console.log();

console.log('Quick Test After Fix:');
console.log('In the Render shell, run:');
console.log('python manage.py shell');
console.log('>>> from django.contrib.sessions.models import Session');
console.log('>>> Session.objects.count()');
console.log('# Should return a number without error');
console.log();

// Update script registry
const registryPath = path.join(__dirname, 'script_registry.md');
const registryEntry = `
### Version${SCRIPT_VERSION}_${SCRIPT_NAME}.js
- **Version**: ${SCRIPT_VERSION}
- **Purpose**: Instructions to fix missing django_session table on Render
- **Status**: ✅ CREATED (${new Date().toISOString()})
- **Issue**: django.db.utils.ProgrammingError: relation "django_session" does not exist
- **Solution**: Run Django migrations to create session table
- **Commands**: 
  - bash scripts/quick_fix_django_sessions.sh
  - python manage.py migrate sessions --run-syncdb
  - python scripts/fix_django_session_table.py
`;

// Append to registry
if (fs.existsSync(registryPath)) {
  const registry = fs.readFileSync(registryPath, 'utf8');
  fs.writeFileSync(registryPath, registry + registryEntry);
  console.log('✓ Updated script registry');
}