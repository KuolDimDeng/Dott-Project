"""
Migration to remove any constraints related to the schema_name field
as part of the transition to Row Level Security.
"""

from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('custom_auth', '0002_tenant_rls_enabled_tenant_rls_setup_date_and_more'),
    ]

    operations = [
        # Remove any FK constraints that might reference the schema_name field
        migrations.RunSQL(
            sql="ALTER TABLE custom_auth_tenant DROP CONSTRAINT IF EXISTS custom_auth_tenant_schema_name_key;",
            reverse_sql="-- Cannot easily restore constraint",
        ),
    ] 