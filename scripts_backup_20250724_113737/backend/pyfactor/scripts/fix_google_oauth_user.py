#!/usr/bin/env python
"""
Fix Google OAuth user's onboarding status
This script fixes the onboarding status for jubacargovillage@gmail.com

Usage:
    python manage.py shell < scripts/fix_google_oauth_user.py
"""

# Import the fix function from the existing script
from scripts.fix_complete_onboarding_status import fix_user_onboarding

print("=" * 70)
print("🔧 FIXING GOOGLE OAUTH USER ONBOARDING STATUS")
print("=" * 70)

# Fix the specific user
email = "jubacargovillage@gmail.com"
print(f"\n🎯 Target user: {email}")
print("-" * 70)

# Run the fix
result = fix_user_onboarding(email)

print("\n" + "=" * 70)
if result:
    print("✅ SUCCESS: User onboarding status has been fixed!")
    print("\nNext steps:")
    print("1. Ask the user to clear their browser cache/cookies")
    print("2. Have them log in again")
    print("3. They should now be redirected to the dashboard instead of onboarding")
else:
    print("❌ FAILED: Could not fix user onboarding status")
    print("\nPossible reasons:")
    print("- User not found")
    print("- User has no tenant assigned")
    print("- Database error")
    print("\nCheck the error messages above for more details")

print("=" * 70)