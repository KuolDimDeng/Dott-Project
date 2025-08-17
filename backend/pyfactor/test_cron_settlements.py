#!/usr/bin/env python
"""
Test script to debug why cron job can't see settlements
"""
import os
import sys
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection
from banking.models import PaymentSettlement, WiseItem
from decimal import Decimal

print("=" * 60)
print("CRON JOB SETTLEMENT TEST")
print("=" * 60)

# 1. Check raw database
print("\n1. RAW SQL CHECK:")
with connection.cursor() as cursor:
    cursor.execute("SELECT COUNT(*) FROM banking_payment_settlement")
    total = cursor.fetchone()[0]
    print(f"Total settlements in database: {total}")
    
    cursor.execute("SELECT COUNT(*) FROM banking_payment_settlement WHERE status = 'pending'")
    pending = cursor.fetchone()[0]
    print(f"Pending settlements: {pending}")
    
    cursor.execute("SELECT COUNT(*) FROM banking_payment_settlement WHERE status = 'pending' AND settlement_amount >= 10")
    above_min = cursor.fetchone()[0]
    print(f"Pending settlements >= $10: {above_min}")

# 2. Check with Django ORM (basic)
print("\n2. DJANGO ORM - Basic check:")
try:
    all_settlements = PaymentSettlement.objects.all()
    print(f"PaymentSettlement.objects.all().count(): {all_settlements.count()}")
except Exception as e:
    print(f"Error: {e}")

# 3. Check with filters
print("\n3. DJANGO ORM - Filtered check:")
try:
    pending_settlements = PaymentSettlement.objects.filter(status='pending')
    print(f"Pending settlements via ORM: {pending_settlements.count()}")
    
    # Check with minimum amount
    min_amount = Decimal('10.0')
    filtered = PaymentSettlement.objects.filter(
        status='pending',
        settlement_amount__gte=min_amount
    )
    print(f"Pending >= $10 via ORM: {filtered.count()}")
except Exception as e:
    print(f"Error: {e}")

# 4. Check tenant context
print("\n4. TENANT CONTEXT CHECK:")
print(f"PaymentSettlement inherits from TenantAwareModel: {hasattr(PaymentSettlement, 'tenant_id')}")

# Try to bypass tenant filtering using raw SQL in ORM
from django.db.models import Q
print("\n5. TRYING TO ACCESS WITH RAW SQL:")
with connection.cursor() as cursor:
    cursor.execute("""
        SELECT id, user_id, tenant_id, settlement_amount, status
        FROM banking_payment_settlement
        WHERE status = 'pending'
        LIMIT 2
    """)
    rows = cursor.fetchall()
    if rows:
        print("Found pending settlements:")
        for row in rows:
            print(f"  ID: {str(row[0])}")
            print(f"  User ID: {row[1]}")
            print(f"  Tenant ID: {row[2]}")
            print(f"  Amount: ${row[3]}")
            print(f"  Status: {row[4]}")
            
            # Try to get this specific settlement via ORM
            try:
                settlement = PaymentSettlement.objects.get(id=row[0])
                print(f"  ✓ Can access via ORM: Yes")
            except PaymentSettlement.DoesNotExist:
                print(f"  ✗ Can access via ORM: No (filtered by tenant)")
            except Exception as e:
                print(f"  ✗ Error accessing via ORM: {e}")
            print()

# 6. Check if we can disable tenant filtering
print("\n6. ATTEMPTING TO DISABLE TENANT FILTERING:")
try:
    # Some Django tenant packages have a way to disable filtering
    from django.db import connection as db_connection
    
    # Try to set tenant to None or 'public'
    if hasattr(db_connection, 'set_tenant'):
        print("Found set_tenant method")
        db_connection.set_tenant(None)
        settlements = PaymentSettlement.objects.all()
        print(f"Settlements after setting tenant to None: {settlements.count()}")
    else:
        print("No set_tenant method found")
        
    # Try another approach
    if hasattr(PaymentSettlement.objects, 'all_tenants'):
        print("Found all_tenants method")
        all_tenant_settlements = PaymentSettlement.objects.all_tenants().all()
        print(f"Settlements using all_tenants(): {all_tenant_settlements.count()}")
    else:
        print("No all_tenants method found")
        
except Exception as e:
    print(f"Error trying tenant workarounds: {e}")

print("\n" + "=" * 60)
print("END OF TEST")
print("=" * 60)
