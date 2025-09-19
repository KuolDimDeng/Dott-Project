#!/usr/bin/env python
"""
Force Django to reload database schema for marketplace orders
Run this in Render shell after database changes
"""

import os
import sys
import django

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection, connections
from django.core.cache import cache

def force_reload_schema():
    print("=" * 50)
    print("FORCING SCHEMA RELOAD")
    print("=" * 50)

    # 1. Close all database connections to force reconnect
    print("\n1. Closing all database connections...")
    for conn_name in connections:
        connections[conn_name].close()
    print("   ✅ All connections closed")

    # 2. Clear Django's model cache
    print("\n2. Clearing Django model cache...")
    try:
        from django.apps import apps
        apps.clear_cache()
        print("   ✅ Model cache cleared")
    except:
        print("   ℹ️ Could not clear model cache")

    # 3. Clear any Redis cache
    print("\n3. Clearing Redis cache...")
    try:
        cache.clear()
        print("   ✅ Redis cache cleared")
    except:
        print("   ℹ️ Could not clear Redis cache")

    # 4. Force a query to load the new schema
    print("\n4. Testing database columns...")
    with connection.cursor() as cursor:
        try:
            # Query the columns to force schema reload
            cursor.execute("""
                SELECT
                    service_fee,
                    pickup_pin,
                    consumer_delivery_pin
                FROM marketplace_consumer_orders
                LIMIT 1
            """)
            print("   ✅ Successfully queried new columns!")

            # Show column info
            cursor.execute("""
                SELECT column_name, data_type, column_default
                FROM information_schema.columns
                WHERE table_name = 'marketplace_consumer_orders'
                AND column_name IN ('service_fee', 'pickup_pin', 'consumer_delivery_pin')
                ORDER BY column_name
            """)

            print("\n   Column verification:")
            for row in cursor.fetchall():
                print(f"   ✅ {row[0]}: {row[1]} (default: {row[2]})")

        except Exception as e:
            print(f"   ❌ Error querying columns: {e}")

    # 5. Test with Django ORM
    print("\n5. Testing with Django ORM...")
    try:
        from marketplace.order_models import ConsumerOrder

        # Force model to reload its fields
        ConsumerOrder._meta.concrete_fields = None
        ConsumerOrder._meta._expire_cache()

        # Get field names
        field_names = [f.name for f in ConsumerOrder._meta.fields]

        required = ['service_fee', 'pickup_pin', 'consumer_delivery_pin']
        found = [f for f in required if f in field_names]

        if len(found) == 3:
            print(f"   ✅ All required fields found in model")
        else:
            missing = [f for f in required if f not in field_names]
            print(f"   ⚠️ Missing fields in model: {missing}")

        # Try a test query
        count = ConsumerOrder.objects.count()
        print(f"   ✅ Model query successful. Order count: {count}")

    except Exception as e:
        print(f"   ❌ ORM test failed: {e}")

    print("\n" + "=" * 50)
    print("SCHEMA RELOAD COMPLETE")
    print("The backend should now recognize all database columns")
    print("=" * 50)

if __name__ == "__main__":
    force_reload_schema()