#!/usr/bin/env python
"""
Debug script to check settlements in production database
Run this on Render to understand why cron job can't see settlements
"""
import os
import sys
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection
from banking.models import PaymentSettlement, WiseItem
from users.models import User

print("=" * 60)
print("SETTLEMENT DEBUG REPORT")
print("=" * 60)

# Check raw database without ORM
print("\n1. RAW DATABASE CHECK (no tenant filtering):")
print("-" * 40)
with connection.cursor() as cursor:
    # Check if table exists
    cursor.execute("""
        SELECT COUNT(*) 
        FROM information_schema.tables 
        WHERE table_name = 'banking_payment_settlement'
    """)
    table_exists = cursor.fetchone()[0]
    print(f"Table 'banking_payment_settlement' exists: {table_exists > 0}")
    
    if table_exists:
        # Count all settlements
        cursor.execute("SELECT COUNT(*) FROM banking_payment_settlement")
        total_count = cursor.fetchone()[0]
        print(f"Total settlements in table: {total_count}")
        
        # Count by status
        cursor.execute("""
            SELECT status, COUNT(*) 
            FROM banking_payment_settlement 
            GROUP BY status
        """)
        print("\nSettlements by status:")
        for row in cursor.fetchall():
            print(f"  {row[0]}: {row[1]}")
        
        # Show recent settlements with tenant info
        cursor.execute("""
            SELECT id, user_id, tenant_id, status, settlement_amount, created_at
            FROM banking_payment_settlement
            ORDER BY created_at DESC
            LIMIT 5
        """)
        rows = cursor.fetchall()
        if rows:
            print("\nRecent settlements (raw query):")
            for row in rows:
                print(f"  ID: {str(row[0])[:8]}...")
                print(f"  User ID: {row[1]}")
                print(f"  Tenant ID: {row[2]}")
                print(f"  Status: {row[3]}")
                print(f"  Amount: ${row[4]}")
                print(f"  Created: {row[5]}")
                print()

# Check using Django ORM
print("\n2. DJANGO ORM CHECK (with tenant filtering):")
print("-" * 40)
try:
    # Try without any tenant context
    settlements = PaymentSettlement.objects.all()
    print(f"Total settlements via ORM (no tenant): {settlements.count()}")
    
    # Check if model has tenant field
    print(f"PaymentSettlement has tenant_id field: {hasattr(PaymentSettlement, 'tenant_id')}")
    
    # Try to get a specific user's settlements
    if total_count > 0:
        # Get a user ID from the raw query above
        cursor.execute("SELECT DISTINCT user_id FROM banking_payment_settlement LIMIT 1")
        sample_user_id = cursor.fetchone()[0]
        
        try:
            user = User.objects.get(id=sample_user_id)
            print(f"\nSample user: {user.email} (ID: {user.id})")
            print(f"User tenant_id: {getattr(user, 'tenant_id', 'No tenant_id field')}")
            
            # Check settlements for this specific user
            user_settlements = PaymentSettlement.objects.filter(user=user)
            print(f"Settlements for this user: {user_settlements.count()}")
            
        except User.DoesNotExist:
            print(f"User {sample_user_id} not found")
    
except Exception as e:
    print(f"Error accessing via ORM: {e}")

# Check Wise accounts
print("\n3. WISE BANK ACCOUNTS CHECK:")
print("-" * 40)
with connection.cursor() as cursor:
    cursor.execute("""
        SELECT COUNT(*) 
        FROM information_schema.tables 
        WHERE table_name = 'banking_wise_item'
    """)
    wise_table_exists = cursor.fetchone()[0]
    print(f"Table 'banking_wise_item' exists: {wise_table_exists > 0}")
    
    if wise_table_exists:
        cursor.execute("SELECT COUNT(*) FROM banking_wise_item")
        wise_count = cursor.fetchone()[0]
        print(f"Total Wise accounts: {wise_count}")
        
        # Check POS default accounts
        cursor.execute("""
            SELECT COUNT(*) 
            FROM banking_wise_item 
            WHERE is_default_for_pos = true
        """)
        pos_default_count = cursor.fetchone()[0]
        print(f"Accounts set as POS default: {pos_default_count}")
        
        # Show POS default accounts
        if pos_default_count > 0:
            cursor.execute("""
                SELECT id, user_id, bank_name, is_verified, is_active
                FROM banking_wise_item
                WHERE is_default_for_pos = true
                LIMIT 5
            """)
            print("\nPOS default accounts:")
            for row in cursor.fetchall():
                print(f"  ID: {str(row[0])[:8]}...")
                print(f"  User ID: {row[1]}")
                print(f"  Bank: {row[2]}")
                print(f"  Verified: {row[3]}")
                print(f"  Active: {row[4]}")
                print()

# Check tenant configuration
print("\n4. TENANT CONFIGURATION:")
print("-" * 40)
from django.conf import settings
print(f"TENANT_MODEL: {getattr(settings, 'TENANT_MODEL', 'Not configured')}")
print(f"SHARED_APPS includes banking: {'banking' in getattr(settings, 'SHARED_APPS', [])}")
print(f"TENANT_APPS includes banking: {'banking' in getattr(settings, 'TENANT_APPS', [])}")

# Check if running in cron context
print("\n5. EXECUTION CONTEXT:")
print("-" * 40)
print(f"Running as management command: {'manage.py' in ' '.join(sys.argv)}")
print(f"Command line args: {sys.argv}")
print(f"Environment: {os.environ.get('DJANGO_SETTINGS_MODULE', 'Not set')}")
print(f"Database URL set: {'DATABASE_URL' in os.environ}")

print("\n" + "=" * 60)
print("END OF REPORT")
print("=" * 60)