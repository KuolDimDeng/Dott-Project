#!/usr/bin/env python
"""
Script to fix the session_manager migration that references 'customuser' instead of 'user'.
This is a quick fix that can be run before deployment.
"""

import os
import sys
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


def fix_migration_file():
    """Fix the migration file to use correct User model reference"""
    migration_file = project_root / 'session_manager' / 'migrations' / '0002_enhanced_security.py'
    
    if not migration_file.exists():
        print(f"❌ Migration file not found: {migration_file}")
        return False
    
    # Read the current content
    with open(migration_file, 'r') as f:
        content = f.read()
    
    # Count occurrences
    occurrences = content.count("'custom_auth.customuser'")
    
    if occurrences > 0:
        # Create backup
        backup_file = migration_file.with_suffix('.py.backup')
        with open(backup_file, 'w') as f:
            f.write(content)
        print(f"✅ Created backup: {backup_file}")
        
        # Replace 'custom_auth.customuser' with 'custom_auth.user'
        fixed_content = content.replace("'custom_auth.customuser'", "'custom_auth.user'")
        
        # Write fixed content
        with open(migration_file, 'w') as f:
            f.write(fixed_content)
        
        print(f"✅ Fixed migration file: {migration_file}")
        print(f"   Replaced {occurrences} occurrences of 'custom_auth.customuser' with 'custom_auth.user'")
        
        # Show the fixed lines
        lines = fixed_content.split('\n')
        for i, line in enumerate(lines, 1):
            if "'custom_auth.user'" in line:
                print(f"   Line {i}: {line.strip()}")
        
        return True
    else:
        print("ℹ️  Migration file already has correct reference or doesn't contain customuser")
        
        # Check if it has the correct reference
        if "'custom_auth.user'" in content:
            print("✅ Migration file already uses 'custom_auth.user'")
        else:
            print("⚠️  Migration file doesn't contain either reference")
        
        return True


def check_other_migrations():
    """Check if there are other migrations with the same issue"""
    print("\n🔍 Checking other migration files...")
    
    migrations_dir = project_root / 'session_manager' / 'migrations'
    found_issues = False
    
    for migration_file in migrations_dir.glob('*.py'):
        if migration_file.name == '__init__.py':
            continue
            
        with open(migration_file, 'r') as f:
            content = f.read()
        
        if 'customuser' in content.lower():
            print(f"⚠️  Found 'customuser' reference in: {migration_file.name}")
            found_issues = True
    
    if not found_issues:
        print("✅ No other migration files have customuser references")


def verify_model_name():
    """Verify the actual model name in custom_auth"""
    print("\n🔍 Verifying User model name...")
    
    models_file = project_root / 'custom_auth' / 'models.py'
    if models_file.exists():
        with open(models_file, 'r') as f:
            content = f.read()
        
        if 'class User(AbstractUser):' in content:
            print("✅ Confirmed: User model is named 'User' (not 'CustomUser')")
        else:
            print("⚠️  Could not find 'class User(AbstractUser)' in models.py")
            
        # Check AUTH_USER_MODEL setting
        settings_file = project_root / 'pyfactor' / 'settings.py'
        if settings_file.exists():
            with open(settings_file, 'r') as f:
                settings_content = f.read()
            
            if "AUTH_USER_MODEL = 'custom_auth.User'" in settings_content:
                print("✅ Confirmed: AUTH_USER_MODEL = 'custom_auth.User'")
            else:
                print("⚠️  Could not find AUTH_USER_MODEL setting")


def main():
    """Main function"""
    print("🔧 Fixing session_manager migration User model reference")
    print("=" * 60)
    
    # Fix the migration file
    if not fix_migration_file():
        return 1
    
    # Check other migrations
    check_other_migrations()
    
    # Verify model name
    verify_model_name()
    
    print("\n✅ Migration fix completed!")
    print("\n⚠️  Remember to:")
    print("1. Test migrations locally before deploying")
    print("2. Run: python manage.py migrate --dry-run")
    print("3. Commit the fixed migration file")
    
    return 0


if __name__ == '__main__':
    sys.exit(main())