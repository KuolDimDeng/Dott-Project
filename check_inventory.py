import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection

def check_inventory_tables():
    schema_name = 'tenant_18609ed2_1a46_4d50_bc4e_483d6e3405ff'
    
    with connection.cursor() as cursor:
        # Set schema
        cursor.execute(f'SET search_path TO {schema_name}')
        
        print(f"Checking schema: {schema_name}")
        
        # Check for inventory_product table
        try:
            cursor.execute('SELECT * FROM inventory_product')
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()
            print(f"\nProduct table columns: {columns}")
            print(f"Products found: {len(rows)}")
            if rows:
                for row in rows:
                    print(f"Product: {row}")
            else:
                print("No products found in the database.")
        except Exception as e:
            print(f"Error checking products: {e}")
        
        # Check for inventory_inventoryitem table
        try:
            cursor.execute('SELECT * FROM inventory_inventoryitem')
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()
            print(f"\nInventory item table columns: {columns}")
            print(f"Inventory items found: {len(rows)}")
            if rows:
                for row in rows:
                    print(f"Inventory item: {row}")
        except Exception as e:
            print(f"Error: inventory_inventoryitem table not found - {e}")
            
        # List all tables in the schema
        cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = %s ORDER BY table_name", [schema_name])
        tables = [row[0] for row in cursor.fetchall()]
        print(f"\nAll tables in schema {schema_name}:")
        for table in tables:
            print(f"  - {table}")

if __name__ == "__main__":
    check_inventory_tables() 