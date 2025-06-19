#!/usr/bin/env python3
"""
Pre-deployment migration check script.
Run this before deploying to ensure migrations are ready.
"""

import sys
import subprocess
from pathlib import Path

def check_migration_files():
    """Check all migration files for common issues"""
    print("🔍 Checking migration files...")
    
    project_root = Path(__file__).parent.parent
    issues = []
    
    # Find all migration files
    migration_files = list(project_root.rglob('migrations/*.py'))
    migration_files = [f for f in migration_files if f.name != '__init__.py']
    
    print(f"Found {len(migration_files)} migration files")
    
    for migration_file in migration_files:
        with open(migration_file, 'r') as f:
            content = f.read()
        
        # Check for incorrect model references
        if 'customuser' in content.lower() and 'custom_auth' in content:
            # More specific check
            if "'custom_auth.customuser'" in content:
                issues.append(f"❌ {migration_file.relative_to(project_root)}: References 'custom_auth.customuser' (should be 'custom_auth.user')")
    
    if issues:
        print("\n⚠️  Found issues:")
        for issue in issues:
            print(f"  {issue}")
        return False
    else:
        print("✅ All migration files look correct")
        return True


def check_dependencies():
    """Check if required dependencies are available"""
    print("\n🔍 Checking dependencies...")
    
    # Check for PostgreSQL
    try:
        result = subprocess.run(['which', 'psql'], capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ PostgreSQL client found")
        else:
            print("⚠️  PostgreSQL client not found (needed for local testing)")
    except:
        print("⚠️  Could not check for PostgreSQL")
    
    return True


def show_deployment_steps():
    """Show recommended deployment steps"""
    print("\n📋 Recommended deployment steps:")
    print("1. Run migration fix if needed:")
    print("   python3 scripts/fix_session_migration.py")
    print("\n2. Test migrations locally (optional but recommended):")
    print("   ./scripts/test_migrations_locally.sh")
    print("\n3. Commit the fixed migration:")
    print("   git add session_manager/migrations/0002_enhanced_security.py")
    print("   git commit -m 'Fix session migration User model reference'")
    print("\n4. Push to deployment branch:")
    print("   git push origin Dott_Main_Dev_Deploy")
    print("\n5. On Render, run migrations:")
    print("   python manage.py migrate")


def main():
    """Main check function"""
    print("🚀 Pre-deployment Migration Check")
    print("=" * 50)
    
    all_good = True
    
    # Check migration files
    if not check_migration_files():
        all_good = False
        print("\n💡 Run: python3 scripts/fix_session_migration.py")
    
    # Check dependencies
    check_dependencies()
    
    # Show deployment steps
    show_deployment_steps()
    
    if all_good:
        print("\n✅ Migrations are ready for deployment!")
    else:
        print("\n⚠️  Please fix the issues above before deploying")
        return 1
    
    return 0


if __name__ == '__main__':
    sys.exit(main())