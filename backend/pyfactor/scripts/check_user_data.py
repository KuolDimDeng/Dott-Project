#!/usr/bin/env python
"""
Script to check what data exists for a user and their tenant
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from custom_auth.models import User, Tenant
from finance.models import Invoice, InvoiceItem
from inventory.models import Product, Service
from crm.models import Customer
from django.db import connection

def check_user_data(email):
    """Check all data associated with a user"""
    
    print(f"\n{'='*60}")
    print(f"Checking data for: {email}")
    print(f"{'='*60}\n")
    
    # Get user
    try:
        user = User.objects.get(email=email)
        print(f"✅ User found: {user.id}")
        print(f"   - business_id: {user.business_id}")
        print(f"   - tenant_id: {getattr(user, 'tenant_id', 'Not set')}")
        
        # Get tenant
        tenant = None
        if user.business_id:
            try:
                tenant = Tenant.objects.get(id=user.business_id)
                print(f"✅ Tenant found: {tenant.name} ({tenant.id})")
            except Tenant.DoesNotExist:
                print(f"❌ No tenant found with ID: {user.business_id}")
        
        tenant_id = user.business_id or getattr(user, 'tenant_id', None)
        
        if not tenant_id:
            print("❌ No tenant_id found for user")
            return
            
        print(f"\nUsing tenant_id: {tenant_id}")
        print("-" * 40)
        
        # Check Products
        products = Product.objects.filter(tenant_id=tenant_id)
        print(f"\n📦 Products: {products.count()}")
        for p in products[:5]:
            print(f"   - {p.name} (SKU: {p.sku}, Price: ${p.price})")
        if products.count() > 5:
            print(f"   ... and {products.count() - 5} more")
        
        # Check Services  
        services = Service.objects.filter(tenant_id=tenant_id)
        print(f"\n🛠️ Services: {services.count()}")
        for s in services[:5]:
            print(f"   - {s.name} (Price: ${s.price})")
        if services.count() > 5:
            print(f"   ... and {services.count() - 5} more")
        
        # Check Customers
        customers = Customer.objects.filter(tenant_id=tenant_id)
        print(f"\n👥 Customers: {customers.count()}")
        for c in customers[:5]:
            print(f"   - {c.name} ({c.email})")
        if customers.count() > 5:
            print(f"   ... and {customers.count() - 5} more")
        
        # Check Invoices
        invoices = Invoice.objects.filter(tenant_id=tenant_id)
        print(f"\n📄 Invoices: {invoices.count()}")
        for i in invoices[:5]:
            print(f"   - #{i.invoice_number} - ${i.total_amount} ({i.status})")
        if invoices.count() > 5:
            print(f"   ... and {invoices.count() - 5} more")
        
        # Check if there's data with different tenant_ids
        print(f"\n{'='*40}")
        print("Checking for orphaned data...")
        print("-" * 40)
        
        # Raw SQL to find all tenant_ids in products table
        with connection.cursor() as cursor:
            cursor.execute("SELECT DISTINCT tenant_id, COUNT(*) FROM inventory_product GROUP BY tenant_id")
            all_tenants = cursor.fetchall()
            print(f"\nAll tenant_ids in products table:")
            for tid, count in all_tenants:
                print(f"   - {tid}: {count} products")
        
        # Check if user has any invoices under different tenant_ids
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT DISTINCT tenant_id, COUNT(*) 
                FROM finance_invoice 
                WHERE created_by_id = %s OR user_id = %s
                GROUP BY tenant_id
            """, [user.id, user.id])
            user_invoices = cursor.fetchall()
            if user_invoices:
                print(f"\nInvoices created by/for this user:")
                for tid, count in user_invoices:
                    print(f"   - Tenant {tid}: {count} invoices")
        
    except User.DoesNotExist:
        print(f"❌ User not found: {email}")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Check for support@dottapps.com
    check_user_data("support@dottapps.com")
    
    # Also check for any other test users
    print(f"\n{'='*60}")
    print("Other users in the system:")
    print("-" * 40)
    for user in User.objects.all()[:10]:
        print(f"   - {user.email} (tenant_id: {getattr(user, 'tenant_id', 'None')})")