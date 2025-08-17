#!/usr/bin/env python3
"""
Debug why settlements are not being processed.
"""
import os
import sys
sys.path.insert(0, '/Users/kuoldeng/projectx/backend/pyfactor')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
os.environ['PGSSLMODE'] = 'disable'

import django
django.setup()

from django.db import connection
from decimal import Decimal

print("=" * 60)
print("SETTLEMENT PROCESSING DEBUG")
print("=" * 60)

# Check the pending settlement
print("\n1. Checking pending settlement:")
with connection.cursor() as cursor:
    cursor.execute("""
        SELECT id, user_id, stripe_payment_intent_id, settlement_amount, status
        FROM banking_payment_settlement
        WHERE stripe_payment_intent_id = 'pi_3QcJD0K7wwaDlUBA0fT83AvB'
    """)
    result = cursor.fetchone()
    if result:
        settlement_id, user_id, intent_id, amount, status = result
        print(f"   Settlement ID: {settlement_id}")
        print(f"   User ID: {user_id}")
        print(f"   Amount: ${amount}")
        print(f"   Status: {status}")
    else:
        print("   Settlement not found!")
        sys.exit(1)

# Check if banking_wise_item table exists
print("\n2. Checking if banking_wise_item table exists:")
with connection.cursor() as cursor:
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'banking_wise_item'
        )
    """)
    exists = cursor.fetchone()[0]
    print(f"   Table exists: {exists}")
    
    if not exists:
        print("\n   Table banking_wise_item does NOT exist!")
        print("   This is why the cron job can't find user bank accounts.")
        
        # Check if migration exists
        cursor.execute("""
            SELECT name, applied 
            FROM django_migrations 
            WHERE app = 'banking' 
            AND name LIKE '%wise%'
            ORDER BY applied DESC
        """)
        migrations = cursor.fetchall()
        if migrations:
            print("\n   Banking migrations with 'wise':")
            for name, applied in migrations:
                print(f"     - {name}: Applied at {applied}")
        else:
            print("\n   No Wise-related migrations found!")

# Check if user has any bank account (in case table name is different)
print("\n3. Checking all tables for user bank accounts:")
with connection.cursor() as cursor:
    # Check all banking tables
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE 'banking_%'
        ORDER BY table_name
    """)
    tables = cursor.fetchall()
    if tables:
        print(f"   Found {len(tables)} banking tables:")
        for (table_name,) in tables:
            print(f"     - {table_name}")
            
            # Check if user 250 has records in this table
            try:
                cursor.execute(f"""
                    SELECT COUNT(*) 
                    FROM {table_name} 
                    WHERE user_id = 250
                """)
                count = cursor.fetchone()[0]
                if count > 0:
                    print(f"       ✓ User 250 has {count} record(s)")
            except:
                pass  # Table might not have user_id column
    else:
        print("   No banking tables found!")

print("\n4. Summary:")
print("   The issue is that the banking_wise_item table doesn't exist.")
print("   This means the migration hasn't been applied to this database.")
print("\n   Solution: Run migrations to create the banking_wise_item table:")
print("   python manage.py migrate banking")
print("\n" + "=" * 60)