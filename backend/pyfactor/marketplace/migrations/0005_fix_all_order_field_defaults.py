from django.db import migrations

def fix_all_order_defaults(apps, schema_editor):
    """Fix all default values for order fields to prevent JSON parsing errors"""
    if schema_editor.connection.vendor == 'postgresql':
        with schema_editor.connection.cursor() as cursor:
            # First, update any existing empty string values to NULL for nullable fields
            cursor.execute("""
                UPDATE marketplace_consumer_orders
                SET
                    order_number = CASE WHEN order_number = '' THEN NULL ELSE order_number END,
                    pickup_pin = CASE WHEN pickup_pin = '' THEN NULL ELSE pickup_pin END,
                    consumer_delivery_pin = CASE WHEN consumer_delivery_pin = '' THEN NULL ELSE consumer_delivery_pin END,
                    delivery_pin = CASE WHEN delivery_pin = '' THEN NULL ELSE delivery_pin END,
                    payment_intent_id = CASE WHEN payment_intent_id = '' THEN NULL ELSE payment_intent_id END,
                    payment_transaction_id = CASE WHEN payment_transaction_id = '' THEN NULL ELSE payment_transaction_id END
                WHERE
                    order_number = '' OR
                    pickup_pin = '' OR
                    consumer_delivery_pin = '' OR
                    delivery_pin = '' OR
                    payment_intent_id = '' OR
                    payment_transaction_id = '';
            """)

            # Remove all empty string defaults from the table definition
            cursor.execute("""
                -- Remove defaults from CharField fields that should be NULL
                ALTER TABLE marketplace_consumer_orders
                ALTER COLUMN order_number DROP DEFAULT;

                ALTER TABLE marketplace_consumer_orders
                ALTER COLUMN pickup_pin DROP DEFAULT;

                ALTER TABLE marketplace_consumer_orders
                ALTER COLUMN consumer_delivery_pin DROP DEFAULT;

                ALTER TABLE marketplace_consumer_orders
                ALTER COLUMN delivery_pin DROP DEFAULT;

                ALTER TABLE marketplace_consumer_orders
                ALTER COLUMN payment_intent_id DROP DEFAULT;

                ALTER TABLE marketplace_consumer_orders
                ALTER COLUMN payment_transaction_id DROP DEFAULT;

                -- TextField fields should remain as empty string when blank
                ALTER TABLE marketplace_consumer_orders
                ALTER COLUMN delivery_address SET DEFAULT '';

                ALTER TABLE marketplace_consumer_orders
                ALTER COLUMN delivery_notes SET DEFAULT '';

                ALTER TABLE marketplace_consumer_orders
                ALTER COLUMN cancellation_reason SET DEFAULT '';

                -- Ensure PIN fields explicitly default to NULL
                ALTER TABLE marketplace_consumer_orders
                ALTER COLUMN pickup_pin SET DEFAULT NULL;

                ALTER TABLE marketplace_consumer_orders
                ALTER COLUMN consumer_delivery_pin SET DEFAULT NULL;

                ALTER TABLE marketplace_consumer_orders
                ALTER COLUMN delivery_pin SET DEFAULT NULL;
            """)

def reverse_fix_order_defaults(apps, schema_editor):
    """Reverse the fix (not recommended)"""
    pass

class Migration(migrations.Migration):
    dependencies = [
        ('marketplace', '0004_fix_order_defaults'),
    ]

    operations = [
        migrations.RunPython(fix_all_order_defaults, reverse_fix_order_defaults),
    ]