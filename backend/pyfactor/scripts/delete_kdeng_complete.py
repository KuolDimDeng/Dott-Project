#!/usr/bin/env python
"""
Complete deletion of kdeng@dottapps.com user account and all related data

This script will:
1. Delete the user account
2. Delete the associated tenant
3. Delete all related data (sessions, onboarding, etc.)
4. Clean up any orphaned records

Usage:
    python manage.py shell < scripts/delete_kdeng_complete.py
"""

import os
import sys
import django

# Set up Django environment
sys.path.append('/app')  # Render deployment path
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import transaction as db_transaction, connection
from custom_auth.models import User, Tenant
from session_manager.models import UserSession
from onboarding.models import OnboardingProgress
from notifications.models import NotificationRecipient
from smart_insights.models import CreditBalance, CreditTransaction
from import_export.models import ImportSession

# Email to delete
email = "kdeng@dottapps.com"

print("=" * 70)
print(f"🗑️  COMPLETE DELETION FOR: {email}")
print("=" * 70)

try:
    # Find the user
    user = User.objects.get(email=email)
    print(f"\n✅ Found user: {email}")
    print(f"   - User ID: {user.id}")
    print(f"   - Auth0 ID: {user.auth0_id if hasattr(user, 'auth0_id') else 'None'}")
    print(f"   - Tenant: {user.tenant.name if user.tenant else 'None'}")
    print(f"   - Tenant ID: {user.tenant.id if user.tenant else 'None'}")
    
    tenant = user.tenant
    
    with db_transaction.atomic():
        # 1. Delete sessions
        try:
            sessions_count = UserSession.objects.filter(user=user).count()
            if sessions_count > 0:
                UserSession.objects.filter(user=user).delete()
                print(f"   ✓ Deleted {sessions_count} user sessions")
            else:
                print(f"   - No sessions found")
        except Exception as e:
            print(f"   - Sessions: {e}")
        
        # 2. Delete onboarding progress
        try:
            onboarding_count = OnboardingProgress.objects.filter(user=user).count()
            if onboarding_count > 0:
                OnboardingProgress.objects.filter(user=user).delete()
                print(f"   ✓ Deleted {onboarding_count} onboarding records")
            else:
                print(f"   - No onboarding records found")
        except Exception as e:
            print(f"   - Onboarding: {e}")
        
        # 3. Delete notification recipients
        try:
            if tenant:
                notifications_count = NotificationRecipient.objects.filter(tenant=tenant).count()
                if notifications_count > 0:
                    NotificationRecipient.objects.filter(tenant=tenant).delete()
                    print(f"   ✓ Deleted {notifications_count} notification recipients")
                else:
                    print(f"   - No notifications found")
        except Exception as e:
            print(f"   - Notifications: {e}")
        
        # 4. Delete smart insights data
        try:
            credit_balance_count = CreditBalance.objects.filter(user=user).count()
            if credit_balance_count > 0:
                CreditBalance.objects.filter(user=user).delete()
                print(f"   ✓ Deleted credit balance")
            
            credit_trans_count = CreditTransaction.objects.filter(user=user).count()
            if credit_trans_count > 0:
                CreditTransaction.objects.filter(user=user).delete()
                print(f"   ✓ Deleted {credit_trans_count} credit transactions")
        except Exception as e:
            print(f"   - Smart insights: {e}")
        
        # 5. Delete import/export sessions
        try:
            if tenant:
                import_count = ImportSession.objects.filter(tenant=tenant).count()
                if import_count > 0:
                    ImportSession.objects.filter(tenant=tenant).delete()
                    print(f"   ✓ Deleted {import_count} import sessions")
        except Exception as e:
            print(f"   - Import sessions: {e}")
        
        # 6. Delete tenant-specific data using raw SQL
        if tenant:
            print(f"\n📦 Deleting tenant data (ID: {tenant.id})...")
            
            # List of tables with tenant_id column
            tenant_tables = [
                'categories_category',
                'categories_tag',
                'chart_of_accounts_account',
                'customers_customer',
                'hr_employee',
                'hr_timesheet',
                'hr_payroll',
                'inventory_inventory',
                'inventory_inventoryadjustment',
                'invoices_invoice',
                'invoices_invoiceitem',
                'locations_location',
                'orders_order',
                'orders_orderitem',
                'payments_payment',
                'products_product',
                'services_service',
                'taxes_taxrate',
                'taxes_taxfilingservice',
                'vendor_vendor',
                'vendor_bill',
                'vendor_billitem',
            ]
            
            with connection.cursor() as cursor:
                for table in tenant_tables:
                    try:
                        cursor.execute(f"DELETE FROM {table} WHERE tenant_id = %s", [tenant.id])
                        if cursor.rowcount > 0:
                            print(f"   ✓ Deleted {cursor.rowcount} records from {table}")
                    except Exception as e:
                        # Table might not exist or have no data
                        pass
        
        # 7. Delete the tenant itself
        if tenant:
            tenant_name = tenant.name
            tenant.delete()
            print(f"\n✅ Deleted tenant: {tenant_name}")
        
        # 8. Finally, delete the user
        user.delete()
        print(f"\n✅ Deleted user: {email}")
        
        print("\n" + "=" * 70)
        print("✨ DELETION COMPLETE!")
        print(f"   - User {email} has been completely removed")
        print(f"   - All associated data has been deleted")
        print(f"   - Ready for fresh signup with kuoldimdeng@outlook.com")
        print("=" * 70)
        
except User.DoesNotExist:
    print(f"\n❌ User {email} not found - may already be deleted")
    print("\n✅ You can proceed with signing up using kuoldimdeng@outlook.com")
except Exception as e:
    print(f"\n❌ Error during deletion: {str(e)}")
    import traceback
    traceback.print_exc()

print("\n")