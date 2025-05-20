#!/usr/bin/env python
"""
Script to directly query the database for a product by ID.
This bypasses the API and any potential performance issues.

Usage:
python get_product.py <tenant_id> <product_id>

Example:
python get_product.py 14553c00-9f2f-4c66-a1a1-45f3cb331ded 189f84f3-f5e1-44ff-ba09-a761a5e40276
"""

import os
import sys
import json
import django
from decimal import Decimal

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection
from django.core.serializers.json import DjangoJSONEncoder

class DecimalEncoder(DjangoJSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)

def get_product_by_id(tenant_id, product_id):
    """
    Get a product by ID from a specific tenant schema.
    
    Args:
        tenant_id (str): The tenant ID
        product_id (str): The product ID
        
    Returns:
        dict: The product data
    """
    # Format tenant ID for schema name
    schema_name = f"tenant_{tenant_id.replace('-', '_')}"
    
    try:
        # Set search path to tenant schema
        with connection.cursor() as cursor:
            # RLS: Use tenant context instead of schema
        # cursor.execute(f'SET search_path TO {schema_name}')
        set_current_tenant_id(tenant_id),public')
            
            # Query for the product
            cursor.execute("""
                SELECT 
                    p.id, 
                    p.name, 
                    p.description, 
                    p.price, 
                    p.is_for_sale, 
                    p.is_for_rent, 
                    p.salesTax, 
                    p.created_at, 
                    p.updated_at,
                    p.product_code, 
                    p.stock_quantity, 
                    p.reorder_level,
                    d.dept_name as department_name
                FROM 
                    inventory_product p
                LEFT JOIN 
                    inventory_department d ON p.department_id = d.id
                WHERE 
                    p.id = %s
            """, [product_id])
            
            # Fetch the result
            columns = [col[0] for col in cursor.description]
            result = cursor.fetchone()
            
            if not result:
                print(f"No product found with ID {product_id} in schema {schema_name}")
                return None
            
            # Convert to dictionary
            product = dict(zip(columns, result))
            
            # Reset search path
            cursor.execute('-- RLS: No need to set search_path with tenant-aware context
    -- Original: SET search_path TO public')
            
            return product
    except Exception as e:
        print(f"Error: {str(e)}")
        return None

def list_products(tenant_id, limit=10):
    """
    List products from a specific tenant schema.

# RLS: Importing tenant context functions
from custom_auth.rls import set_current_tenant_id, tenant_context
    
    Args:
        tenant_id (str): The tenant ID
        limit (int): Maximum number of products to return
        
    Returns:
        list: List of products
    """
    # Format tenant ID for schema name
    schema_name = f"tenant_{tenant_id.replace('-', '_')}"
    
    try:
        # Set search path to tenant schema
        with connection.cursor() as cursor:
            # RLS: Use tenant context instead of schema
        # cursor.execute(f'SET search_path TO {schema_name}')
        set_current_tenant_id(tenant_id),public')
            
            # Query for products
            cursor.execute(f"""
                SELECT 
                    p.id, 
                    p.name, 
                    p.product_code, 
                    p.price, 
                    p.stock_quantity, 
                    p.reorder_level,
                    p.is_for_sale,
                    p.created_at
                FROM 
                    inventory_product p
                ORDER BY 
                    p.created_at DESC
                LIMIT {limit}
            """)
            
            # Fetch results
            columns = [col[0] for col in cursor.description]
            results = cursor.fetchall()
            
            # Convert to list of dictionaries
            products = [dict(zip(columns, row)) for row in results]
            
            # Reset search path
            cursor.execute('-- RLS: No need to set search_path with tenant-aware context
    -- Original: SET search_path TO public')
            
            return products
    except Exception as e:
        print(f"Error: {str(e)}")
        return []

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python get_product.py <tenant_id> [product_id]")
        sys.exit(1)
    
    tenant_id = sys.argv[1]
    
    if len(sys.argv) >= 3:
        # Get specific product
        product_id = sys.argv[2]
        product = get_product_by_id(tenant_id, product_id)
        
        if product:
            print(json.dumps(product, cls=DecimalEncoder, indent=2))
        else:
            print("Product not found")
    else:
        # List products
        products = list_products(tenant_id)
        
        if products:
            print(json.dumps(products, cls=DecimalEncoder, indent=2))
        else:
            print("No products found")