#!/usr/bin/env python3
"""
Script to check if the location migration has been applied to the database.
This script checks for the existence of the new structured address fields.
"""

import os
import sys
import django
from django.db import connection
from django.core.exceptions import FieldDoesNotExist

# Add the backend directory to Python path
sys.path.insert(0, '/Users/kuoldeng/projectx/backend/pyfactor')

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def check_database_columns():
    """Check if the new columns exist in the database table"""
    print("🔍 Checking database columns for inventory_location table...")
    
    with connection.cursor() as cursor:
        # Get all column names from the inventory_location table
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'inventory_location'
            ORDER BY ordinal_position;
        """)
        
        columns = cursor.fetchall()
        
        print(f"\n📋 Found {len(columns)} columns in inventory_location table:")
        print("-" * 60)
        
        for column_name, data_type, is_nullable in columns:
            nullable = "NULL" if is_nullable == "YES" else "NOT NULL"
            print(f"  {column_name:<20} | {data_type:<15} | {nullable}")
        
        # Check for the specific new fields
        new_fields = [
            'street_address', 'street_address_2', 'city', 
            'state_province', 'postal_code', 'country',
            'latitude', 'longitude'
        ]
        
        existing_columns = [col[0] for col in columns]
        missing_fields = []
        existing_new_fields = []
        
        print(f"\n🎯 Checking for new migration fields:")
        print("-" * 40)
        
        for field in new_fields:
            if field in existing_columns:
                print(f"  ✅ {field} - EXISTS")
                existing_new_fields.append(field)
            else:
                print(f"  ❌ {field} - MISSING")
                missing_fields.append(field)
        
        return missing_fields, existing_new_fields

def check_django_migration_status():
    """Check Django's migration history"""
    print("\n🗃️  Checking Django migration status...")
    
    with connection.cursor() as cursor:
        # Check if the migration is recorded in django_migrations table
        cursor.execute("""
            SELECT name, applied 
            FROM django_migrations 
            WHERE app = 'inventory' 
            ORDER BY applied DESC 
            LIMIT 5;
        """)
        
        migrations = cursor.fetchall()
        
        print("\n📚 Recent inventory migrations:")
        print("-" * 50)
        
        target_migration = '0010_add_structured_address_to_location'
        migration_applied = False
        
        for name, applied in migrations:
            status = "✅ APPLIED" if applied else "❌ NOT APPLIED"
            print(f"  {name:<40} | {status}")
            
            if name == target_migration:
                migration_applied = applied
        
        print(f"\n🎯 Target migration status:")
        print(f"  {target_migration}: {'✅ APPLIED' if migration_applied else '❌ NOT APPLIED'}")
        
        return migration_applied

def check_model_fields():
    """Check if Django model has the new fields"""
    print("\n🐍 Checking Django model fields...")
    
    from inventory.models import Location
    
    new_fields = [
        'street_address', 'street_address_2', 'city', 
        'state_province', 'postal_code', 'country',
        'latitude', 'longitude'
    ]
    
    print("\n📝 Model field check:")
    print("-" * 30)
    
    model_has_fields = []
    model_missing_fields = []
    
    for field_name in new_fields:
        try:
            field = Location._meta.get_field(field_name)
            print(f"  ✅ {field_name} - {field.__class__.__name__}")
            model_has_fields.append(field_name)
        except FieldDoesNotExist:
            print(f"  ❌ {field_name} - NOT FOUND IN MODEL")
            model_missing_fields.append(field_name)
    
    return model_missing_fields, model_has_fields

def test_location_update():
    """Test if we can create/update a location with new fields"""
    print("\n🧪 Testing location creation with new fields...")
    
    try:
        from inventory.models import Location
        from decimal import Decimal
        
        # Try to get a tenant ID for testing - use a dummy UUID if none available
        tenant_id = None
        try:
            from custom_auth.models import TenantInfo
            test_tenant = TenantInfo.objects.first()
            if test_tenant:
                tenant_id = test_tenant.id
        except:
            # Use a dummy UUID if we can't get a real tenant
            import uuid
            tenant_id = uuid.uuid4()
            
        if not tenant_id:
            print("  ⚠️  No tenant available for testing - using dummy UUID")
            import uuid
            tenant_id = uuid.uuid4()
            
        # Try to create a test location
        test_location = Location(
            name="Migration Test Location",
            tenant_id=tenant_id,
            street_address="123 Test Street",
            city="Test City",
            state_province="Test State",
            postal_code="12345",
            country="US",
            latitude=Decimal('40.7128000'),
            longitude=Decimal('-74.0060000')
        )
        
        # Validate the model (don't save to avoid cluttering database)
        test_location.full_clean()
        
        print("  ✅ Location model validation passed")
        print("  ✅ All new fields are accessible")
        
        # Test the full_address property
        full_address = test_location.full_address
        print(f"  ✅ full_address property works: '{full_address}'")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Location test failed: {str(e)}")
        return False

def main():
    print("=" * 60)
    print("🔧 LOCATION MIGRATION STATUS CHECK")
    print("=" * 60)
    
    try:
        # Check database columns
        missing_db_fields, existing_db_fields = check_database_columns()
        
        # Check Django migration status
        migration_applied = check_django_migration_status()
        
        # Check model fields
        missing_model_fields, existing_model_fields = check_model_fields()
        
        # Test location functionality
        location_test_passed = test_location_update()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 SUMMARY")
        print("=" * 60)
        
        if not missing_db_fields and migration_applied and not missing_model_fields and location_test_passed:
            print("🎉 MIGRATION STATUS: ✅ FULLY APPLIED")
            print("   All new fields exist in database and model")
            print("   Location updates should work correctly")
        else:
            print("⚠️  MIGRATION STATUS: ❌ ISSUES DETECTED")
            
            if missing_db_fields:
                print(f"   🗄️  Missing database fields: {', '.join(missing_db_fields)}")
            
            if not migration_applied:
                print("   📚 Django migration not recorded as applied")
                
            if missing_model_fields:
                print(f"   🐍 Missing model fields: {', '.join(missing_model_fields)}")
                
            if not location_test_passed:
                print("   🧪 Location functionality test failed")
            
            print("\n🔧 RECOMMENDED ACTIONS:")
            
            if missing_db_fields or not migration_applied:
                print("   1. Run the migration on production:")
                print("      python manage.py migrate inventory 0010")
                
            if missing_model_fields:
                print("   2. Check if the model file is up to date")
                
            print("   3. Restart the Django application after migration")
        
        print("\n" + "=" * 60)
        
    except Exception as e:
        print(f"❌ Script failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()