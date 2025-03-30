"""
Management command to set up Row Level Security (RLS) policies for tenant-aware tables.
"""

import logging
from django.core.management.base import BaseCommand
from django.apps import apps
from django.db import connection
from custom_auth.models import TenantAwareModel
from custom_auth.rls import setup_tenant_context_in_db, create_rls_policy_for_table

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Sets up Row Level Security (RLS) policies for all tenant-aware tables'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force recreation of all RLS policies, even if they already exist',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Print the SQL that would be executed without actually executing it',
        )
        parser.add_argument(
            '--create-trigger',
            action='store_true',
            help='Create a PostgreSQL trigger to apply RLS policies when new tables are created',
        )

    def setup_rls_trigger(self, dry_run=False):
        """
        Create a PostgreSQL event trigger that will apply RLS policies 
        to newly created tables if they contain a tenant_id column.
        """
        self.stdout.write("Setting up RLS event trigger for future table creation...")
        
        if dry_run:
            self.stdout.write("Would create the following PostgreSQL function and trigger (dry run):")
            self.stdout.write("""
CREATE OR REPLACE FUNCTION apply_rls_to_new_tables()
RETURNS event_trigger AS $$
DECLARE
    obj record;
    table_name text;
    has_tenant_id boolean;
BEGIN
    FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands() WHERE command_tag='CREATE TABLE' LOOP
        table_name := obj.object_identity;
        
        -- Check if the new table has a tenant_id column
        EXECUTE format('SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = %L AND table_name = %L AND column_name = %L
        )', 'public', table_name, 'tenant_id')
        INTO has_tenant_id;
        
        IF has_tenant_id THEN
            -- Apply RLS to the table
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
            
            -- Create the tenant isolation policy
            EXECUTE format('
                CREATE POLICY tenant_isolation_policy ON %I
                USING (
                    tenant_id = current_setting(''app.current_tenant_id'')::uuid
                    OR current_setting(''app.current_tenant_id'', TRUE) IS NULL
                )', 
                table_name
            );
            
            RAISE NOTICE 'Automatically applied RLS to new table %', table_name;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create the event trigger
DROP EVENT TRIGGER IF EXISTS table_creation_trigger;
CREATE EVENT TRIGGER table_creation_trigger ON ddl_command_end
WHEN TAG IN ('CREATE TABLE')
EXECUTE PROCEDURE apply_rls_to_new_tables();
            """)
            return True
        
        try:
            with connection.cursor() as cursor:
                # Create the function
                cursor.execute("""
CREATE OR REPLACE FUNCTION apply_rls_to_new_tables()
RETURNS event_trigger AS $$
DECLARE
    obj record;
    table_name text;
    has_tenant_id boolean;
BEGIN
    FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands() WHERE command_tag='CREATE TABLE' LOOP
        table_name := obj.object_identity;
        
        -- Check if the new table has a tenant_id column
        EXECUTE format('SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = %L AND table_name = %L AND column_name = %L
        )', 'public', table_name, 'tenant_id')
        INTO has_tenant_id;
        
        IF has_tenant_id THEN
            -- Apply RLS to the table
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
            
            -- Create the tenant isolation policy
            EXECUTE format('
                CREATE POLICY tenant_isolation_policy ON %I
                USING (
                    tenant_id = current_setting(''app.current_tenant_id'')::uuid
                    OR current_setting(''app.current_tenant_id'', TRUE) IS NULL
                )', 
                table_name
            );
            
            RAISE NOTICE 'Automatically applied RLS to new table %', table_name;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
                """)
                
                # Create the event trigger
                cursor.execute("""
DROP EVENT TRIGGER IF EXISTS table_creation_trigger;
CREATE EVENT TRIGGER table_creation_trigger ON ddl_command_end
WHEN TAG IN ('CREATE TABLE')
EXECUTE PROCEDURE apply_rls_to_new_tables();
                """)
                
            self.stdout.write(self.style.SUCCESS("✓ Successfully created RLS event trigger"))
            return True
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"✗ Failed to create RLS event trigger: {str(e)}"))
            return False

    def handle(self, *args, **options):
        force = options.get('force', False)
        dry_run = options.get('dry_run', False)
        create_trigger = options.get('create_trigger', False)
        
        if dry_run:
            self.stdout.write(self.style.WARNING("Running in dry-run mode. No changes will be made."))
        
        # 1. First, create the database custom settings
        self.stdout.write("Setting up database tenant context settings...")
        if not dry_run:
            success = setup_tenant_context_in_db()
            if not success:
                self.stdout.write(self.style.ERROR("Failed to set up database tenant context settings"))
                return
            else:
                self.stdout.write(self.style.SUCCESS("Successfully set up database tenant context settings"))
        
        # 2. Create event trigger for future tables if requested
        if create_trigger:
            self.setup_rls_trigger(dry_run)
        
        # 3. Find all tenant-aware models
        tenant_aware_models = []
        for app_config in apps.get_app_configs():
            for model in app_config.get_models():
                if issubclass(model, TenantAwareModel) and model != TenantAwareModel:
                    tenant_aware_models.append(model)
                    self.stdout.write(f"  • Found tenant-aware model: {model._meta.app_label}.{model.__name__}")
        
        self.stdout.write(f"Found {len(tenant_aware_models)} tenant-aware models")
        
        # 4. Check if tables already have RLS policies
        tables_with_rls = []
        tables_without_rls = []
        
        if not dry_run:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT tablename 
                    FROM pg_tables 
                    WHERE schemaname = 'public' 
                """)
                
                existing_tables = [row[0] for row in cursor.fetchall()]
                self.stdout.write(f"Found {len(existing_tables)} existing tables in the database")
                
                for model in tenant_aware_models:
                    table_name = model._meta.db_table
                    
                    # Skip tables that don't exist yet
                    if table_name not in existing_tables:
                        self.stdout.write(self.style.WARNING(f"Table {table_name} does not exist yet"))
                        continue
                    
                    # Check if table has RLS enabled
                    cursor.execute("""
                        SELECT relrowsecurity 
                        FROM pg_class 
                        WHERE relname = %s AND relkind = 'r'
                    """, [table_name])
                    
                    result = cursor.fetchone()
                    if result and result[0]:
                        tables_with_rls.append(table_name)
                        self.stdout.write(f"  • Table {table_name} already has RLS enabled")
                    else:
                        tables_without_rls.append(table_name)
                        self.stdout.write(f"  • Table {table_name} needs RLS")
        else:
            # In dry-run mode, assume all tables need RLS
            tables_without_rls = [model._meta.db_table for model in tenant_aware_models]
        
        # 5. Apply RLS policies to tables that need them
        if force:
            tables_to_update = [model._meta.db_table for model in tenant_aware_models 
                                if model._meta.db_table in existing_tables]
            self.stdout.write(self.style.WARNING(f"Force flag enabled. Updating RLS for existing tenant-aware tables."))
        else:
            tables_to_update = tables_without_rls
            if tables_with_rls:
                self.stdout.write(self.style.SUCCESS(f"Skipping {len(tables_with_rls)} tables that already have RLS."))
        
        # 6. Apply RLS policies
        updated_tables = []
        if tables_to_update:
            self.stdout.write(f"Setting up RLS policies for {len(tables_to_update)} tables...")
            
            for table_name in tables_to_update:
                self.stdout.write(f"  • Adding RLS policy to {table_name}")
                
                if not dry_run:
                    success = create_rls_policy_for_table(table_name)
                    if not success:
                        self.stdout.write(self.style.ERROR(f"    ✗ Failed to create RLS policy for {table_name}"))
                    else:
                        updated_tables.append(table_name)
                        self.stdout.write(self.style.SUCCESS(f"    ✓ Successfully created RLS policy for {table_name}"))
        else:
            if existing_tables:
                self.stdout.write(self.style.SUCCESS("All existing tenant-aware tables already have RLS policies"))
            else:
                self.stdout.write(self.style.WARNING("No tenant-aware tables exist in the database yet"))
        
        # 7. Update tenant records to reflect RLS setup
        if not dry_run and (updated_tables or force):
            try:
                from django.apps import apps
                Tenant = apps.get_model('custom_auth', 'Tenant')
                
                # Get all active tenants
                tenants = Tenant.objects.filter(is_active=True)
                self.stdout.write(f"Updating {tenants.count()} tenant records with RLS information...")
                
                # Get current time for RLS setup date
                from django.utils import timezone
                now = timezone.now()
                
                # Update all tenants
                update_count = 0
                for tenant in tenants:
                    should_update = False
                    if not tenant.rls_enabled:
                        tenant.rls_enabled = True
                        should_update = True
                    
                    if not tenant.rls_setup_date and updated_tables:
                        tenant.rls_setup_date = now
                        should_update = True
                    
                    if tenant.setup_status not in ('active', 'complete'):
                        tenant.setup_status = 'active'
                        should_update = True
                    
                    if should_update:
                        tenant.save(update_fields=['rls_enabled', 'rls_setup_date', 'setup_status'])
                        update_count += 1
                
                self.stdout.write(self.style.SUCCESS(f"Updated {update_count} tenant records"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed to update tenant records: {str(e)}"))
        
        # Summary of what happened
        tables_protected = len(tables_with_rls) + len(updated_tables)
        self.stdout.write(self.style.SUCCESS(f"RLS setup complete! {tables_protected} tables are now protected by Row Level Security"))
        
        if updated_tables:
            self.stdout.write(self.style.SUCCESS(f"Newly protected tables: {', '.join(updated_tables)}")) 