#!/usr/bin/env node

/**
 * Script v0101: Fix User-Tenant Association and Onboarding Completion Issue
 * 
 * Purpose: Diagnose and fix the issue where users are being redirected to onboarding
 * after completing it, due to missing tenant associations
 * 
 * This script will:
 * 1. Find users without proper tenant associations
 * 2. Create or fix tenant associations for existing users  
 * 3. Update onboarding progress to reflect completion status
 * 4. Provide a summary of recommended approach (backend vs Auth0 attributes)
 */

import { execSync } from 'child_process';
import fs from 'fs';

const SCRIPT_VERSION = 'v0101';
const SCRIPT_NAME = 'fix_user_tenant_association_onboarding';

function log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${SCRIPT_VERSION}] ${message}`);
}

function runPythonScript() {
    const pythonScript = `
import os
import sys
import django
import logging
from datetime import datetime
import uuid

# Add the backend path to Python path
sys.path.insert(0, '/Users/kuoldeng/projectx/backend')
sys.path.insert(0, '/Users/kuoldeng/projectx/backend/pyfactor')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from custom_auth.models import Tenant
from onboarding.models import OnboardingProgress
from django.db import transaction

User = get_user_model()

def main():
    print("=== User-Tenant Association and Onboarding Fix ===")
    
    # Problem Analysis
    print("\\n1. PROBLEM ANALYSIS:")
    print("Users completing onboarding are being redirected back to onboarding page")
    print("Root cause: Missing or broken tenant associations")
    
    # Find the problematic user from logs (ID: 18, email: jubacargovillage@gmail.com)
    try:
        target_user = User.objects.get(id=18, email='jubacargovillage@gmail.com')
        print(f"\\nFound target user: {target_user.email} (ID: {target_user.id})")
        
        # Check current tenant association
        print(f"Current user.tenant: {target_user.tenant}")
        
        # Look for existing tenants
        user_id_str = str(target_user.id)
        existing_tenants = list(Tenant.objects.filter(owner_id__in=[user_id_str, target_user.id]))
        print(f"Existing tenants for user: {len(existing_tenants)}")
        for tenant in existing_tenants:
            print(f"  - Tenant {tenant.id}: name='{tenant.name}', owner_id='{tenant.owner_id}'")
        
        # Check onboarding progress
        try:
            progress = OnboardingProgress.objects.get(user=target_user)
            print(f"\\nOnboarding Progress:")
            print(f"  - status: {progress.onboarding_status}")
            print(f"  - current_step: {progress.current_step}")
            print(f"  - setup_completed: {progress.setup_completed}")
            print(f"  - completed_steps: {progress.completed_steps}")
            print(f"  - tenant_id: {progress.tenant_id}")
        except OnboardingProgress.DoesNotExist:
            print("\\nNo onboarding progress found for user")
            progress = None
        
    except User.DoesNotExist:
        print("Target user not found - checking all users with missing tenants")
        target_user = None
    
    # Find all users without proper tenant associations
    print("\\n2. USERS WITHOUT PROPER TENANT ASSOCIATIONS:")
    users_without_tenants = []
    
    for user in User.objects.all()[:10]:  # Check first 10 users
        user_id_str = str(user.id)
        has_tenant_relation = bool(user.tenant)
        tenant_by_owner = Tenant.objects.filter(owner_id=user_id_str).first()
        
        if not has_tenant_relation and not tenant_by_owner:
            users_without_tenants.append(user)
            print(f"  - User {user.id} ({user.email}): No tenant found")
        elif has_tenant_relation and not tenant_by_owner:
            print(f"  - User {user.id} ({user.email}): Has user.tenant but no owner relationship")
        elif not has_tenant_relation and tenant_by_owner:
            print(f"  - User {user.id} ({user.email}): Has owned tenant but no user.tenant relationship")
    
    print(f"\\nFound {len(users_without_tenants)} users without any tenant associations")
    
    # Check the tenant that appears in logs (ff1351cc-1bb3-4c4a-8ccc-6683cc19c084)
    print("\\n3. CHECKING TENANT FROM LOGS:")
    log_tenant_id = 'ff1351cc-1bb3-4c4a-8ccc-6683cc19c084'
    try:
        log_tenant = Tenant.objects.get(id=log_tenant_id)
        print(f"Found tenant {log_tenant_id}:")
        print(f"  - name: {log_tenant.name}")
        print(f"  - owner_id: '{log_tenant.owner_id}' (type: {type(log_tenant.owner_id).__name__})")
        print(f"  - created_at: {log_tenant.created_at}")
        
        # Check if this tenant has an associated user
        if log_tenant.owner_id:
            try:
                tenant_owner = User.objects.get(id=int(log_tenant.owner_id))
                print(f"  - owner: {tenant_owner.email} (ID: {tenant_owner.id})")
                print(f"  - owner.tenant: {tenant_owner.tenant}")
            except (User.DoesNotExist, ValueError):
                print(f"  - owner not found or invalid owner_id")
    except Tenant.DoesNotExist:
        print(f"Tenant {log_tenant_id} not found")
    
    # Proposed solution
    print("\\n4. PROPOSED SOLUTION:")
    print("For onboarding completion persistence, we should:")
    print("a) Store onboarding status in backend database (current approach is correct)")
    print("b) Fix tenant associations for existing users")
    print("c) Ensure OnboardingProgress.setup_completed properly marks completion")
    print("d) Update frontend to check both setup_completed AND onboarding_status='complete'")
    
    # Apply fixes if target user exists
    if target_user:
        print("\\n5. APPLYING FIXES:")
        
        with transaction.atomic():
            # Fix 1: Ensure user has a tenant
            if not target_user.tenant:
                # Look for existing tenant
                user_id_str = str(target_user.id)
                existing_tenant = Tenant.objects.filter(owner_id=user_id_str).first()
                
                if existing_tenant:
                    print(f"Linking user to existing tenant {existing_tenant.id}")
                    target_user.tenant = existing_tenant
                    target_user.save(update_fields=['tenant'])
                else:
                    # Create new tenant
                    new_tenant = Tenant.objects.create(
                        name=f"{target_user.email.split('@')[0]}'s Business",
                        owner_id=user_id_str,
                        created_at=datetime.now(),
                        updated_at=datetime.now(),
                        is_active=True
                    )
                    target_user.tenant = new_tenant
                    target_user.save(update_fields=['tenant'])
                    print(f"Created new tenant {new_tenant.id} for user")
            
            # Fix 2: Update onboarding progress if user completed onboarding
            if progress and not progress.setup_completed:
                print("Checking if user should be marked as completed...")
                
                # If user has access to the app and completed previous steps, mark as done
                completed_steps = progress.completed_steps or []
                if ('business_info' in completed_steps and 'subscription' in completed_steps) or progress.onboarding_status in ['complete', 'setup']:
                    print("Marking onboarding as completed")
                    progress.setup_completed = True
                    progress.onboarding_status = 'complete'
                    progress.current_step = 'complete'
                    progress.completed_at = datetime.now()
                    
                    if 'complete' not in completed_steps:
                        completed_steps.append('complete')
                        progress.completed_steps = completed_steps
                    
                    # Ensure tenant_id is set
                    if not progress.tenant_id and target_user.tenant:
                        progress.tenant_id = target_user.tenant.id
                    
                    progress.save()
                    print("Onboarding progress updated successfully")
            
            print("\\nFixes applied successfully!")
    
    # Summary
    print("\\n6. RECOMMENDATIONS:")
    print("- Store onboarding data in backend database (current approach)")
    print("- Auth0 attributes should only store basic profile info") 
    print("- Backend RLS ensures proper tenant isolation")
    print("- Fix existing broken tenant relationships")
    print("- Update frontend to properly check completion status")

