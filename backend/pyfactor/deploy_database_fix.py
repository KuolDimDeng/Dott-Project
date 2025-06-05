#!/usr/bin/env python
"""
Production Database Fix Deployment Script
This script helps deploy the database schema fix to production Render
"""

import os
import sys
import subprocess
import json
from pathlib import Path

def print_header():
    print("🚀 Production Database Fix Deployment")
    print("=" * 50)

def check_git_status():
    """Check if we have uncommitted changes"""
    print("🔍 Checking Git status...")
    
    try:
        result = subprocess.run(['git', 'status', '--porcelain'], 
                              capture_output=True, text=True, check=True)
        
        if result.stdout.strip():
            print("⚠️  You have uncommitted changes:")
            print(result.stdout)
            response = input("Continue anyway? (y/N): ")
            if response.lower() != 'y':
                print("❌ Aborted by user")
                return False
        else:
            print("✅ Git status clean")
        
        return True
    except subprocess.CalledProcessError:
        print("❌ Could not check Git status")
        return False

def create_commit():
    """Create a commit with the database fix"""
    print("\n📝 Creating commit with database fix...")
    
    try:
        # Add the new files
        subprocess.run(['git', 'add', 
                       'backend/pyfactor/onboarding/management/',
                       'backend/pyfactor/fix_onboarding_uuid_schema.sql',
                       'backend/pyfactor/fix_database_schema.py'], 
                      check=True)
        
        # Commit
        subprocess.run(['git', 'commit', '-m', 
                       'fix: Add database schema fix for onboarding table UUID conversion'], 
                      check=True)
        
        print("✅ Commit created successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to create commit: {e}")
        return False

def push_to_main():
    """Push changes to main branch"""
    print("\n🚀 Pushing to main branch...")
    
    try:
        subprocess.run(['git', 'push', 'origin', 'main'], check=True)
        print("✅ Changes pushed to main")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to push: {e}")
        return False

def print_render_instructions():
    """Print instructions for applying the fix on Render"""
    print("\n🎯 Render Deployment Instructions")
    print("=" * 40)
    print("""
After your code deploys to Render, run this command in the Render Shell:

1. Go to your Render Dashboard
2. Navigate to your Django service
3. Click "Shell" tab
4. Run this command:

   python manage.py fix_onboarding_schema --force

5. You should see output like:
   🚀 Onboarding Schema Fix Command
   ==================================================
   🔍 Checking current table schema...
   📋 Current ID field type: integer
   ❌ Found integer schema - needs fixing
   🔧 Applying schema fix...
   ✅ Schema fix applied successfully
   🎉 Schema fix completed successfully!
   ✅ Verifying fix...
   ✅ OnboardingProgress model working! Records: 0
   ✅ Schema verification passed

6. After the fix, your backend will start working properly!
""")

def print_testing_instructions():
    """Print testing instructions"""
    print("\n🧪 Testing Instructions")
    print("=" * 30)
    print("""
After applying the fix:

1. Test the authentication flow
2. Try completing onboarding
3. Check that data saves successfully
4. Monitor logs for any remaining errors

The "operator does not exist: integer = uuid" error should be gone!
""")

def main():
    print_header()
    
    # Check if we're in the right directory
    if not os.path.exists('backend/pyfactor/manage.py'):
        print("❌ Please run this script from the project root directory")
        sys.exit(1)
    
    # Check Git status
    if not check_git_status():
        sys.exit(1)
    
    # Create commit
    if not create_commit():
        print("⚠️  Could not create commit - files may already be committed")
    
    # Push to main
    if not push_to_main():
        print("⚠️  Could not push - you may need to push manually")
    
    # Print instructions
    print_render_instructions()
    print_testing_instructions()
    
    print("\n🎉 Deployment preparation complete!")
    print("The fix is ready to apply on Render.")

if __name__ == "__main__":
    main() 