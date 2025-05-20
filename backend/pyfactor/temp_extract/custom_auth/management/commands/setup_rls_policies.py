"""
Management command to set up Row Level Security policies on tenant-aware tables.
"""

import logging
from django.core.management.base import BaseCommand
from django.db import connection
from django.apps import apps
from django.conf import settings

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Sets up PostgreSQL Row Level Security policies on tenant-aware tables'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            dest='force',
            help='Force recreation of policies even if they already exist',
        )
        parser.add_argument(
            '--table',
            type=str,
            dest='table',
            help='Only apply policies to a specific table',
        )
        parser.add_argument(
            '--app',
            type=str,
            dest='app',
            help='Only apply policies to tables in a specific app',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            dest='dry_run',
            help='Show SQL that would be executed without making changes',
        )

    def handle(self, *args, **options):
        force = options.get('force', False)
        specific_table = options.get('table')
        specific_app = options.get('app')
        dry_run = options.get('dry_run', False)
        
        # Set up database first
        self.stdout.write("Setting up RLS in database...")
        
        # Create app.current_tenant parameter if it doesn't exist
        with connection.cursor() as cursor:
            if dry_run:
                self.stdout.write(self.style.SQL_KEYWORD(
                    "-- SQL to create app parameters (would be executed if not dry run)"
                ))
                self.stdout.write('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
                self.stdout.write('CREATE OR REPLACE FUNCTION set_config_with_empty(param text, value text) RETURNS text AS $$')
                self.stdout.write('BEGIN')
                self.stdout.write('    RETURN set_config(param, COALESCE(value, \'\'), false);')
                self.stdout.write('END;')
                self.stdout.write('$$ LANGUAGE plpgsql;')
                self.stdout.write('ALTER DATABASE current_database() SET "app.current_tenant" = \'\';')
            else:
                # Create UUID extension if it doesn't exist
                cursor.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
                
                # Create function to handle NULL values when setting config
                cursor.execute('''
                CREATE OR REPLACE FUNCTION set_config_with_empty(param text, value text) RETURNS text AS $$
                BEGIN
                    RETURN set_config(param, COALESCE(value, ''), false);
                END;
                $$ LANGUAGE plpgsql;
                ''')
                
                # Set up database parameter for tenant context
                cursor.execute('ALTER DATABASE current_database() SET "app.current_tenant" = \'\';')
                
                self.stdout.write(self.style.SUCCESS("✓ Database parameters configured"))
        
        # Get all tenant-aware models
        tenant_aware_models = self.get_tenant_aware_models(specific_app)
        
        # If a specific table was requested, filter to just that one
        if specific_table:
            tenant_aware_models = [m for m in tenant_aware_models 
                if m._meta.db_table.lower() == specific_table.lower()]
            
            if not tenant_aware_models:
                self.stdout.write(self.style.ERROR(f"Table {specific_table} not found or is not tenant-aware"))
                return
        
        # Apply RLS policies to all tenant-aware tables
        policies_created = 0
        failed_policies = 0
        
        self.stdout.write(f"Found {len(tenant_aware_models)} tenant-aware models")
        
        for model in tenant_aware_models:
            table_name = model._meta.db_table
            self.stdout.write(f"Applying RLS to {table_name}...")
            
            # Check if tenant_id field exists
            has_tenant_id = any(f.name == 'tenant_id' for f in model._meta.fields)
            if not has_tenant_id:
                self.stdout.write(self.style.WARNING(
                    f"  Model {model.__name__} is marked as tenant-aware but has no tenant_id field, skipping"
                ))
                continue
                
            try:
                if self.setup_rls_for_table(table_name, force=force, dry_run=dry_run):
                    policies_created += 1
                    self.stdout.write(self.style.SUCCESS(f"  ✓ RLS policy set up for {table_name}"))
                else:
                    self.stdout.write(f"  - RLS policy already exists for {table_name} (use --force to recreate)")
            except Exception as e:
                failed_policies += 1
                self.stdout.write(self.style.ERROR(f"  ✗ Failed to set up RLS for {table_name}: {str(e)}"))
                
        # Summary
        if dry_run:
            self.stdout.write(self.style.SUCCESS("\nDry run completed. No changes were made."))
        else:
            self.stdout.write(self.style.SUCCESS(
                f"\nRLS setup complete: {policies_created} policies created, {failed_policies} failures"
            ))
            
    def get_tenant_aware_models(self, specific_app=None):
        """Get all tenant-aware models from installed apps."""
        tenant_aware_models = []
        
        # Filter to specific app if requested
        app_configs = [apps.get_app_config(specific_app)] if specific_app else apps.get_app_configs()
        
        # Check for tenant-aware models in all apps
        for app_config in app_configs:
            for model in app_config.get_models():
                # Check if model has tenant_id field
                has_tenant_id = any(f.name == 'tenant_id' for f in model._meta.fields)
                
                # Or if it inherits from TenantAwareModel
                is_tenant_aware = False
                for base in model.__mro__:
                    if base.__name__ == 'TenantAwareModel':
                        is_tenant_aware = True
                        break
                        
                if has_tenant_id or is_tenant_aware:
                    tenant_aware_models.append(model)
                    
        return tenant_aware_models
        
    def setup_rls_for_table(self, table_name, schema='public', force=False, dry_run=False):
        """Set up RLS for a specific table."""
        with connection.cursor() as cursor:
            # Check if table exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_schema = %s AND table_name = %s
                )
            """, [schema, table_name])
            
            if not cursor.fetchone()[0]:
                self.stdout.write(self.style.WARNING(f"Table {schema}.{table_name} does not exist"))
                return False
                
            # Check if tenant_id column exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = %s AND table_name = %s AND column_name = 'tenant_id'
                )
            """, [schema, table_name])
            
            if not cursor.fetchone()[0]:
                self.stdout.write(self.style.WARNING(
                    f"Table {schema}.{table_name} does not have a tenant_id column"
                ))
                return False
                
            # Check if policy already exists and force is not enabled
            if not force:
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT 1 FROM pg_policies
                        WHERE schemaname = %s AND tablename = %s AND policyname = 'tenant_isolation_policy'
                    )
                """, [schema, table_name])
                
                if cursor.fetchone()[0]:
                    return False
            
            # Create policy SQL - updated to handle empty strings
            sql_commands = [
                f"ALTER TABLE {schema}.{table_name} ENABLE ROW LEVEL SECURITY;",
                f"DROP POLICY IF EXISTS tenant_isolation_policy ON {schema}.{table_name};",
                f"""
                CREATE POLICY tenant_isolation_policy ON {schema}.{table_name}
                AS RESTRICTIVE
                USING (
                    (tenant_id::TEXT = current_setting('app.current_tenant', TRUE))
                    OR current_setting('app.current_tenant', TRUE) = ''
                );
                """
            ]
            
            if dry_run:
                for sql in sql_commands:
                    self.stdout.write(self.style.SQL_KEYWORD(sql))
                return True
            else:
                for sql in sql_commands:
                    cursor.execute(sql)
                return True 