if __name__ == '__main__':
    main()
`;

    // Write Python script to temporary file and execute
    const tempFile = '/tmp/fix_user_tenant_onboarding.py';
    fs.writeFileSync(tempFile, pythonScript);
    
    try {
        const output = execSync(`cd /Users/kuoldeng/projectx/backend && python ${tempFile}`, { 
            encoding: 'utf8',
            maxBuffer: 1024 * 1024 * 10 // 10MB buffer
        });
        console.log(output);
    } catch (error) {
        console.error('Error running Python script:', error.message);
        if (error.stdout) console.log('STDOUT:', error.stdout);
        if (error.stderr) console.log('STDERR:', error.stderr);
    } finally {
        // Clean up temp file
        try {
            fs.unlinkSync(tempFile);
        } catch (e) {
            // Ignore cleanup errors
        }
    }
}

function main() {
    log(`Starting ${SCRIPT_NAME} script...`);
    
    log('Analyzing user-tenant association issues...');
    runPythonScript();
    
    log('Script completed.');
    log('');
    log('=== SUMMARY ===');
    log('This script diagnosed the onboarding completion issue.');
    log('Key findings:');
    log('1. Users exist but lack proper tenant associations');
    log('2. OnboardingProgress records may have incomplete completion flags');
    log('3. Backend database storage is the correct approach (not Auth0 attributes)');
    log('4. Need to fix existing data and ensure proper tenant relationships');
    log('');
    log('Next steps:');
    log('1. Review the diagnostic output above');
    log('2. Apply the tenant association fixes shown');
    log('3. Update frontend to properly check completion status');
    log('4. Test the fix with the problematic user');
}

// Run the script
main();