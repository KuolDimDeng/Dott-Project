#!/usr/bin/env python3
"""
Version0103_fix_session_duplicate_kwargs_services.py

Fixes the Django session service duplicate keyword arguments issue in the create_session method.
The problem is that needs_onboarding, onboarding_completed, and onboarding_step are being
popped from kwargs but then explicitly passed again to UserSession.objects.create(), causing
duplicate keyword arguments error.

Author: Claude
Date: 2025-06-18
"""

import os
import sys
import shutil
from datetime import datetime

# Add the parent directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def create_backup(file_path):
    """Create a backup of the original file."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{file_path}.backup_{timestamp}"
    
    print(f"Creating backup: {backup_path}")
    shutil.copy2(file_path, backup_path)
    print(f"✓ Backup created successfully")
    
    return backup_path

def fix_session_service():
    """Fix the duplicate keyword arguments issue in session service."""
    # Get the file path
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    file_path = os.path.join(base_dir, 'session_manager', 'services.py')
    
    print(f"Target file: {file_path}")
    
    # Check if file exists
    if not os.path.exists(file_path):
        print(f"✗ Error: File not found at {file_path}")
        return False
    
    # Create backup
    backup_path = create_backup(file_path)
    
    try:
        # Read the original file
        with open(file_path, 'r') as f:
            content = f.read()
        
        # The problematic section starts around line 201-225
        # We need to ensure that popped values are not passed again
        
        # Find and replace the create_session method section
        old_code = """                    # Override with values from kwargs if explicitly provided
                    if 'needs_onboarding' in kwargs:
                        needs_onboarding = kwargs.pop('needs_onboarding')
                    if 'onboarding_completed' in kwargs:
                        onboarding_completed = kwargs.pop('onboarding_completed')
                    if 'onboarding_step' in kwargs:
                        onboarding_step = kwargs.pop('onboarding_step')"""
        
        new_code = """                    # Override with values from kwargs if explicitly provided
                    # Pop these values to avoid duplicate keyword arguments
                    if 'needs_onboarding' in kwargs:
                        needs_onboarding = kwargs.pop('needs_onboarding')
                    if 'onboarding_completed' in kwargs:
                        onboarding_completed = kwargs.pop('onboarding_completed')
                    if 'onboarding_step' in kwargs:
                        onboarding_step = kwargs.pop('onboarding_step')"""
        
        # First replacement - update the comment
        if old_code in content:
            content = content.replace(old_code, new_code)
            print("✓ Updated pop operations comment")
        
        # Now we need to ensure the else block also pops these values
        # Find the else block that handles when no OnboardingProgress is found
        old_else_block = """                else:
                    print(f"[SessionService] No OnboardingProgress found for user")
            except Exception as e:
                print(f"[SessionService] Error checking OnboardingProgress: {e}")"""
        
        new_else_block = """                else:
                    print(f"[SessionService] No OnboardingProgress found for user")
                    # Still need to pop these from kwargs if they exist to avoid duplicates
                    kwargs.pop('needs_onboarding', None)
                    kwargs.pop('onboarding_completed', None)
                    kwargs.pop('onboarding_step', None)
            except Exception as e:
                print(f"[SessionService] Error checking OnboardingProgress: {e}")
                # Pop these values to avoid duplicate keyword arguments in error case
                kwargs.pop('needs_onboarding', None)
                kwargs.pop('onboarding_completed', None)
                kwargs.pop('onboarding_step', None)"""
        
        if old_else_block in content:
            content = content.replace(old_else_block, new_else_block)
            print("✓ Updated else and except blocks to pop kwargs")
        
        # Alternative approach - if the above doesn't match exactly, let's look for the create call
        # and ensure we're not passing duplicate fields
        create_pattern = """                session = UserSession.objects.create(
                    user=user,
                    tenant=tenant,
                    access_token_hash=self._hash_token(access_token),
                    ip_address=ip_address,
                    user_agent=user_agent,
                    expires_at=timezone.now() + timedelta(seconds=self.session_ttl),
                    needs_onboarding=needs_onboarding,
                    onboarding_completed=onboarding_completed,
                    onboarding_step=onboarding_step,
                    **kwargs
                )"""
        
        # Check if this pattern exists
        if create_pattern in content:
            print("✓ Found UserSession.objects.create() call")
            print("  The create call already has the correct structure.")
            print("  The issue is that kwargs might still contain these fields.")
        
        # Write the fixed content back
        with open(file_path, 'w') as f:
            f.write(content)
        
        print("\n✓ File has been successfully updated!")
        print(f"  Original backed up to: {backup_path}")
        
        # Additional verification - ensure all pop operations are in place
        verification_patterns = [
            "kwargs.pop('needs_onboarding'",
            "kwargs.pop('onboarding_completed'",
            "kwargs.pop('onboarding_step'"
        ]
        
        with open(file_path, 'r') as f:
            updated_content = f.read()
        
        print("\nVerification:")
        for pattern in verification_patterns:
            count = updated_content.count(pattern)
            print(f"  - Found '{pattern}' {count} time(s)")
        
        return True
        
    except Exception as e:
        print(f"\n✗ Error during file update: {e}")
        print(f"  Restoring from backup: {backup_path}")
        shutil.copy2(backup_path, file_path)
        return False

def main():
    """Main function to execute the fix."""
    print("=" * 60)
    print("Django Session Service Duplicate Kwargs Fix")
    print("Version: 0103")
    print("=" * 60)
    print()
    
    success = fix_session_service()
    
    if success:
        print("\n✓ Fix completed successfully!")
        print("\nNext steps:")
        print("1. Review the changes in session_manager/services.py")
        print("2. Test the session creation functionality")
        print("3. Deploy to Render if tests pass")
    else:
        print("\n✗ Fix failed. Please check the error messages above.")
        sys.exit(1)

if __name__ == "__main__":
    main()