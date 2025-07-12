#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Ensure tenant_id column exists for Employee table
This runs on startup to fix any missing columns
"""
import os
import sys
import django
from django.db import connection, transaction

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def ensure_tenant_id_column():
    """Add tenant_id column if it doesn't exist"""
    print('🔧 Checking for tenant_id column in hr_employee table...')
    
    with connection.cursor() as cursor:
        try:
            # Check if column exists
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'hr_employee' 
                AND column_name = 'tenant_id'
            """)
            
            if cursor.fetchone():
                print('✅ tenant_id column already exists')
                return
            
            print('❌ tenant_id column missing, adding it now...')
            
            with transaction.atomic():
                # Add the column
                cursor.execute("""
                    ALTER TABLE hr_employee 
                    ADD COLUMN tenant_id UUID
                """)
                print('✅ Added tenant_id column')
                
                # Copy business_id to tenant_id
                cursor.execute("""
                    UPDATE hr_employee 
                    SET tenant_id = business_id 
                    WHERE tenant_id IS NULL AND business_id IS NOT NULL
                """)
                print(f'✅ Updated {cursor.rowcount} rows with tenant_id = business_id')
                
                # Add index
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS hr_employee_tenant_id_idx 
                    ON hr_employee(tenant_id)
                """)
                print('✅ Added index on tenant_id')
                
        except Exception as e:
            print(f'❌ Error: {str(e)}')
            # Don't crash the startup, just log the error
            pass

if __name__ == '__main__':
    ensure_tenant_id_column()