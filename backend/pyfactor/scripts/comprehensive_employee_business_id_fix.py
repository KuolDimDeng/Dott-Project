#!/usr/bin/env python3
"""
Comprehensive fix for employee business_id issues
"""
import os
import sys
import django
from django.db import transaction as db_transaction

# Add the parent directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from hr.models import Employee
from users.models import Business, Tenant
from onboarding.models import OnboardingProgress
from session_manager.models import UserSession

User = get_user_model()

def comprehensive_fix():
    print("\n" + "="*80)
    print("COMPREHENSIVE EMPLOYEE BUSINESS_ID FIX")
    print("="*80 + "\n")
    
    with db_transaction.atomic():
        # Step 1: Fix all users without business_id
        print("1. FIXING USERS WITHOUT BUSINESS_ID:")
        print("-" * 50)
        
        users_without_business = User.objects.filter(business_id__isnull=True)
        users_fixed = 0
        
        for user in users_without_business:
            # Try multiple sources to find business_id
            business = None
            business_id = None
            
            # Check OnboardingProgress
            onboarding = OnboardingProgress.objects.filter(user=user).first()
            if onboarding and onboarding.business:
                business = onboarding.business
                business_id = business.id
                source = "OnboardingProgress"
            
            # Check Business owner
            if not business:
                business = Business.objects.filter(owner=user).first()
                if business:
                    business_id = business.id
                    source = "Business.owner"
            
            # Check Business members
            if not business:
                business = Business.objects.filter(members=user).first()
                if business:
                    business_id = business.id
                    source = "Business.members"
            
            if business_id:
                user.business_id = business_id
                user.save()
                users_fixed += 1
                print(f"  ✅ Fixed user {user.email} - set business_id to {business_id} (from {source})")
            else:
                print(f"  ⚠️  User {user.email} - no business found")
        
        print(f"\nFixed {users_fixed} users")
        
        # Step 2: Fix employees with mismatched business_id
        print("\n2. FIXING EMPLOYEES WITH MISMATCHED BUSINESS_ID:")
        print("-" * 50)
        
        employees_fixed = 0
        all_employees = Employee.objects.all()
        
        for emp in all_employees:
            fixed = False
            
            # First, try to link employee to user if not linked
            if not emp.user:
                user = User.objects.filter(email=emp.email).first()
                if user:
                    emp.user = user
                    fixed = True
                    print(f"  ✅ Linked employee {emp.email} to user")
            
            # Then fix business_id mismatch
            if emp.user and emp.user.business_id:
                if str(emp.business_id) != str(emp.user.business_id):
                    old_business_id = emp.business_id
                    emp.business_id = emp.user.business_id
                    fixed = True
                    print(f"  ✅ Fixed employee {emp.email} business_id: {old_business_id} → {emp.business_id}")
            elif not emp.business_id and emp.user and emp.user.business_id:
                emp.business_id = emp.user.business_id
                fixed = True
                print(f"  ✅ Set employee {emp.email} business_id to {emp.business_id}")
            
            if fixed:
                emp.save()
                employees_fixed += 1
        
        print(f"\nFixed {employees_fixed} employees")
        
        # Step 3: Update session cache
        print("\n3. CLEARING SESSION CACHE:")
        print("-" * 50)
        
        # Clear Django cache
        from django.core.cache import cache
        cache.clear()
        print("  ✅ Cleared Django cache")
        
        # Update active sessions
        active_sessions = UserSession.objects.filter(is_active=True)
        for session in active_sessions:
            if session.user.business_id:
                # Force session to update with new business_id
                session.save()
        print(f"  ✅ Updated {active_sessions.count()} active sessions")
        
        # Step 4: Verify the fix
        print("\n4. VERIFICATION:")
        print("-" * 50)
        
        # Check users with business_id
        users_with_business = User.objects.filter(business_id__isnull=False)
        print(f"\nUsers with business_id: {users_with_business.count()}")
        
        for user in users_with_business[:5]:  # Show first 5
            employee_count = Employee.objects.filter(business_id=user.business_id).count()
            print(f"  User {user.email} (business_id: {user.business_id}): {employee_count} employees")
        
        # Check for orphaned employees
        print("\nChecking for orphaned employees:")
        all_user_business_ids = set(str(u.business_id) for u in User.objects.filter(business_id__isnull=False))
        orphaned = 0
        
        for emp in Employee.objects.all():
            if emp.business_id and str(emp.business_id) not in all_user_business_ids:
                print(f"  ⚠️  Orphaned employee: {emp.email} (business_id: {emp.business_id})")
                orphaned += 1
        
        if orphaned == 0:
            print("  ✅ No orphaned employees found!")
        
        # Step 5: Create RLS policies if needed
        print("\n5. CHECKING RLS POLICIES:")
        print("-" * 50)
        
        from django.db import connection
        with connection.cursor() as cursor:
            # Check if RLS is enabled on hr_employee table
            cursor.execute("""
                SELECT relrowsecurity 
                FROM pg_class 
                WHERE relname = 'hr_employee' 
                AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
            """)
            result = cursor.fetchone()
            
            if result and result[0]:
                print("  ✅ RLS is enabled on hr_employee table")
            else:
                print("  ⚠️  RLS is NOT enabled on hr_employee table")
                print("     Run setup_rls_policies.sql to enable RLS")
    
    print("\n✅ Comprehensive fix completed!")
    print("\nNOTE: If employees are still not showing, check:")
    print("1. The user's session might need to be refreshed (logout/login)")
    print("2. The frontend might be caching old data")
    print("3. RLS policies might need to be updated")

if __name__ == "__main__":
    comprehensive_fix()