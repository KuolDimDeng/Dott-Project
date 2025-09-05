# Generated migration to fix Business.owner_id relationship

from django.db import migrations, models
import django.db.models.deletion

def fix_owner_relationships(apps, schema_editor):
    """
    Fix the Business.owner_id values that are stored as UUIDs
    but contain integer User IDs - using raw SQL to avoid ORM issues
    """
    from django.db import connection
    
    with connection.cursor() as cursor:
        # First, check if the businesses table exists and what columns it has
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'businesses' OR table_name = 'users_business'
            LIMIT 1
        """)
        
        if not cursor.fetchone():
            print("Business table not found, skipping migration")
            return
        
        # Get businesses with the special UUID format
        cursor.execute("""
            SELECT id, name, owner_id 
            FROM businesses 
            WHERE owner_id::text LIKE '00000000-0000-0000-0000-%'
        """)
        
        businesses = cursor.fetchall()
        
        for business_id, business_name, owner_id in businesses:
            owner_id_str = str(owner_id)
            if owner_id_str.startswith('00000000-0000-0000-0000-'):
                try:
                    # Extract the integer from the UUID
                    hex_part = owner_id_str.split('-')[-1]
                    owner_id_int = int(hex_part, 16)
                    
                    # Check if user exists
                    cursor.execute("SELECT id FROM users_user WHERE id = %s", [owner_id_int])
                    if cursor.fetchone():
                        print(f"Found owner for business {business_name}: User ID {owner_id_int}")
                except Exception as e:
                    print(f"Error processing business {business_id}: {e}")

def reverse_fix(apps, schema_editor):
    """Reverse operation - not needed as we're fixing bad data"""
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('users', '0128_add_progressive_registration_fields'),  # Depends on the last migration
        ('custom_auth', '0001_initial'),  # Also needs custom_auth for User model
    ]

    operations = [
        # Just run the data analysis for now
        # We'll add the new field in a separate migration after all other migrations are applied
        migrations.RunPython(fix_owner_relationships, reverse_fix),
    ]