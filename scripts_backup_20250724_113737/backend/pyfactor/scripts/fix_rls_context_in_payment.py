#!/usr/bin/env python
"""
Fix RLS Context in Payment Views

This script adds proper tenant context setting to payment and onboarding completion views
to ensure all data is properly isolated by tenant.

Run with: python scripts/fix_rls_context_in_payment.py
"""

import os
import re
import shutil
from datetime import datetime

def backup_file(filepath):
    """Create a backup of the file before modifying"""
    backup_path = f"{filepath}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    shutil.copy2(filepath, backup_path)
    print(f"Created backup: {backup_path}")
    return backup_path

def fix_payment_view_rls():
    """Add tenant context setting to payment views"""
    
    payment_file = "/Users/kuoldeng/projectx/backend/pyfactor/onboarding/api/payment_views.py"
    
    if not os.path.exists(payment_file):
        print(f"ERROR: File not found: {payment_file}")
        return False
    
    # Read the file
    with open(payment_file, 'r') as f:
        content = f.read()
    
    # Create backup
    backup_path = backup_file(payment_file)
    
    # Check if already has RLS imports
    if "from custom_auth.rls import set_tenant_context" not in content:
        # Add import after other imports
        import_pattern = r'(from django\.utils import timezone\n)'
        content = re.sub(import_pattern, r'\1from custom_auth.rls import set_tenant_context\n', content)
    
    # Find the complete_payment_view function
    # Add tenant context setting after getting tenant_id
    pattern = r'(\s+tenant_id = request\.data\.get\([\'"]tenant_id[\'"]\))\n'
    replacement = r'''\1
    
    # CRITICAL: Set tenant context for RLS
    if tenant_id:
        try:
            set_tenant_context(tenant_id)
            logger.info(f"[PaymentComplete] Set tenant context: {tenant_id}")
        except Exception as e:
            logger.error(f"[PaymentComplete] Failed to set tenant context: {str(e)}")
    else:
        logger.warning("[PaymentComplete] No tenant_id provided - data isolation may be compromised")
'''
    
    if "set_tenant_context" not in content:
        content = re.sub(pattern, replacement, content)
        print("✓ Added tenant context setting to complete_payment_view")
    else:
        print("Tenant context already set in complete_payment_view")
    
    # Write the modified content
    with open(payment_file, 'w') as f:
        f.write(content)
    
    print(f"✓ Fixed payment view RLS in {payment_file}")
    print(f"  - Original backed up to: {backup_path}")
    
    return True

def fix_onboarding_complete_rls():
    """Ensure onboarding completion properly sets tenant context"""
    
    onboarding_file = "/Users/kuoldeng/projectx/backend/pyfactor/onboarding/views/onboarding_api.py"
    
    if not os.path.exists(onboarding_file):
        print(f"ERROR: File not found: {onboarding_file}")
        return False
    
    # Read the file
    with open(onboarding_file, 'r') as f:
        content = f.read()
    
    # Create backup
    backup_path = backup_file(onboarding_file)
    
    # Check if already has RLS imports
    if "from custom_auth.rls import set_tenant_context" not in content:
        # Add import
        import_section = "from django.utils import timezone"
        if import_section in content:
            content = content.replace(
                import_section,
                f"{import_section}\nfrom custom_auth.rls import set_tenant_context"
            )
    
    # Find where we get tenant_id and add context setting
    # Look for the section after getting tenant from user
    pattern = r'(tenant_id = str\(request\.user\.tenant\.id\))'
    replacement = r'''\1
                
                # Set RLS context for proper data isolation
                try:
                    set_tenant_context(tenant_id)
                    logger.info(f"[CompleteOnboarding] Set RLS context for tenant: {tenant_id}")
                except Exception as e:
                    logger.error(f"[CompleteOnboarding] Failed to set RLS context: {str(e)}")'''
    
    if pattern in content and "set_tenant_context(tenant_id)" not in content:
        content = re.sub(pattern, replacement, content)
        print("✓ Added tenant context to CompleteOnboardingAPI")
    
    # Write the modified content
    with open(onboarding_file, 'w') as f:
        f.write(content)
    
    print(f"✓ Fixed onboarding API RLS in {onboarding_file}")
    
    return True

def add_rls_helper_module():
    """Create a helper module for consistent RLS usage"""
    
    rls_helper_file = "/Users/kuoldeng/projectx/backend/pyfactor/custom_auth/rls.py"
    
    if os.path.exists(rls_helper_file):
        print(f"RLS helper already exists: {rls_helper_file}")
        return True
    
    content = '''"""
Row Level Security (RLS) Helper Functions

Provides consistent interface for setting tenant context across the application.
"""

from django.db import connection
import logging

logger = logging.getLogger(__name__)

def set_tenant_context(tenant_id):
    """
    Set the current tenant context for RLS policies.
    
    This sets a PostgreSQL session variable that RLS policies use
    to filter data by tenant.
    
    Args:
        tenant_id: The UUID of the tenant to set as context
    """
    if not tenant_id:
        logger.warning("Attempted to set tenant context with empty tenant_id")
        return
    
    try:
        with connection.cursor() as cursor:
            # Set the tenant context for this database session
            cursor.execute(
                "SET LOCAL rls.tenant_id = %s",
                [str(tenant_id)]
            )
            logger.debug(f"Set RLS tenant context: {tenant_id}")
    except Exception as e:
        logger.error(f"Failed to set tenant context: {str(e)}")
        raise

def clear_tenant_context():
    """Clear the current tenant context."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SET LOCAL rls.tenant_id = ''")
            logger.debug("Cleared RLS tenant context")
    except Exception as e:
        logger.error(f"Failed to clear tenant context: {str(e)}")

def get_current_tenant():
    """Get the current tenant context from the database session."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SHOW rls.tenant_id")
            result = cursor.fetchone()
            return result[0] if result and result[0] else None
    except Exception as e:
        logger.debug(f"No tenant context set: {str(e)}")
        return None
'''
    
    os.makedirs(os.path.dirname(rls_helper_file), exist_ok=True)
    
    with open(rls_helper_file, 'w') as f:
        f.write(content)
    
    print(f"✓ Created RLS helper module at {rls_helper_file}")
    return True

def main():
    print("RLS Context Fixer for Payment and Onboarding")
    print("=" * 50)
    print()
    
    print("This script ensures proper tenant isolation by adding")
    print("RLS context setting to payment and onboarding views.")
    print()
    
    # Create RLS helper module
    print("1. Creating RLS helper module...")
    add_rls_helper_module()
    print()
    
    # Fix payment view
    print("2. Fixing payment view RLS...")
    fix_payment_view_rls()
    print()
    
    # Fix onboarding completion
    print("3. Fixing onboarding completion RLS...")
    fix_onboarding_complete_rls()
    print()
    
    print("=" * 50)
    print("IMPORTANT: After running this script:")
    print("1. Review the changes in the backed up files")
    print("2. Test payment flow with proper tenant isolation")
    print("3. Verify data is saved to correct tenant")
    print("4. Deploy the backend changes")
    print()
    print("The fix ensures all critical operations set tenant context")
    print("for proper data isolation in multi-tenant environment.")

if __name__ == "__main__":
    main()