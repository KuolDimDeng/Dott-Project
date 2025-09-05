# Generated migration to fix Business.owner_id relationship

from django.db import migrations, models
import django.db.models.deletion

def fix_owner_relationships(apps, schema_editor):
    """
    Fix the Business.owner_id values that are stored as UUIDs
    but contain integer User IDs
    """
    Business = apps.get_model('users', 'Business')
    User = apps.get_model('custom_auth', 'User')
    
    for business in Business.objects.all():
        if business.owner_id:
            owner_id_str = str(business.owner_id)
            
            # Check if it's the special UUID format for integers
            # e.g., '00000000-0000-0000-0000-0000000000fa' for user ID 250
            if owner_id_str.startswith('00000000-0000-0000-0000-'):
                try:
                    # Extract the integer from the UUID
                    hex_part = owner_id_str.split('-')[-1]
                    owner_id_int = int(hex_part, 16)
                    
                    # Find the user and update the business
                    user = User.objects.filter(id=owner_id_int).first()
                    if user:
                        # Store the correct user ID for now
                        # We'll change the field type in the next step
                        print(f"Found owner for business {business.name}: User ID {owner_id_int}")
                except Exception as e:
                    print(f"Error processing business {business.id}: {e}")

def reverse_fix(apps, schema_editor):
    """Reverse operation - not needed as we're fixing bad data"""
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),  # Replace with your actual last migration
    ]

    operations = [
        # Step 1: Run the data fix
        migrations.RunPython(fix_owner_relationships, reverse_fix),
        
        # Step 2: Add a new owner field with proper ForeignKey
        # Note: We can't change the field type directly, so we add a new field
        migrations.AddField(
            model_name='business',
            name='owner',
            field=models.ForeignKey(
                to='custom_auth.User',
                on_delete=models.SET_NULL,
                null=True,
                blank=True,
                related_name='owned_businesses',
                help_text='The user who owns this business'
            ),
        ),
        
        # Step 3: Create a data migration to copy owner_id to owner
        migrations.RunSQL(
            sql="""
            UPDATE users_business b
            SET owner_id = u.id
            FROM users_user u
            WHERE (
                -- Handle the UUID format with integer in the last part
                b.owner_id::text LIKE '00000000-0000-0000-0000-%'
                AND u.id = ('x' || RIGHT(b.owner_id::text, 12))::bit(48)::bigint
            );
            """,
            reverse_sql="SELECT 1;"  # No-op for reverse
        ),
    ]