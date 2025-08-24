#!/usr/bin/env python
"""
Monitor and fix OAuth registration issues
Detects users who started OAuth but didn't complete registration
"""

import os
import sys
import django
from datetime import datetime, timedelta

# Add the parent directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Q, Count
from users.models import UserProfile
from onboarding.models import OnboardingProgress
from session_manager.models import UserSession
from custom_auth.models import Tenant

User = get_user_model()


def find_incomplete_oauth_users():
    """
    Find users who might have incomplete OAuth registration
    """
    print("\n" + "="*70)
    print("SCANNING FOR INCOMPLETE OAUTH REGISTRATIONS")
    print("="*70)
    
    issues = {
        'no_profile': [],
        'no_onboarding': [],
        'no_sessions': [],
        'incomplete_fields': [],
        'no_tenant_but_complete': []
    }
    
    # Get all users
    all_users = User.objects.all()
    
    for user in all_users:
        problems = []
        
        # Check for UserProfile
        if not UserProfile.objects.filter(user=user).exists():
            issues['no_profile'].append(user)
            problems.append("No UserProfile")
        
        # Check for OnboardingProgress
        if not user.onboarding_completed:
            if not OnboardingProgress.objects.filter(user=user).exists():
                issues['no_onboarding'].append(user)
                problems.append("No OnboardingProgress")
        
        # Check for sessions (recent users only)
        if user.date_joined > timezone.now() - timedelta(days=7):
            if not UserSession.objects.filter(user=user).exists():
                issues['no_sessions'].append(user)
                problems.append("No sessions (recent user)")
        
        # Check for incomplete fields
        missing_fields = []
        if not user.role:
            missing_fields.append('role')
        if not user.subscription_plan:
            missing_fields.append('subscription_plan')
        if not hasattr(user, 'email_verified') or user.email_verified is None:
            missing_fields.append('email_verified')
        if not user.first_name and not user.name:
            missing_fields.append('name/first_name')
        
        if missing_fields:
            issues['incomplete_fields'].append((user, missing_fields))
            problems.append(f"Missing fields: {', '.join(missing_fields)}")
        
        # Check for users marked complete but no tenant
        if user.onboarding_completed:
            profile = UserProfile.objects.filter(user=user).first()
            if profile and not profile.tenant_id:
                if not Tenant.objects.filter(owner_id=str(user.id)).exists():
                    issues['no_tenant_but_complete'].append(user)
                    problems.append("Marked complete but no tenant")
        
        # Report problems for this user
        if problems:
            print(f"\n⚠️ {user.email}:")
            for problem in problems:
                print(f"   - {problem}")
    
    # Summary
    print("\n" + "="*70)
    print("SUMMARY OF ISSUES")
    print("="*70)
    
    total_issues = sum(len(v) if not isinstance(v[0], tuple) else len(v) 
                      for v in issues.values() if v)
    
    if total_issues == 0:
        print("✅ No OAuth registration issues found!")
    else:
        print(f"Found {total_issues} users with issues:\n")
        
        if issues['no_profile']:
            print(f"❌ Missing UserProfile: {len(issues['no_profile'])} users")
            for user in issues['no_profile'][:5]:
                print(f"   - {user.email}")
        
        if issues['no_onboarding']:
            print(f"❌ Missing OnboardingProgress: {len(issues['no_onboarding'])} users")
            for user in issues['no_onboarding'][:5]:
                print(f"   - {user.email}")
        
        if issues['no_sessions']:
            print(f"⚠️ No sessions (recent users): {len(issues['no_sessions'])} users")
            for user in issues['no_sessions'][:5]:
                print(f"   - {user.email} (joined {user.date_joined})")
        
        if issues['incomplete_fields']:
            print(f"⚠️ Incomplete fields: {len(issues['incomplete_fields'])} users")
            for user, fields in issues['incomplete_fields'][:5]:
                print(f"   - {user.email}: missing {', '.join(fields)}")
        
        if issues['no_tenant_but_complete']:
            print(f"❌ Complete but no tenant: {len(issues['no_tenant_but_complete'])} users")
            for user in issues['no_tenant_but_complete'][:5]:
                print(f"   - {user.email}")
    
    return issues


