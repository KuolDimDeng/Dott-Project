#!/usr/bin/env python
"""
Script to fix business model references in the database.
This script should be run after the Business model has been moved from the business app to the users app.
"""

import os
import sys
import django

# Set up Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection, transaction
from django.db.utils import ProgrammingError

def fix_business_references():
    """
    Update foreign key references to business.business to point to users.business
    """
    with connection.cursor() as cursor:
        # Get the list of tables that have a foreign key to business_business
        cursor.execute("""
            SELECT tc.table_name, kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
            AND ccu.table_name = 'business_business'
        """)
        
        tables_with_fk = cursor.fetchall()
        
        if not tables_with_fk:
            print("No tables found with foreign keys to business_business")
            return
        
        print(f"Found {len(tables_with_fk)} tables with foreign keys to business_business")
        
        # For each table, update the foreign key to point to users_business
        with transaction.atomic():
            for table_name, column_name in tables_with_fk:
                print(f"Updating {table_name}.{column_name}")
                
                # First, drop the foreign key constraint
                try:
                    cursor.execute(f"""
                        ALTER TABLE {table_name}
                        DROP CONSTRAINT IF EXISTS {table_name}_{column_name}_fkey
                    """)
                except ProgrammingError as e:
                    print(f"Error dropping constraint: {e}")
                    # Try to get the actual constraint name
                    cursor.execute(f"""
                        SELECT tc.constraint_name
                        FROM information_schema.table_constraints tc
                        JOIN information_schema.key_column_usage kcu
                            ON tc.constraint_name = kcu.constraint_name
                        WHERE tc.constraint_type = 'FOREIGN KEY'
                        AND kcu.table_name = '{table_name}'
                        AND kcu.column_name = '{column_name}'
                    """)
                    constraint_name = cursor.fetchone()
                    if constraint_name:
                        cursor.execute(f"""
                            ALTER TABLE {table_name}
                            DROP CONSTRAINT IF EXISTS {constraint_name[0]}
                        """)
                
                # Add a new foreign key constraint pointing to users_business
                cursor.execute(f"""
                    ALTER TABLE {table_name}
                    ADD CONSTRAINT {table_name}_{column_name}_fkey
                    FOREIGN KEY ({column_name})
                    REFERENCES users_business(id)
                    ON DELETE CASCADE
                """)
                
                print(f"Successfully updated {table_name}.{column_name}")

if __name__ == "__main__":
    fix_business_references()
    print("Business references fixed successfully")