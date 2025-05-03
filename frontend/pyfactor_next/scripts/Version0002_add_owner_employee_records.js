/**
 * Version0002_add_owner_employee_records.js
 * 
 * This script adds employee records for users with the 'owner' role.
 * It ensures that all owners have corresponding employee records for accounting purposes.
 * 
 * Author: Claude
 * Date: 2024-03-21
 * Version: 0.0.2
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
    backendPath: '/Users/kuoldeng/projectx/backend/pyfactor',
    frontendPath: '/Users/kuoldeng/projectx/frontend/pyfactor_next',
    logDir: '/Users/kuoldeng/projectx/scripts/logs',
    backupDir: '/Users/kuoldeng/projectx/scripts/backups'
};

// Ensure log directory exists
if (!fs.existsSync(config.logDir)) {
    fs.mkdirSync(config.logDir, { recursive: true });
}

// Ensure backup directory exists
if (!fs.existsSync(config.backupDir)) {
    fs.mkdirSync(config.backupDir, { recursive: true });
}

// Logging function
function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    const logFile = path.join(config.logDir, 'version0002_add_owner_employee_records.log');
    fs.appendFileSync(logFile, logMessage);
    console.log(message);
}

// Backup function
function backupFile(filePath) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = path.basename(filePath);
    const backupPath = path.join(config.backupDir, `${fileName}.${timestamp}.bak`);
    fs.copyFileSync(filePath, backupPath);
    log(`Backed up ${filePath} to ${backupPath}`);
}

// Add employee records for owners
function addOwnerEmployeeRecords() {
    log('Starting to add employee records for owners...');
    
    // Backup relevant files
    const filesToBackup = [
        path.join(config.backendPath, 'hr/models.py'),
        path.join(config.backendPath, 'hr/views.py'),
        path.join(config.backendPath, 'hr/serializers.py')
    ];
    
    filesToBackup.forEach(file => {
        if (fs.existsSync(file)) {
            backupFile(file);
        }
    });
    
    // Create Python script to add employee records
    const pythonScript = `
import os
import django
import sys
from django.utils import timezone

# Set up Django environment
sys.path.append('${config.backendPath}')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from hr.models import Employee
from django.db import transaction

User = get_user_model()

def add_owner_employee_records():
    # Get all users with owner role
    owners = User.objects.filter(role='owner')
    print(f"Found {owners.count()} users with owner role")
    
    for owner in owners:
        # Check if employee record already exists
        if not hasattr(owner, 'employee_profile'):
            # Create employee record
            employee = Employee.objects.create(
                user=owner,
                username=owner.email,  # Required by AbstractUser
                email=owner.email,
                first_name=owner.first_name,
                last_name=owner.last_name,
                job_title='Owner',
                employment_type='FT',  # Full-time
                active=True,
                areManager=True,
                ID_verified=True,
                date_joined=owner.date_joined,
                role='employee',  # Set role to employee since this is an employee record
                is_active=True,
                is_staff=False,
                is_superuser=False
            )
            print(f"Created employee record for owner: {owner.email}")
        else:
            print(f"Employee record already exists for owner: {owner.email}")

if __name__ == '__main__':
    with transaction.atomic():
        add_owner_employee_records()
    `;
    
    // Write Python script to file
    const scriptPath = path.join(config.backendPath, 'scripts/add_owner_employee_records.py');
    fs.writeFileSync(scriptPath, pythonScript);
    
    // Execute Python script
    try {
        execSync(`cd ${config.backendPath} && python scripts/add_owner_employee_records.py`, { stdio: 'inherit' });
        log('Successfully added employee records for owners');
    } catch (error) {
        log(`Error adding employee records: ${error.message}`);
        throw error;
    }
}

// Update user creation process
function updateUserCreation() {
    log('Updating user creation process...');
    
    const viewsPath = path.join(config.backendPath, 'accounts/views.py');
    if (!fs.existsSync(viewsPath)) {
        log('User views file not found');
        return;
    }
    
    backupFile(viewsPath);
    
    let content = fs.readFileSync(viewsPath, 'utf8');
    
    // Add import for Employee model
    if (!content.includes('from hr.models import Employee')) {
        content = content.replace(
            'from django.contrib.auth import get_user_model',
            'from django.contrib.auth import get_user_model\nfrom hr.models import Employee'
        );
    }
    
    // Update user creation to add employee record for owners
    const userCreationPattern = /def create_user\(.*?\):/s;
    if (content.match(userCreationPattern)) {
        content = content.replace(
            userCreationPattern,
            `def create_user(self, email, password=None, **extra_fields):
        """
        Create and save a user with the given email and password.
        Also creates an employee record if the user is an owner.
        """
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        
        # Create employee record for owners
        if extra_fields.get('role') == 'owner':
            Employee.objects.create(
                user=user,
                username=user.email,  # Required by AbstractUser
                email=user.email,
                first_name=user.first_name,
                last_name=user.last_name,
                job_title='Owner',
                employment_type='FT',  # Full-time
                active=True,
                areManager=True,
                ID_verified=True,
                date_joined=user.date_joined,
                role='employee',  # Set role to employee since this is an employee record
                is_active=True,
                is_staff=False,
                is_superuser=False
            )
        
        return user`
        );
    }
    
    fs.writeFileSync(viewsPath, content);
    log('Updated user creation process');
}

// Update script registry
function updateScriptRegistry() {
    log('Updating script registry...');
    
    const registryPath = path.join(config.backendPath, 'scripts/script_registry.md');
    if (!fs.existsSync(registryPath)) {
        log('Script registry not found');
        return;
    }
    
    backupFile(registryPath);
    
    let content = fs.readFileSync(registryPath, 'utf8');
    
    // Add entry for this script
    const newEntry = `
## Version 0.0.2 - Add Owner Employee Records
- Date: 2024-03-21
- Author: Claude
- Description: Added employee records for users with owner role and updated user creation process to automatically create employee records for new owners.
- Changes:
  - Added migration script to create employee records for existing owners
  - Updated user creation process to automatically create employee records for new owners
  - Added user field to Employee model to link with User model
`;
    
    content += newEntry;
    fs.writeFileSync(registryPath, content);
    log('Updated script registry');
}

// Main function
async function main() {
    try {
        log('Starting Version 0.0.2 migration...');
        
        // Add employee records for owners
        await addOwnerEmployeeRecords();
        
        // Update user creation process
        await updateUserCreation();
        
        // Update script registry
        await updateScriptRegistry();
        
        log('Version 0.0.2 migration completed successfully');
    } catch (error) {
        log(`Error during migration: ${error.message}`);
        process.exit(1);
    }
}

// Run the script
main(); 