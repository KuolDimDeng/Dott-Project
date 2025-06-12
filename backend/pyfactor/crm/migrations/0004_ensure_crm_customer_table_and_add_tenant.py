# Generated manually to add tenant awareness to CRM models

import django.db.models
from django.db import migrations, models


def check_and_rename_table(apps, schema_editor):
    """Check if customer table exists and rename it if needed"""
    with schema_editor.connection.cursor() as cursor:
        # Check if table exists as 'customer'
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'customer'
            );
        """)
        customer_exists = cursor.fetchone()[0]
        
        # Check if table exists as 'crm_customer'
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'crm_customer'
            );
        """)
        crm_customer_exists = cursor.fetchone()[0]
        
        if customer_exists and not crm_customer_exists:
            # Rename table from 'customer' to 'crm_customer'
            cursor.execute('ALTER TABLE customer RENAME TO crm_customer;')
        elif not customer_exists and not crm_customer_exists:
            # If neither exists, we have a problem - but the migration will handle it
            pass


def reverse_table_rename(apps, schema_editor):
    """Reverse the table rename"""
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'crm_customer'
            );
        """)
        if cursor.fetchone()[0]:
            cursor.execute('ALTER TABLE crm_customer RENAME TO customer;')


class Migration(migrations.Migration):

    dependencies = [
        ('crm', '0003_rename_accountnumber_customer_account_number_and_more'),
    ]

    operations = [
        # First ensure the table exists and has the correct name
        migrations.RunPython(check_and_rename_table, reverse_table_rename),
        
        # Set the table name in the model
        migrations.AlterModelTable(
            name='customer',
            table='crm_customer',
        ),
        
        # Add tenant_id field only if it doesn't exist
        migrations.RunSQL(
            sql=[
                """
                DO $$ 
                BEGIN 
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_schema = 'public' 
                        AND table_name = 'crm_customer' 
                        AND column_name = 'tenant_id'
                    ) THEN
                        ALTER TABLE crm_customer ADD COLUMN tenant_id uuid;
                        CREATE INDEX crm_customer_tenant_id_idx ON crm_customer(tenant_id);
                    END IF;
                END $$;
                """
            ],
            reverse_sql=[
                "ALTER TABLE crm_customer DROP COLUMN IF EXISTS tenant_id CASCADE;"
            ],
        ),
        
        # Add index for tenant_id and account_number
        migrations.RunSQL(
            sql=[
                """
                CREATE INDEX IF NOT EXISTS crm_customer_tenant_account_idx 
                ON crm_customer(tenant_id, account_number);
                """
            ],
            reverse_sql=[
                "DROP INDEX IF EXISTS crm_customer_tenant_account_idx;"
            ],
        ),
        
        # Remove old constraint if it exists and add new one
        migrations.RunSQL(
            sql=[
                "ALTER TABLE crm_customer DROP CONSTRAINT IF EXISTS customer_account_number_key CASCADE;",
                """
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint 
                        WHERE conname = 'unique_crm_customer_account_number_per_tenant'
                    ) THEN
                        ALTER TABLE crm_customer ADD CONSTRAINT unique_crm_customer_account_number_per_tenant 
                        UNIQUE (tenant_id, account_number);
                    END IF;
                END $$;
                """
            ],
            reverse_sql=[
                "ALTER TABLE crm_customer DROP CONSTRAINT IF EXISTS unique_crm_customer_account_number_per_tenant;",
            ],
        ),
    ]