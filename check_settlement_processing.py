#!/usr/bin/env python3
"""
Check if settlements are being processed by the cron job
"""
import os
import sys
import django
from datetime import datetime, timedelta

# Add project to path
sys.path.insert(0, '/Users/kuoldeng/projectx/backend/pyfactor')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

# Disable SSL for local testing
os.environ['PGSSLMODE'] = 'disable'

django.setup()

from banking.models import PaymentSettlement, WiseItem
from django.utils import timezone
from django.db import connection

print("=" * 60)
print("SETTLEMENT PROCESSING STATUS CHECK")
print("=" * 60)

# Check database connection
with connection.cursor() as cursor:
    cursor.execute("SELECT COUNT(*) FROM banking_payment_settlement")
    total_settlements = cursor.fetchone()[0]
    print(f"\nTotal settlements in database: {total_settlements}")

# Check recent settlements
print("\n--- Recent Settlements (Last 7 Days) ---")
since = timezone.now() - timedelta(days=7)

with connection.cursor() as cursor:
    cursor.execute("""
        SELECT 
            status, 
            COUNT(*) as count,
            SUM(settlement_amount) as total_amount
        FROM banking_payment_settlement
        WHERE created_at >= %s
        GROUP BY status
    """, [since])
    
    results = cursor.fetchall()
    for status, count, amount in results:
        print(f"{status.upper()}: {count} settlements, Total: ${amount or 0:.2f}")

# Check if users have bank accounts set up
print("\n--- Bank Account Setup Status ---")
with connection.cursor() as cursor:
    cursor.execute("""
        SELECT COUNT(DISTINCT user_id) 
        FROM banking_wiseitem 
        WHERE is_active = true
    """)
    users_with_banks = cursor.fetchone()[0]
    print(f"Users with Wise bank accounts: {users_with_banks}")

# Check pending settlements that should be processed
print("\n--- Pending Settlements Ready for Processing ---")
with connection.cursor() as cursor:
    cursor.execute("""
        SELECT 
            ps.stripe_payment_intent_id,
            ps.settlement_amount,
            ps.currency,
            ps.created_at,
            u.email
        FROM banking_payment_settlement ps
        JOIN auth_user u ON ps.user_id = u.id
        WHERE ps.status = 'pending'
        AND ps.settlement_amount >= 10
        ORDER BY ps.created_at
        LIMIT 5
    """)
    
    pending = cursor.fetchall()
    if pending:
        for intent_id, amount, currency, created, email in pending:
            print(f"  - {intent_id[:20]}... | ${amount} {currency} | {email} | Created: {created}")
    else:
        print("  No pending settlements >= $10")

# Check if cron job has run recently
print("\n--- Last Settlement Processing ---")
with connection.cursor() as cursor:
    cursor.execute("""
        SELECT 
            MAX(processed_at) as last_processed,
            COUNT(*) as processed_count
        FROM banking_payment_settlement
        WHERE status IN ('processing', 'completed')
        AND processed_at IS NOT NULL
    """)
    
    result = cursor.fetchone()
    last_processed, count = result
    if last_processed:
        print(f"Last processed: {last_processed}")
        print(f"Total processed: {count}")
    else:
        print("No settlements have been processed yet")

print("\n--- Next Steps ---")
print("1. Ensure users have added their bank accounts in Settings → Banking")
print("2. Cron job runs daily at 02:00 AM UTC")
print("3. Minimum settlement amount: $10")
print("4. Check Render logs for 'daily-settlement-processor' for any errors")

print("\n" + "=" * 60)