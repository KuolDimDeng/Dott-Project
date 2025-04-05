from django.db import migrations, models
import django.utils.timezone
import uuid

class Migration(migrations.Migration):

    dependencies = [
        ('custom_auth', '0003_remove_schema_name'),  # Update this to match your last migration
    ]

    operations = [
        # Rename created_on to created_at and add updated_at
        migrations.RenameField(
            model_name='tenant',
            old_name='created_on',
            new_name='created_at',
        ),
        migrations.AddField(
            model_name='tenant',
            name='updated_at',
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
        migrations.AddField(
            model_name='tenant',
            name='schema_name',
            field=models.CharField(default='', max_length=255, unique=True),
            preserve_default=False,
        ),
        # Remove fields that don't exist in the Next.js version
        migrations.RemoveField(
            model_name='tenant',
            name='setup_status',
        ),
        migrations.RemoveField(
            model_name='tenant',
            name='last_setup_attempt',
        ),
        migrations.RemoveField(
            model_name='tenant',
            name='setup_error_message',
        ),
        migrations.RemoveField(
            model_name='tenant',
            name='storage_quota_bytes',
        ),
        migrations.RemoveField(
            model_name='tenant',
            name='last_archive_date',
        ),
        migrations.RemoveField(
            model_name='tenant',
            name='archive_retention_days',
        ),
        migrations.RemoveField(
            model_name='tenant',
            name='archive_expiry_notification_sent',
        ),
        migrations.RemoveField(
            model_name='tenant',
            name='archive_expiry_notification_date',
        ),
        migrations.RemoveField(
            model_name='tenant',
            name='archive_user_decision',
        ),
        # Add a data migration to set schema_name for existing records
        migrations.RunSQL(
            sql="""
            UPDATE custom_auth_tenant 
            SET schema_name = CONCAT('tenant_', REPLACE(id::text, '-', '_'))
            WHERE schema_name = '' OR schema_name IS NULL;
            """,
            reverse_sql="""
            -- No reverse operation needed
            """
        ),
        # Add indexes
        migrations.AddIndex(
            model_name='tenant',
            index=models.Index(fields=['owner_id'], name='idx_tenant_owner_id'),
        ),
        migrations.AddIndex(
            model_name='tenant',
            index=models.Index(fields=['schema_name'], name='idx_tenant_schema_name'),
        ),
    ]