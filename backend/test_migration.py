#!/usr/bin/env python3
"""
Test Enhanced Transport Migration 0004
"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection

def test_enhanced_migration():
    """Test the enhanced migration function"""
    print("🔧 Testing enhanced migration 0004...")
    
    # Import the migration function
    from transport.migrations import 0004_fix_user_foreign_key_types as migration_module
    
    # Create a mock schema editor
    class MockSchemaEditor:
        def __init__(self):
            self.connection = connection
    
    schema_editor = MockSchemaEditor()
    
    try:
        # Test the function
        migration_module.fix_user_foreign_keys(None, schema_editor)
        print("✅ Migration function completed successfully!")
        
        # Verify the results
        with connection.cursor() as cursor:
            # Check column types after migration
            for table_name, column_name in [
                ('transport_driver', 'user_id'),
                ('transport_expense', 'created_by_id')
            ]:
                cursor.execute("""
                    SELECT data_type FROM information_schema.columns 
                    WHERE table_name = %s AND column_name = %s
                """, [table_name, column_name])
                result = cursor.fetchone()
                if result:
                    print(f"🔍 After migration: {table_name}.{column_name} type: {result[0]}")
                else:
                    print(f"❌ {table_name}.{column_name} not found")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_enhanced_migration()