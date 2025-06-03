import os
import django
import uuid
import datetime

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection
from decimal import Decimal

def create_test_product():
    schema_name = 'tenant_18609ed2_1a46_4d50_bc4e_483d6e3405ff'
    print(f"Creating test product in schema: {schema_name}")
    
    # Create a UUID for the department
    dept_id = uuid.uuid4()
    dept_name = 'Test Department'
    dept_desc = 'Department for test products'
    
    # Create a UUID for the product
    product_id = uuid.uuid4()
    product_code = f'PROD-{uuid.uuid4().hex[:8].upper()}'
    product_name = 'Test Product'
    product_desc = 'This is a test product created via script'
    product_price = Decimal('19.99')
    current_time = datetime.datetime.now()
    
    with connection.cursor() as cursor:
        cursor.execute(f'SET search_path TO {schema_name}')
        
        try:
            # First check if the department exists
            cursor.execute('''
                SELECT id FROM inventory_department WHERE name = %s
            ''', [dept_name])
            
            dept_result = cursor.fetchone()
            
            if dept_result:
                dept_id = dept_result[0]
                print(f"Using existing department: {dept_id} - {dept_name}")
            else:
                # Create department with raw SQL
                cursor.execute('''
                    INSERT INTO inventory_department 
                    (id, name, description, created_at, updated_at) 
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                ''', [dept_id, dept_name, dept_desc, current_time, current_time])
                
                dept_id = cursor.fetchone()[0]
                print(f"Created new department: {dept_id} - {dept_name}")
            
            # Create product with raw SQL
            cursor.execute('''
                INSERT INTO inventory_product 
                (id, name, description, price, is_for_sale, is_for_rent, 
                salestax, created_at, updated_at, product_code, department_id, 
                stock_quantity, reorder_level, height, width, height_unit, 
                width_unit, weight, weight_unit, charge_period, charge_amount) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            ''', [
                product_id, product_name, product_desc, product_price, 
                True, False, Decimal('0.00'), current_time, current_time, 
                product_code, dept_id, 10, 3, None, None, None, None, None, None, None, None
            ])
            
            created_product_id = cursor.fetchone()[0]
            print(f"Created product: {created_product_id} - {product_name} - {product_code}")
            
            # Count products
            cursor.execute('SELECT COUNT(*) FROM inventory_product')
            count = cursor.fetchone()[0]
            print(f"Total products in database: {count}")
            
            # List all products
            cursor.execute('SELECT id, name, product_code FROM inventory_product')
            products = cursor.fetchall()
            print("\nAll products in database:")
            for p in products:
                print(f"ID: {p[0]}, Name: {p[1]}, Code: {p[2]}")
                
        except Exception as e:
            print(f"Error creating product: {str(e)}")
            
if __name__ == "__main__":
    create_test_product() 