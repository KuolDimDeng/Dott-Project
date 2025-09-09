# Generated migration for courier delivery enhancements
from django.db import migrations, models


def add_fields_if_table_exists(apps, schema_editor):
    """Add fields only if table exists and fields don't already exist"""
    db_alias = schema_editor.connection.alias
    
    with schema_editor.connection.cursor() as cursor:
        # Check if CourierProfile table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'couriers_courierprofile'
            );
        """)
        table_exists = cursor.fetchone()[0]
        
        if not table_exists:
            print("⚠️ CourierProfile table does not exist - fields will be added when table is created")
            return
        
        # Check each field and add if it doesn't exist
        fields_to_add = {
            'delivery_categories': "JSONB DEFAULT '[]'::jsonb",
            'is_online': "BOOLEAN DEFAULT FALSE",
            'operating_hours': "JSONB DEFAULT '{}'::jsonb",
            'delivery_radius': "INTEGER DEFAULT 10"
        }
        
        for field_name, field_def in fields_to_add.items():
            cursor.execute(f"""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'couriers_courierprofile' 
                AND column_name = '{field_name}';
            """)
            
            if not cursor.fetchone():
                try:
                    cursor.execute(f"""
                        ALTER TABLE couriers_courierprofile 
                        ADD COLUMN IF NOT EXISTS {field_name} {field_def};
                    """)
                    print(f"✅ Added field: {field_name}")
                except Exception as e:
                    print(f"⚠️ Could not add field {field_name}: {e}")
            else:
                print(f"ℹ️ Field already exists: {field_name}")


def reverse_fields(apps, schema_editor):
    """Remove added fields"""
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'couriers_courierprofile'
            );
        """)
        table_exists = cursor.fetchone()[0]
        
        if table_exists:
            fields_to_remove = ['delivery_categories', 'is_online', 'operating_hours', 'delivery_radius']
            for field_name in fields_to_remove:
                try:
                    cursor.execute(f"""
                        ALTER TABLE couriers_courierprofile 
                        DROP COLUMN IF EXISTS {field_name};
                    """)
                except Exception:
                    pass


class Migration(migrations.Migration):

    dependencies = [
        ('couriers', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(add_fields_if_table_exists, reverse_fields),
    ]