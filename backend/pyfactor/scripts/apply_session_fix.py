#!/usr/bin/env python
"""
Apply the session creation fix immediately

Run this script on the backend server to fix the session creation logic:
python scripts/apply_session_fix.py
"""

import os
import sys

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Django setup
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

# Apply the fix
from custom_auth.session_fix_patch import apply_session_fix

if __name__ == "__main__":
    print("Applying session creation fix...")
    
    if apply_session_fix():
        print("✅ Fix applied successfully!")
        print("\nThe fix will:")
        print("1. Check OnboardingProgress.setup_completed to determine needs_onboarding")
        print("2. Check UserProfile for tenant_id as fallback")
        print("3. Set needs_onboarding=False for users who have completed onboarding")
        print("\nNew Google OAuth users will now get the correct onboarding status!")
    else:
        print("❌ Failed to apply fix")
        print("Please check the logs for errors")