from django.db import migrations

def fix_order_defaults(apps, schema_editor):
    """Fix default values for order fields"""
    if schema_editor.connection.vendor == 'postgresql':
        with schema_editor.connection.cursor() as cursor:
            # Remove empty string defaults and set to NULL
            cursor.execute("""
                ALTER TABLE marketplace_consumer_orders
                ALTER COLUMN order_number DROP DEFAULT;

                ALTER TABLE marketplace_consumer_orders
                ALTER COLUMN delivery_address DROP DEFAULT;

                ALTER TABLE marketplace_consumer_orders
                ALTER COLUMN delivery_notes DROP DEFAULT;

                ALTER TABLE marketplace_consumer_orders
                ALTER COLUMN cancellation_reason DROP DEFAULT;
            """)

def reverse_fix_order_defaults(apps, schema_editor):
    """Reverse the fix (not recommended)"""
    pass

class Migration(migrations.Migration):
    dependencies = [
        ('marketplace', '0003_add_courier_integration'),
    ]

    operations = [
        migrations.RunPython(fix_order_defaults, reverse_fix_order_defaults),
    ]