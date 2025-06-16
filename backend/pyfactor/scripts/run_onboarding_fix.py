#\!/usr/bin/env python
"""Run the onboarding status fix for specific users"""

import os
import sys
import django

# Set up Django environment
sys.path.append('/app')  # Render deployment path
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dott_project.settings')
django.setup()

from scripts.fix_onboarding_completion_status import fix_user_onboarding_status, fix_all_users_with_tenants

# Fix specific users
print("Fixing kdeng@dottapps.com...")
fix_user_onboarding_status('kdeng@dottapps.com')

print("\nFixing kuoldimdeng@outlook.com...")
fix_user_onboarding_status('kuoldimdeng@outlook.com')

print("\nFixing support@dottapps.com...")
fix_user_onboarding_status('support@dottapps.com')

# Optionally fix all users
# print("\nFixing all users with tenants but needs_onboarding=True...")
# fix_all_users_with_tenants()

print("\nDone\! Users should now be able to access their dashboards after signing in.")
EOF < /dev/null