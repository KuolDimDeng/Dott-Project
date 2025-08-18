#!/usr/bin/env python
"""
Direct database migration tool
Bypasses Django's migration system for critical updates
Industry-standard approach for production hotfixes
"""
import os
import sys
import django
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection, transaction
from django.core.management import call_command
import logging

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

class DirectMigration:
    """
    Apply database changes directly without Django migrations
    Used by companies like Instagram, Pinterest for production
    """
    
    @staticmethod
    @transaction.atomic
    def add_tax_cache_fields():
        """
        Add tax cache fields directly to database
        """
        print("=" * 60)
        print("APPLYING TAX CACHE FIELDS DIRECTLY")
        print("=" * 60)
        
        with connection.cursor() as cursor:
            # Check current schema
            cursor.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'users_userprofile'
                AND column_name LIKE 'cached_tax%'
                ORDER BY ordinal_position;
            """)
            
            existing = cursor.fetchall()
            if existing:
                print(f"✓ Found {len(existing)} existing tax cache fields")
                for col, dtype in existing:
                    print(f"  - {col}: {dtype}")
                return True
            
            print("\n📦 Adding tax cache fields...")
            
            # Add fields with proper types
            sql = """
                ALTER TABLE users_userprofile 
                ADD COLUMN IF NOT EXISTS cached_tax_rate NUMERIC(5, 4),
                ADD COLUMN IF NOT EXISTS cached_tax_rate_percentage NUMERIC(5, 2),
                ADD COLUMN IF NOT EXISTS cached_tax_jurisdiction VARCHAR(100),
                ADD COLUMN IF NOT EXISTS cached_tax_updated_at TIMESTAMP WITH TIME ZONE,
                ADD COLUMN IF NOT EXISTS cached_tax_source VARCHAR(20);
            """
            
            cursor.execute(sql)
            
            # Create index for performance
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_userprofile_tax_cache_updated 
                ON users_userprofile(cached_tax_updated_at) 
                WHERE cached_tax_rate IS NOT NULL;
            """)
            
            print("✅ Tax cache fields added successfully")
            
            # Update Django's migration table to mark as applied
            cursor.execute("""
                INSERT INTO django_migrations (app, name, applied)
                VALUES ('users', '0123_add_cached_tax_rate_fields', NOW())
                ON CONFLICT (app, name) DO NOTHING;
            """)
            
            print("✅ Migration recorded in Django")
            
        return True
    
    @staticmethod
    @transaction.atomic
    def populate_tax_cache():
        """
        Populate tax cache for all users
        """
        print("\n" + "=" * 60)
        print("POPULATING TAX CACHE")
        print("=" * 60)
        
        from taxes.services.tax_cache_service import TaxRateCacheService
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        users = User.objects.filter(is_active=True).select_related('userprofile')
        
        total = users.count()
        print(f"\nProcessing {total} users...")
        
        updated = 0
        failed = 0
        
        for i, user in enumerate(users, 1):
            try:
                result = TaxRateCacheService.update_user_cached_tax_rate(user)
                
                if result.get("success"):
                    rate = result.get("rate_percentage", 0)
                    jurisdiction = result.get("jurisdiction", "Unknown")
                    print(f"[{i}/{total}] ✓ {user.email}: {rate:.1f}% - {jurisdiction}")
                    updated += 1
                else:
                    print(f"[{i}/{total}] ✗ {user.email}: {result.get('error', 'Unknown error')}")
                    failed += 1
                    
            except Exception as e:
                print(f"[{i}/{total}] ✗ {user.email}: {str(e)}")
                failed += 1
        
        print("\n" + "=" * 60)
        print(f"✅ Successfully updated: {updated}")
        if failed > 0:
            print(f"⚠️ Failed: {failed}")
        print(f"📊 Total processed: {updated + failed}/{total}")
        
        return updated > 0
    
    @staticmethod
    def verify_schema():
        """
        Verify the database schema matches expectations
        """
        print("\n" + "=" * 60)
        print("VERIFYING DATABASE SCHEMA")
        print("=" * 60)
        
        with connection.cursor() as cursor:
            # Check UserProfile fields
            cursor.execute("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'users_userprofile'
                AND column_name LIKE 'cached_tax%'
                ORDER BY ordinal_position;
            """)
            
            fields = cursor.fetchall()
            
            if fields:
                print("\n✅ Tax cache fields found:")
                for col, dtype, nullable in fields:
                    null_str = "NULL" if nullable == 'YES' else "NOT NULL"
                    print(f"  - {col}: {dtype} {null_str}")
            else:
                print("❌ No tax cache fields found")
                return False
            
            # Check for data
            cursor.execute("""
                SELECT COUNT(*) as total,
                       COUNT(cached_tax_rate) as with_cache,
                       AVG(cached_tax_rate_percentage) as avg_rate
                FROM users_userprofile;
            """)
            
            total, with_cache, avg_rate = cursor.fetchone()
            
            print(f"\n📊 Cache Statistics:")
            print(f"  - Total profiles: {total}")
            print(f"  - With cache: {with_cache}")
            if avg_rate:
                print(f"  - Average tax rate: {avg_rate:.2f}%")
            
            return True
    
    @staticmethod
    def cleanup_migrations():
        """
        Clean up conflicting migrations
        """
        print("\n" + "=" * 60)
        print("CLEANING UP MIGRATIONS")
        print("=" * 60)
        
        with connection.cursor() as cursor:
            # Find duplicate or problematic migrations
            cursor.execute("""
                SELECT app, name, applied, COUNT(*)
                FROM django_migrations
                GROUP BY app, name, applied
                HAVING COUNT(*) > 1;
            """)
            
            duplicates = cursor.fetchall()
            
            if duplicates:
                print(f"⚠️ Found {len(duplicates)} duplicate migrations")
                for app, name, applied, count in duplicates:
                    print(f"  - {app}.{name}: {count} entries")
                    
                    # Keep only the oldest one
                    cursor.execute("""
                        DELETE FROM django_migrations
                        WHERE app = %s AND name = %s
                        AND applied > (
                            SELECT MIN(applied)
                            FROM django_migrations
                            WHERE app = %s AND name = %s
                        );
                    """, [app, name, app, name])
                    
                print("✅ Duplicates removed")
            else:
                print("✓ No duplicate migrations found")
            
            # Mark tax migration as applied if fields exist
            cursor.execute("""
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'users_userprofile'
                AND column_name = 'cached_tax_rate';
            """)
            
            if cursor.fetchone():
                cursor.execute("""
                    INSERT INTO django_migrations (app, name, applied)
                    VALUES ('users', '0123_add_cached_tax_rate_fields', NOW())
                    ON CONFLICT (app, name) DO UPDATE SET applied = NOW();
                """)
                print("✅ Tax migration marked as applied")

def main():
    """
    Main execution
    """
    import argparse
    
    parser = argparse.ArgumentParser(description='Direct database migration tool')
    parser.add_argument('--add-tax-cache', action='store_true', help='Add tax cache fields')
    parser.add_argument('--populate', action='store_true', help='Populate tax cache')
    parser.add_argument('--verify', action='store_true', help='Verify schema')
    parser.add_argument('--cleanup', action='store_true', help='Clean up migrations')
    parser.add_argument('--all', action='store_true', help='Do everything')
    
    args = parser.parse_args()
    
    migrator = DirectMigration()
    
    if args.all:
        migrator.cleanup_migrations()
        migrator.add_tax_cache_fields()
        migrator.populate_tax_cache()
        migrator.verify_schema()
    elif args.add_tax_cache:
        migrator.add_tax_cache_fields()
    elif args.populate:
        migrator.populate_tax_cache()
    elif args.verify:
        migrator.verify_schema()
    elif args.cleanup:
        migrator.cleanup_migrations()
    else:
        print("Direct Database Migration Tool")
        print("=" * 40)
        print("Usage:")
        print("  python direct_db_migration.py --all           # Complete setup")
        print("  python direct_db_migration.py --add-tax-cache # Add fields")
        print("  python direct_db_migration.py --populate      # Populate cache")
        print("  python direct_db_migration.py --verify        # Verify schema")
        print("  python direct_db_migration.py --cleanup       # Clean migrations")

if __name__ == '__main__':
    main()