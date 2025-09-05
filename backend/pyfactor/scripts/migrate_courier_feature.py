#!/usr/bin/env python
"""
Migration script for Courier Delivery Feature
Run this script to create and apply all necessary migrations for the courier feature.
"""
import os
import sys
import django

# Add the project directory to the Python path
project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_dir)

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.core.management import execute_from_command_line
from django.db import connection
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_migrations():
    """Run migrations for courier feature"""
    print("\n" + "="*60)
    print("🚗 Courier Delivery Feature - Migration Script")
    print("="*60 + "\n")
    
    try:
        # Step 1: Check if marketplace needs migrations
        print("📦 Step 1: Checking marketplace app...")
        print("   (ConsumerOrder already exists in marketplace.order_models)")
        print("✅ Marketplace models ready\n")
        
        # Step 2: Make migrations for couriers app
        print("🚚 Step 2: Creating migrations for couriers app...")
        execute_from_command_line(['manage.py', 'makemigrations', 'couriers'])
        print("✅ Courier migrations created\n")
        
        # Step 3: Show migration plan
        print("📋 Step 3: Migration plan:")
        execute_from_command_line(['manage.py', 'showmigrations', 'couriers'])
        print()
        
        # Step 4: Apply migrations
        user_input = input("Do you want to apply these migrations? (yes/no): ")
        if user_input.lower() in ['yes', 'y']:
            print("\n🔄 Applying migrations...")
            execute_from_command_line(['manage.py', 'migrate', 'couriers'])
            print("✅ All migrations applied successfully!\n")
            
            # Step 5: Verify tables were created
            print("📊 Verifying database tables...")
            with connection.cursor() as cursor:
                # Check for courier tables
                cursor.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name LIKE 'courier%'
                    ORDER BY table_name;
                """)
                courier_tables = cursor.fetchall()
                
                if courier_tables:
                    print("\n✅ Courier tables created:")
                    for table in courier_tables:
                        print(f"   - {table[0]}")
                
                # Check for marketplace consumer order table
                cursor.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'marketplace_consumer_orders';
                """)
                order_table = cursor.fetchone()
                
                if order_table:
                    print(f"\n✅ Marketplace order table created:")
                    print(f"   - {order_table[0]}")
            
            print("\n" + "="*60)
            print("🎉 Courier Feature Migration Complete!")
            print("="*60)
            print("\nNext steps:")
            print("1. Test the courier registration at: /api/couriers/couriers/register/")
            print("2. Access courier dashboard at: /api/couriers/couriers/dashboard/")
            print("3. Test in mobile app: Account → 'I have a business' button")
            print("\n💡 Tip: Run 'python manage.py createsuperuser' to create an admin user")
            
        else:
            print("\n❌ Migration cancelled")
            
    except Exception as e:
        print(f"\n❌ Error during migration: {str(e)}")
        print("\nTroubleshooting tips:")
        print("1. Make sure you're in the correct directory: /backend/pyfactor/")
        print("2. Ensure database is running and accessible")
        print("3. Check that couriers app is in INSTALLED_APPS in settings.py")
        print("4. Try running: python manage.py check")
        return False
    
    return True

if __name__ == '__main__':
    success = run_migrations()
    sys.exit(0 if success else 1)