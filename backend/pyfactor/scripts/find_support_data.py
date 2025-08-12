#!/usr/bin/env python3
"""
Find all data for support@dottapps.com across different tenant IDs
"""

import os
import sys
import django
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection
from custom_auth.models import User, Tenant
from django.db.models import Count, Q

def find_support_data():
    print("\n" + "="*80)
    print("SEARCHING FOR DATA: support@dottapps.com")
    print("="*80)
    
    # Find the user
    try:
        user = User.objects.get(email='support@dottapps.com')
        print(f"\n✅ User found:")
        print(f"   ID: {user.id}")
        print(f"   Email: {user.email}")
        print(f"   Business ID: {user.business_id}")
        print(f"   Tenant ID: {getattr(user, 'tenant_id', 'Not set')}")
        print(f"   Created: {user.created_at}")
        
        tenant_id = user.business_id or getattr(user, 'tenant_id', None)
        
    except User.DoesNotExist:
        print("❌ User not found!")
        return
    
    print("\n" + "-"*80)
    print("CHECKING DATA IN ALL TABLES")
    print("-"*80)
    
    # SQL queries to check all data
    queries = [
        ("Products", "SELECT tenant_id, COUNT(*) FROM inventory_product GROUP BY tenant_id"),
        ("Services", "SELECT tenant_id, COUNT(*) FROM inventory_service GROUP BY tenant_id"),
        ("Customers", "SELECT tenant_id, COUNT(*) FROM crm_customer GROUP BY tenant_id"),
        ("Invoices", "SELECT tenant_id, COUNT(*) FROM finance_invoice GROUP BY tenant_id"),
        ("Estimates", "SELECT tenant_id, COUNT(*) FROM finance_estimate GROUP BY tenant_id"),
        ("Bills", "SELECT tenant_id, COUNT(*) FROM purchases_bill GROUP BY tenant_id"),
        ("Vendors", "SELECT tenant_id, COUNT(*) FROM purchases_vendor GROUP BY tenant_id"),
        ("Employees", "SELECT tenant_id, COUNT(*) FROM hr_employee GROUP BY tenant_id"),
    ]
    
    all_tenant_ids = set()
    
    for table_name, query in queries:
        print(f"\n📊 {table_name}:")
        try:
            with connection.cursor() as cursor:
                cursor.execute(query)
                results = cursor.fetchall()
                if results:
                    for tid, count in results:
                        if tid:
                            all_tenant_ids.add(str(tid))
                            marker = " ⭐" if str(tid) == str(tenant_id) else ""
                            print(f"   Tenant {tid}: {count} records{marker}")
                else:
                    print(f"   No data found")
        except Exception as e:
            print(f"   Error: {e}")
    
    print("\n" + "-"*80)
    print("TENANT SUMMARY")
    print("-"*80)
    
    print(f"\n🔍 All unique tenant IDs found in database:")
    for tid in sorted(all_tenant_ids):
        try:
            tenant = Tenant.objects.get(id=tid)
            marker = " ⭐ (CURRENT USER)" if str(tid) == str(tenant_id) else ""
            print(f"   {tid}: {tenant.name or tenant.business_name}{marker}")
        except:
            marker = " ⭐ (CURRENT USER)" if str(tid) == str(tenant_id) else ""
            print(f"   {tid}: (Tenant record not found){marker}")
    
    # Check for orphaned data (data without matching tenant)
    print("\n" + "-"*80)
    print("CHECKING FOR ORPHANED DATA")
    print("-"*80)
    
    with connection.cursor() as cursor:
        # Check invoices created by this user
        cursor.execute("""
            SELECT tenant_id, COUNT(*) 
            FROM finance_invoice 
            WHERE created_by_id = %s
            GROUP BY tenant_id
        """, [user.id])
        results = cursor.fetchall()
        if results:
            print(f"\n📄 Invoices created by {user.email}:")
            for tid, count in results:
                print(f"   Tenant {tid}: {count} invoices")
        
        # Check products created by this user
        cursor.execute("""
            SELECT tenant_id, COUNT(*) 
            FROM inventory_product 
            WHERE created_by_id = %s
            GROUP BY tenant_id
        """, [user.id])
        results = cursor.fetchall()
        if results:
            print(f"\n📦 Products created by {user.email}:")
            for tid, count in results:
                print(f"   Tenant {tid}: {count} products")
    
    print("\n" + "="*80)
    print("RECOMMENDATION")
    print("="*80)
    
    if len(all_tenant_ids) > 1:
        print("\n⚠️  Multiple tenant IDs found in the database!")
        print("This might be why you're not seeing all your data.")
        print("\nSuggested actions:")
        print("1. Consolidate all data under one tenant ID")
        print("2. Update user's tenant_id to match the data")
        print("3. Fix tenant filtering in queries")
    else:
        print("\n✅ All data appears to be under one tenant.")
        print("If you're not seeing data, the issue might be:")
        print("1. Frontend filtering issues")
        print("2. API permission checks")
        print("3. Session tenant mismatch")

if __name__ == "__main__":
    find_support_data()