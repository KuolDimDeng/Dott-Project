#!/usr/bin/env python
"""
Fix courier profile database migration issues
Run this in Django shell: python manage.py shell < scripts/fix_courier_migration.py
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection
from django.contrib.auth import get_user_model

User = get_user_model()

def fix_courier_tables():
    """Add missing columns to courier tables"""
    with connection.cursor() as cursor:
        # Check if courier_profiles table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'courier_profiles'
            );
        """)
        table_exists = cursor.fetchone()[0]
        
        if not table_exists:
            print("❌ courier_profiles table does not exist. Running migrations...")
            from django.core.management import call_command
            call_command('migrate', 'couriers')
            return
        
        # Check if verified_by_id column exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'courier_profiles'
                AND column_name = 'verified_by_id'
            );
        """)
        column_exists = cursor.fetchone()[0]
        
        if not column_exists:
            print("Adding missing verified_by_id column...")
            cursor.execute("""
                ALTER TABLE courier_profiles 
                ADD COLUMN IF NOT EXISTS verified_by_id integer 
                REFERENCES auth_user(id) ON DELETE SET NULL;
            """)
            print("✅ Added verified_by_id column")
        
        # Check for verification_date column
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'courier_profiles'
                AND column_name = 'verification_date'
            );
        """)
        date_exists = cursor.fetchone()[0]
        
        if not date_exists:
            print("Adding missing verification_date column...")
            cursor.execute("""
                ALTER TABLE courier_profiles 
                ADD COLUMN IF NOT EXISTS verification_date timestamp with time zone;
            """)
            print("✅ Added verification_date column")
        
        # Check for DeliveryOrder table
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'courier_deliveryorder'
            );
        """)
        delivery_exists = cursor.fetchone()[0]
        
        if not delivery_exists:
            print("Creating DeliveryOrder table...")
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS courier_deliveryorder (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    order_number VARCHAR(50) UNIQUE NOT NULL,
                    courier_id UUID REFERENCES courier_profiles(id) ON DELETE SET NULL,
                    status VARCHAR(20) DEFAULT 'pending',
                    pickup_address TEXT,
                    delivery_address TEXT,
                    pickup_time TIMESTAMP WITH TIME ZONE,
                    delivery_time TIMESTAMP WITH TIME ZONE,
                    distance DECIMAL(10, 2),
                    delivery_fee DECIMAL(10, 2) DEFAULT 0,
                    tip_amount DECIMAL(10, 2) DEFAULT 0,
                    customer_name VARCHAR(100),
                    customer_phone VARCHAR(20),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            """)
            print("✅ Created DeliveryOrder table")
        
        print("✅ All courier database fixes applied successfully")

if __name__ == '__main__':
    try:
        fix_courier_tables()
    except Exception as e:
        print(f"❌ Error fixing courier tables: {e}")
        import traceback
        traceback.print_exc()