def fix_incomplete_users(issues, auto_fix=False):
    """
    Fix users with incomplete OAuth registration
    """
    if not issues or sum(len(v) if not isinstance(v[0], tuple) else len(v) 
                        for v in issues.values() if v) == 0:
        print("\n✅ No issues to fix!")
        return
    
    print("\n" + "="*70)
    print("FIXING INCOMPLETE OAUTH REGISTRATIONS")
    print("="*70)
    
    if not auto_fix:
        response = input("\nFix all issues? (yes/no): ")
        if response.lower() != 'yes':
            print("Aborted.")
            return
    
    fixed_count = 0
    
    # Fix missing UserProfiles
    for user in issues.get('no_profile', []):
        try:
            UserProfile.objects.create(user=user)
            print(f"✅ Created UserProfile for {user.email}")
            fixed_count += 1
        except Exception as e:
            print(f"❌ Failed to create UserProfile for {user.email}: {e}")
    
    # Fix missing OnboardingProgress
    for user in issues.get('no_onboarding', []):
        try:
            OnboardingProgress.objects.create(
                user=user,
                onboarding_status='not_started',
                current_step='business_info',
                completed_steps=[],
                setup_completed=False,
                payment_completed=False,
            )
            print(f"✅ Created OnboardingProgress for {user.email}")
            fixed_count += 1
        except Exception as e:
            print(f"❌ Failed to create OnboardingProgress for {user.email}: {e}")
    
    # Fix incomplete fields
    for user, missing_fields in issues.get('incomplete_fields', []):
        try:
            updated = False
            
            if 'role' in missing_fields:
                user.role = 'OWNER'
                updated = True
            
            if 'subscription_plan' in missing_fields:
                user.subscription_plan = 'free'
                updated = True
            
            if 'email_verified' in missing_fields:
                user.email_verified = True  # OAuth users are verified
                updated = True
            
            if 'name/first_name' in missing_fields:
                if not user.name:
                    user.name = user.email.split('@')[0]
                if not user.first_name:
                    user.first_name = user.email.split('@')[0][:30]
                updated = True
            
            if updated:
                user.save()
                print(f"✅ Fixed missing fields for {user.email}: {', '.join(missing_fields)}")
                fixed_count += 1
        except Exception as e:
            print(f"❌ Failed to fix fields for {user.email}: {e}")
    
    print(f"\n✅ Fixed {fixed_count} issues")


def check_recent_failures(hours=24):
    """
    Check for recent OAuth registration failures
    """
    print("\n" + "="*70)
    print(f"RECENT REGISTRATION ACTIVITY (Last {hours} hours)")
    print("="*70)
    
    cutoff = timezone.now() - timedelta(hours=hours)
    
    # Recent successful registrations
    recent_users = User.objects.filter(date_joined__gte=cutoff).order_by('-date_joined')
    
    if recent_users.exists():
        print(f"\n✅ Recent successful registrations: {recent_users.count()}")
        for user in recent_users[:5]:
            profile_exists = UserProfile.objects.filter(user=user).exists()
            session_exists = UserSession.objects.filter(user=user).exists()
            status = "✅" if (profile_exists and session_exists) else "⚠️"
            print(f"   {status} {user.email} - {user.date_joined}")
            if not profile_exists:
                print(f"      ❌ Missing UserProfile")
            if not session_exists:
                print(f"      ⚠️ No sessions")
    else:
        print("\nNo recent registrations")
    
    # Check for orphaned sessions (sessions without users)
    orphaned_sessions = UserSession.objects.filter(
        created_at__gte=cutoff
    ).exclude(
        user__in=User.objects.all()
    )
    
    if orphaned_sessions.exists():
        print(f"\n⚠️ Found {orphaned_sessions.count()} orphaned sessions")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Monitor OAuth registration issues')
    parser.add_argument('--scan', action='store_true', help='Scan for issues')
    parser.add_argument('--fix', action='store_true', help='Fix found issues')
    parser.add_argument('--auto-fix', action='store_true', help='Auto-fix without confirmation')
    parser.add_argument('--recent', type=int, help='Check recent activity (hours)', default=24)
    
    args = parser.parse_args()
    
    if args.scan or args.fix or args.auto_fix:
        issues = find_incomplete_oauth_users()
        
        if args.fix or args.auto_fix:
            fix_incomplete_users(issues, auto_fix=args.auto_fix)
    
    if args.recent:
        check_recent_failures(args.recent)
    
    if not any([args.scan, args.fix, args.auto_fix, args.recent]):
        # Default: scan and show recent
        issues = find_incomplete_oauth_users()
        check_recent_failures(24)
        
        if issues and sum(len(v) if not isinstance(v[0], tuple) else len(v) 
                         for v in issues.values() if v) > 0:
            print("\n💡 Run with --fix to fix these issues")


if __name__ == "__main__":
    main()