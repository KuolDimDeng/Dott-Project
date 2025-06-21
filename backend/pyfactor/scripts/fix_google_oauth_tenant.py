#!/usr/bin/env python
"""
Fix Google OAuth user's tenant assignment
This script ensures the user has a proper Tenant, not just a Business

Usage:
    python manage.py shell < scripts/fix_google_oauth_tenant.py
"""

import os
import sys
import django
from django.db import transaction

# Set up Django environment
sys.path.append('/app')  # Render deployment path
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dott_project.settings')
django.setup()

from custom_auth.models import User, Tenant
from onboarding.models import OnboardingProgress
from users.models import Business

print("=" * 70)
print("🔧 FIXING GOOGLE OAUTH USER TENANT ASSIGNMENT")
print("=" * 70)

email = "jubacargovillage@gmail.com"

try:
    user = User.objects.get(email=email)
    print(f"\n✅ Found user: {email}")
    print(f"   - Current tenant: {user.tenant}")
    print(f"   - needs_onboarding: {user.needs_onboarding}")
    
    # Check OnboardingProgress
    try:
        progress = OnboardingProgress.objects.get(user=user)
        print(f"\n📋 OnboardingProgress found:")
        print(f"   - Business: {progress.business}")
        print(f"   - Business ID: {progress.business.id if progress.business else None}")
        print(f"   - setup_completed: {progress.setup_completed}")
        
        if progress.business and not user.tenant:
            print(f"\n⚠️  User has business but no tenant - fixing...")
            
            with transaction.atomic():
                # Check if a Tenant exists with the same ID as the Business
                business_id = progress.business.id
                
                # Try to find or create a Tenant for this user
                tenant, created = Tenant.objects.get_or_create(
                    id=business_id,
                    defaults={
                        'name': progress.business.name,
                        'is_active': True,
                        'created_by': user
                    }
                )
                
                if created:
                    print(f"   ✅ Created new Tenant: {tenant.name}")
                else:
                    print(f"   ✅ Found existing Tenant: {tenant.name}")
                
                # Assign tenant to user
                user.tenant = tenant
                user.business_id = business_id
                user.needs_onboarding = False
                user.onboarding_completed = True
                user.save(update_fields=['tenant', 'business_id', 'needs_onboarding', 'onboarding_completed'])
                
                # Update progress
                progress.setup_completed = True
                progress.save(update_fields=['setup_completed'])
                
                print(f"\n✅ Fixed user tenant assignment:")
                print(f"   - Tenant: {user.tenant.name}")
                print(f"   - Tenant ID: {user.tenant.id}")
                print(f"   - needs_onboarding: {user.needs_onboarding}")
                
                # Clear sessions
                if hasattr(user, 'sessions'):
                    user.sessions.all().delete()
                    print(f"   ✅ Cleared active sessions")
        
        elif user.tenant:
            print(f"\n✅ User already has tenant: {user.tenant.name}")
            
            # Just ensure flags are correct
            if user.needs_onboarding:
                user.needs_onboarding = False
                user.onboarding_completed = True
                user.save(update_fields=['needs_onboarding', 'onboarding_completed'])
                print(f"   ✅ Fixed onboarding flags")
        
    except OnboardingProgress.DoesNotExist:
        print(f"\n❌ No OnboardingProgress found for user")
        
except User.DoesNotExist:
    print(f"\n❌ User {email} not found")
except Exception as e:
    print(f"\n❌ Error: {str(e)}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 70)
print("✅ Script completed. User should now be able to log in properly.")
print("=" * 70)