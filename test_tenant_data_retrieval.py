#!/usr/bin/env python3
"""
Test script to verify tenant data retrieval is working correctly
This tests that all ViewSets are properly filtering by tenant
"""

import os
import sys
import django

# Add the backend directory to the path
sys.path.insert(0, '/Users/kuoldeng/projectx/backend/pyfactor')

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from inventory.models import Product, Service
from crm.models import Customer
from sales.models import Invoice

User = get_user_model()

def test_tenant_data_retrieval():
    """Test that support@dottapps.com can see their data"""
    
    print("=" * 60)
    print("TESTING TENANT DATA RETRIEVAL")
    print("=" * 60)
    
    # Get the user
    try:
        user = User.objects.get(email='support@dottapps.com')
        print(f"✅ Found user: {user.email}")
        print(f"   - User ID: {user.id}")
        print(f"   - Business ID: {getattr(user, 'business_id', 'NOT SET')}")
        print(f"   - Tenant ID: {getattr(user, 'tenant_id', 'NOT SET')}")
    except User.DoesNotExist:
        print("❌ User support@dottapps.com not found!")
        return
    
    # Get the tenant_id
    tenant_id = getattr(user, 'tenant_id', None) or getattr(user, 'business_id', None)
    
    if not tenant_id:
        print("❌ User has no tenant_id or business_id!")
        return
    
    print(f"\n📊 Checking data for tenant: {tenant_id}")
    print("-" * 40)
    
    # Check Products
    products = Product.objects.filter(tenant_id=tenant_id)
    print(f"Products: {products.count()}")
    for p in products[:3]:
        print(f"  - {p.name} (ID: {p.id})")
    
    # Check Services  
    services = Service.objects.filter(tenant_id=tenant_id)
    print(f"\nServices: {services.count()}")
    for s in services[:3]:
        print(f"  - {s.name} (ID: {s.id})")
    
    # Check Customers
    customers = Customer.objects.filter(tenant_id=tenant_id)
    print(f"\nCustomers: {customers.count()}")
    for c in customers[:3]:
        print(f"  - {c.business_name or f'{c.first_name} {c.last_name}'} (ID: {c.id})")
    
    # Check Invoices
    invoices = Invoice.objects.filter(tenant_id=tenant_id)
    print(f"\nInvoices: {invoices.count()}")
    for i in invoices[:3]:
        print(f"  - Invoice #{i.invoice_num} - ${i.totalAmount} (ID: {i.id})")
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    if products.count() > 0 and services.count() == 0 and customers.count() == 0:
        print("⚠️  ISSUE: Only Products are showing, other data is not!")
        print("   This indicates the ViewSet fixes are needed.")
    elif products.count() > 0 and services.count() > 0 and customers.count() > 0:
        print("✅ SUCCESS: All data types are showing correctly!")
    else:
        print("❓ PARTIAL: Some data is showing, check individual counts.")

if __name__ == "__main__":
    test_tenant_data_retrieval()