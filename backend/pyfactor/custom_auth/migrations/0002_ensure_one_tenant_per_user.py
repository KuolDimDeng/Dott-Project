# custom_auth/migrations/0002_ensure_one_tenant_per_user.py
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('custom_auth', '0001_initial'),
    ]

    operations = [
        # First clean up any duplicate tenants (keep the oldest based on creation time)
        migrations.RunSQL(
            """
            -- Identify duplicate tenants and keep the oldest one by creation time
            WITH duplicates AS (
                SELECT owner_id, 
                      MIN(created_on) as oldest_time
                FROM custom_auth_tenant
                WHERE owner_id IS NOT NULL
                GROUP BY owner_id
                HAVING COUNT(*) > 1
            ),
            keep_tenants AS (
                SELECT t.id as keep_id
                FROM custom_auth_tenant t
                JOIN duplicates d ON t.owner_id = d.owner_id AND t.created_on = d.oldest_time
            )
            -- Delete all but the oldest tenant for each owner
            DELETE FROM custom_auth_tenant
            WHERE owner_id IN (SELECT owner_id FROM duplicates)
            AND id NOT IN (SELECT keep_id FROM keep_tenants);
            
            -- Fix any orphaned users by updating their tenant reference
            UPDATE custom_auth_user
            SET tenant_id = t.id
            FROM custom_auth_tenant t
            WHERE custom_auth_user.id = t.owner_id
            AND (custom_auth_user.tenant_id IS NULL OR custom_auth_user.tenant_id != t.id);
            """,
            # Reverse SQL
            """
            -- No reverse operation
            """
        ),
        
        # Update Tenant model to enforce one-to-one relationship
        migrations.AlterField(
            model_name='tenant',
            name='owner',
            field=models.OneToOneField(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='owned_tenant',
                to=settings.AUTH_USER_MODEL,
                null=False,
                blank=False,
            ),
        ),
        
        # Add index on owner_id for better performance
        migrations.RunSQL(
            """
            CREATE INDEX IF NOT EXISTS idx_tenant_owner_id ON custom_auth_tenant (owner_id);
            """,
            """
            DROP INDEX IF EXISTS idx_tenant_owner_id;
            """
        ),
    ]