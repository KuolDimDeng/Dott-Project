#!/usr/bin/env python3
"""
Safely run pricing model migrations in production
"""

import os
import sys
import django
from django.db import connection
from django.core.management import call_command

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def check_current_state():
    """Check current state of migrations and columns"""
    print("\n" + "=" * 60)
    print("CHECKING CURRENT DATABASE STATE")
    print("=" * 60)
    
    with connection.cursor() as cursor:
        # Check inventory_product columns
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'inventory_product' 
            AND column_name IN ('pricing_model', 'weight', 'weight_unit', 'daily_rate', 'entry_date')
            ORDER BY column_name;
        """)
        
        existing_columns = [row[0] for row in cursor.fetchall()]
        
        print("\nExisting pricing columns in inventory_product:")
        if existing_columns:
            for col in existing_columns:
                print(f"  ✅ {col}")
        else:
            print("  ❌ No pricing columns found")
        
        # Check BusinessSettings table
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'users_business_settings'
            );
        """)
        
        business_settings_exists = cursor.fetchone()[0]
        print(f"\nBusinessSettings table exists: {'✅ Yes' if business_settings_exists else '❌ No'}")
    
    print("\n" + "-" * 60)
    print("PENDING MIGRATIONS:")
    print("-" * 60)
    
    # Show pending migrations
    call_command('showmigrations', 'inventory', '--plan', verbosity=0)
    call_command('showmigrations', 'users', '--plan', verbosity=0)

def run_migrations():
    """Run the migrations"""
    print("\n" + "=" * 60)
    print("RUNNING MIGRATIONS")
    print("=" * 60)
    
    try:
        # Run inventory migrations
        print("\nRunning inventory migrations...")
        call_command('migrate', 'inventory', verbosity=2)
        
        # Run users migrations
        print("\nRunning users migrations...")
        call_command('migrate', 'users', verbosity=2)
        
        print("\n✅ Migrations completed successfully!")
        return True
        
    except Exception as e:
        print(f"\n❌ Error running migrations: {str(e)}")
        return False

def verify_migrations():
    """Verify migrations were applied successfully"""
    print("\n" + "=" * 60)
    print("VERIFYING MIGRATIONS")
    print("=" * 60)
    
    with connection.cursor() as cursor:
        # Check inventory_product columns
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'inventory_product' 
            AND column_name IN ('pricing_model', 'weight', 'weight_unit', 'daily_rate', 'entry_date')
            ORDER BY column_name;
        """)
        
        columns = cursor.fetchall()
        
        expected_columns = {
            'pricing_model': 'character varying',
            'weight': 'numeric',
            'weight_unit': 'character varying',
            'daily_rate': 'numeric',
            'entry_date': 'timestamp with time zone'
        }
        
        found_columns = {col[0]: col[1] for col in columns}
        
        all_good = True
        print("\nPricing model columns:")
        for col_name, expected_type in expected_columns.items():
            if col_name in found_columns:
                print(f"  ✅ {col_name}: {found_columns[col_name]}")
            else:
                print(f"  ❌ {col_name}: NOT FOUND")
                all_good = False
        
        # Check BusinessSettings
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users_business_settings' 
            AND column_name IN ('default_pricing_model', 'default_daily_rate', 'default_weight_unit')
            ORDER BY column_name;
        """)
        
        bs_columns = [row[0] for row in cursor.fetchall()]
        
        print("\nBusinessSettings columns:")
        expected_bs_columns = ['default_pricing_model', 'default_daily_rate', 'default_weight_unit']
        for col in expected_bs_columns:
            if col in bs_columns:
                print(f"  ✅ {col}")
            else:
                print(f"  ❌ {col}: NOT FOUND")
                all_good = False
        
        return all_good

def main():
    """Main function"""
    print("\n" + "#" * 60)
    print("# PRICING MODEL MIGRATION SCRIPT")
    print("#" * 60)
    
    # Check current state
    check_current_state()
    
    # Ask for confirmation
    print("\n" + "!" * 60)
    print("! WARNING: This will run database migrations in production!")
    print("!" * 60)
    response = input("\nDo you want to continue? (yes/no): ")
    
    if response.lower() != 'yes':
        print("\n⚠️  Migration cancelled.")
        return
    
    # Run migrations
    if run_migrations():
        # Verify
        if verify_migrations():
            print("\n" + "=" * 60)
            print("✅ ALL MIGRATIONS COMPLETED SUCCESSFULLY!")
            print("=" * 60)
            print("\nYou can now create products with pricing models.")
        else:
            print("\n⚠️  Some columns may be missing. Please check the output above.")
    else:
        print("\n❌ Migration failed. Please check the error messages above.")

if __name__ == "__main__":
    main()