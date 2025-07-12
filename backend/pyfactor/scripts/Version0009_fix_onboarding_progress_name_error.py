#!/usr/bin/env python3
"""
Script: Version0009_fix_onboarding_progress_name_error.py
Purpose: Fix NameError in auth0_views.py where 'onboarding_progress' variable is undefined
Author: Claude
Date: 2025-06-16
"""

import os
import sys
import re
from datetime import datetime

# Add project root to path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

def fix_name_error():
    """Fix the onboarding_progress NameError in auth0_views.py"""
    
    auth0_views_path = os.path.join(project_root, 'custom_auth', 'api', 'views', 'auth0_views.py')
    
    print(f"🔧 Fixing NameError in {auth0_views_path}")
    
    # Read the file
    with open(auth0_views_path, 'r') as f:
        content = f.read()
    
    # Count occurrences before fix
    error_count = content.count('if onboarding_progress and onboarding_progress.subscription_plan:')
    
    if error_count == 0:
        print("✅ No NameError found - file may have already been fixed")
        return
    
    print(f"📍 Found {error_count} occurrence(s) of the NameError")
    
    # In Auth0UserCreateView (around line 226), the variable is 'progress' not 'onboarding_progress'
    # Replace the incorrect reference
    content = content.replace(
        'if onboarding_progress and onboarding_progress.subscription_plan:',
        'if progress and progress.subscription_plan:'
    )
    
    # Write the fixed content back
    with open(auth0_views_path, 'w') as f:
        f.write(content)
    
    print("✅ Fixed NameError - replaced 'onboarding_progress' with 'progress'")
    
    # Verify the fix
    with open(auth0_views_path, 'r') as f:
        new_content = f.read()
    
    remaining_errors = new_content.count('if onboarding_progress and onboarding_progress.subscription_plan:')
    if remaining_errors == 0:
        print("✅ Verification passed - all occurrences fixed")
    else:
        print(f"⚠️ Warning: {remaining_errors} occurrences still remain")

if __name__ == "__main__":
    print("🚀 Starting fix for onboarding_progress NameError...")
    print(f"📅 Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("-" * 50)
    
    try:
        fix_name_error()
        print("-" * 50)
        print("✅ Script completed successfully!")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        sys.exit(1)