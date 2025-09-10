#!/usr/bin/env python
"""
Fix marketplace business listing database migration issues
Run this in Django shell: python manage.py shell < scripts/fix_marketplace_migration.py
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection
import logging

logger = logging.getLogger(__name__)

def fix_marketplace_tables():
    """Add missing columns to marketplace tables"""
    with connection.cursor() as cursor:
        # Check if marketplace_business_listing table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'marketplace_business_listing'
            );
        """)
        table_exists = cursor.fetchone()[0]
        
        if not table_exists:
            print("❌ marketplace_business_listing table does not exist. Running migrations...")
            from django.core.management import call_command
            call_command('migrate', 'marketplace')
            return
        
        # List of columns to add
        columns_to_add = [
            ('is_open_now', 'BOOLEAN DEFAULT FALSE'),
            ('business_hours', 'JSONB DEFAULT \'{}\'::jsonb'),
            ('search_tags', 'TEXT[] DEFAULT ARRAY[]::TEXT[]'),
            ('description', 'TEXT DEFAULT \'\''),
            ('manual_subcategories', 'TEXT[] DEFAULT ARRAY[]::TEXT[]'),
            ('auto_subcategories', 'TEXT[] DEFAULT ARRAY[]::TEXT[]'),
            ('average_rating', 'DECIMAL(3,2) DEFAULT 0.00'),
            ('total_reviews', 'INTEGER DEFAULT 0'),
            ('total_orders', 'INTEGER DEFAULT 0'),
            ('average_response_time', 'INTEGER DEFAULT NULL'),
            ('response_rate', 'DECIMAL(5,2) DEFAULT NULL'),
            ('last_active', 'TIMESTAMP WITH TIME ZONE DEFAULT NULL')
        ]
        
        for column_name, column_def in columns_to_add:
            # Check if column exists
            cursor.execute(f"""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'marketplace_business_listing'
                    AND column_name = '{column_name}'
                );
            """)
            column_exists = cursor.fetchone()[0]
            
            if not column_exists:
                print(f"Adding missing {column_name} column...")
                try:
                    cursor.execute(f"""
                        ALTER TABLE marketplace_business_listing 
                        ADD COLUMN IF NOT EXISTS {column_name} {column_def};
                    """)
                    print(f"✅ Added {column_name} column")
                except Exception as e:
                    print(f"⚠️ Warning adding {column_name}: {e}")
        
        # Create indexes for better performance
        print("Creating indexes...")
        indexes = [
            ('idx_marketplace_listing_business', 'business_id'),
            ('idx_marketplace_listing_visible', 'is_visible_in_marketplace'),
            ('idx_marketplace_listing_city_country', 'city, country'),
            ('idx_marketplace_listing_type', 'business_type')
        ]
        
        for index_name, columns in indexes:
            cursor.execute(f"""
                SELECT EXISTS (
                    SELECT 1 FROM pg_indexes 
                    WHERE tablename = 'marketplace_business_listing' 
                    AND indexname = '{index_name}'
                );
            """)
            index_exists = cursor.fetchone()[0]
            
            if not index_exists:
                try:
                    cursor.execute(f"""
                        CREATE INDEX IF NOT EXISTS {index_name} 
                        ON marketplace_business_listing ({columns});
                    """)
                    print(f"✅ Created index {index_name}")
                except Exception as e:
                    print(f"⚠️ Warning creating index {index_name}: {e}")
        
        print("✅ All marketplace database fixes applied successfully")

if __name__ == '__main__':
    try:
        fix_marketplace_tables()
    except Exception as e:
        print(f"❌ Error fixing marketplace tables: {e}")
        import traceback
        traceback.print_exc()