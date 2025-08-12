#!/usr/bin/env python3
"""
Test script to check what the backend actually returns for products
"""

import os
import sys
import django
import json

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
sys.path.insert(0, '/Users/kuoldeng/projectx/backend/pyfactor')
django.setup()

from inventory.models import Product
from inventory.serializers import ProductSerializer
from django.contrib.auth import get_user_model

User = get_user_model()

# Get a test user
user = User.objects.filter(email='support@dottapps.com').first()

if user:
    print("Testing Product API Response")
    print("=" * 50)
    
    # Get products for this user's tenant
    products = Product.objects.filter(tenant_id=user.tenant_id)[:3]
    
    print(f"Found {products.count()} products for tenant: {user.tenant_id}")
    print("")
    
    for i, product in enumerate(products, 1):
        print(f"Product {i}: {product.name}")
        print(f"  Model field 'quantity': {product.quantity}")
        
        # Check if there's a stock_quantity property or field
        if hasattr(product, 'stock_quantity'):
            print(f"  Has stock_quantity attribute: {product.stock_quantity}")
        else:
            print(f"  No stock_quantity attribute")
            
        # Serialize the product
        serialized = ProductSerializer(product).data
        print(f"  Serialized data keys: {list(serialized.keys())}")
        
        # Check what quantity fields are in serialized data
        if 'quantity' in serialized:
            print(f"  Serialized 'quantity': {serialized['quantity']}")
        if 'stock_quantity' in serialized:
            print(f"  Serialized 'stock_quantity': {serialized['stock_quantity']}")
        if 'quantity_in_stock' in serialized:
            print(f"  Serialized 'quantity_in_stock': {serialized['quantity_in_stock']}")
            
        print("")
    
    # Show the actual JSON that would be sent
    print("Full serialized JSON for first product:")
    print(json.dumps(ProductSerializer(products.first()).data, indent=2, default=str))
else:
    print("User not found")