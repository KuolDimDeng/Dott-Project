#!/usr/bin/env python
"""
Test script for POS backorder functionality
"""

import os
import sys
import django
import json
from decimal import Decimal

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from sales.models import Product, POSTransaction, SalesOrder
from sales.services.inventory_service import InventoryService
from custom_auth.models import TenantManager

User = get_user_model()

def test_backorder_functionality():
    print("=" * 60)
    print("TESTING POS BACKORDER FUNCTIONALITY")
    print("=" * 60)
    
    # Get a test user
    user = User.objects.filter(is_active=True).first()
    if not user:
        print("❌ No active user found")
        return
    
    print(f"✅ Using user: {user.username} (Tenant: {user.tenant_id})")
    
    # Set tenant context
    TenantManager.set_current_tenant(user.tenant_id)
    
    # Get a product to test with
    product = Product.objects.filter(tenant_id=user.tenant_id).first()
    if not product:
        print("❌ No products found for this tenant")
        return
    
    print(f"\n📦 Testing with product: {product.name}")
    print(f"   Current stock: {product.quantity}")
    
    # Test 1: Validate stock with backorders allowed
    print("\n" + "-" * 40)
    print("TEST 1: Validate stock with backorders allowed")
    print("-" * 40)
    
    items = [{
        'type': 'product',
        'item': product,
        'quantity': product.quantity + 5,  # Request more than available
        'is_backorder': True
    }]
    
    try:
        backorder_info = InventoryService.validate_stock_availability(items, allow_backorders=True)
        print(f"✅ Validation passed with backorders allowed")
        print(f"   Backorder info: {backorder_info}")
    except Exception as e:
        print(f"❌ Validation failed: {e}")
    
    # Test 2: Reduce stock with negative allowed
    print("\n" + "-" * 40)
    print("TEST 2: Reduce stock allowing negative inventory")
    print("-" * 40)
    
    original_quantity = product.quantity
    
    try:
        stock_result = InventoryService.reduce_stock(
            items, 
            transaction_ref="TEST-001",
            allow_negative=True
        )
        
        # Refresh product
        product.refresh_from_db()
        
        print(f"✅ Stock reduced successfully")
        print(f"   Original quantity: {original_quantity}")
        print(f"   New quantity: {product.quantity}")
        print(f"   Backorder items: {stock_result.get('backorder_items', [])}")
        
        # Restore original quantity
        product.quantity = original_quantity
        product.save()
        print(f"   (Restored to original: {product.quantity})")
        
    except Exception as e:
        print(f"❌ Stock reduction failed: {e}")
    
    # Test 3: Check Sales Order creation
    print("\n" + "-" * 40)
    print("TEST 3: Check if Sales Orders were created for backorders")
    print("-" * 40)
    
    recent_orders = SalesOrder.objects.filter(
        tenant_id=user.tenant_id,
        status='backorder'
    ).order_by('-created_at')[:5]
    
    if recent_orders:
        print(f"✅ Found {recent_orders.count()} backorder Sales Orders:")
        for order in recent_orders:
            print(f"   - {order.order_number}: {order.notes[:50]}...")
            print(f"     Total: {order.total}, Items: {order.items.count()}")
    else:
        print("ℹ️  No backorder Sales Orders found (this is expected if POS endpoint wasn't called)")
    
    print("\n" + "=" * 60)
    print("TESTING COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    test_backorder_functionality()