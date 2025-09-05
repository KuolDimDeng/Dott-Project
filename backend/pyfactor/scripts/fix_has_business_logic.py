#!/usr/bin/env python
"""
Fix the has_business logic in session API
Changes from: has_business = bool(user.tenant)
To: has_business = bool(Business exists for user)
"""

import os
import sys
import django

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection
from custom_auth.models import User
from users.models import Business

def analyze_users():
    """Analyze all users to find issues with has_business logic"""
    
    print("\n" + "="*60)
    print("ANALYZING USER-BUSINESS RELATIONSHIPS")
    print("="*60 + "\n")
    
    # Check all users
    all_users = User.objects.all()
    
    issues = []
    stats = {
        'total_users': 0,
        'users_with_tenant': 0,
        'users_with_business': 0,
        'consumers_with_tenant': 0,  # Should be 0
        'business_owners_without_tenant': 0,  # Should be 0
    }
    
    for user in all_users:
        stats['total_users'] += 1
        
        # Check tenant
        has_tenant = bool(user.tenant) if hasattr(user, 'tenant') else False
        if has_tenant:
            stats['users_with_tenant'] += 1
        
        # Check actual business ownership
        has_business = Business.objects.filter(owner_id=user.id).exists()
        if has_business:
            stats['users_with_business'] += 1
        
        # Find mismatches
        if has_tenant and not has_business:
            stats['consumers_with_tenant'] += 1
            issues.append(f"User {user.email} has tenant but no business!")
            
        if has_business and not has_tenant:
            stats['business_owners_without_tenant'] += 1
            issues.append(f"User {user.email} has business but no tenant!")
    
    # Print stats
    print("STATISTICS:")
    print(f"  Total users: {stats['total_users']}")
    print(f"  Users with tenant: {stats['users_with_tenant']}")
    print(f"  Users with business: {stats['users_with_business']}")
    print(f"  Consumers with tenant (WRONG): {stats['consumers_with_tenant']}")
    print(f"  Business owners without tenant (WRONG): {stats['business_owners_without_tenant']}")
    
    if issues:
        print(f"\n" + "="*60)
        print(f"ISSUES FOUND ({len(issues)}):")
        print("="*60)
        for issue in issues[:10]:  # Show first 10 issues
            print(f"  - {issue}")
        if len(issues) > 10:
            print(f"  ... and {len(issues) - 10} more issues")
    
    return issues

def check_support_user():
    """Check support@dottapps.com specifically"""
    
    email = 'support@dottapps.com'
    print(f"\n" + "="*60)
    print(f"CHECKING {email}")
    print("="*60 + "\n")
    
    try:
        user = User.objects.get(email=email)
        
        # Current logic (WRONG)
        has_tenant = bool(user.tenant) if hasattr(user, 'tenant') else False
        current_has_business = has_tenant
        
        # Correct logic
        actual_has_business = Business.objects.filter(owner_id=user.id).exists()
        
        # Also check business_id field
        has_business_id = bool(user.business_id) if hasattr(user, 'business_id') else False
        
        print(f"Current (WRONG) logic:")
        print(f"  has_tenant: {has_tenant}")
        print(f"  → has_business: {current_has_business}")
        
        print(f"\nCorrect logic:")
        print(f"  Business.objects.filter(owner_id={user.id}).exists(): {actual_has_business}")
        print(f"  user.business_id set: {has_business_id}")
        print(f"  → has_business should be: {actual_has_business}")
        
        if current_has_business != actual_has_business:
            print(f"\n❌ MISMATCH! Session API returns wrong has_business value!")
            print(f"   Currently returns: {current_has_business}")
            print(f"   Should return: {actual_has_business}")
        else:
            print(f"\n✓ Values match (but logic is still wrong)")
            
    except User.DoesNotExist:
        print(f"User {email} not found")

def propose_fix():
    """Show the proposed fix for session API"""
    
    print(f"\n" + "="*60)
    print("PROPOSED FIX")
    print("="*60 + "\n")
    
    print("In custom_auth/api/views/session_v2.py:")
    print("\nCURRENT (line 100, 201):")
    print("```python")
    print("has_business = bool(user.tenant)")
    print("```")
    
    print("\nSHOULD BE:")
    print("```python")
    print("# Check actual business ownership")
    print("from users.models import Business")
    print("has_business = Business.objects.filter(owner_id=user.id).exists()")
    print("```")
    
    print("\nOR BETTER YET:")
    print("```python")
    print("# Use the business_id field if it's properly maintained")
    print("has_business = bool(user.business_id) if hasattr(user, 'business_id') else False")
    print("```")
    
    print("\nThis ensures:")
    print("1. Consumers without businesses return has_business=False")
    print("2. Business owners return has_business=True")
    print("3. No dependency on tenant existence for business detection")

if __name__ == '__main__':
    # Analyze all users
    issues = analyze_users()
    
    # Check support user specifically
    check_support_user()
    
    # Show proposed fix
    propose_fix()
    
    print("\n" + "="*60)
    print("RECOMMENDATION")
    print("="*60)
    print("\n1. Fix the session API logic immediately")
    print("2. Run a migration to ensure all business owners have tenants")
    print("3. Consider removing tenant requirement for consumers")
    print("4. Add proper foreign key constraints to prevent orphaned records")