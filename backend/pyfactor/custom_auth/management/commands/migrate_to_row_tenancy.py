"""
Management command to migrate from schema-based to row-level multi-tenancy.
This command will copy data from tenant schemas to the main schema with tenant_id.
"""

import logging
from django.core.management.base import BaseCommand
from django.db import connection, transaction as db_transaction
from django.conf import settings
from custom_auth.models import Tenant
from custom_auth.tenant_context import set_current_tenant, clear_current_tenant

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = "Migrate data from schema-based to row-level multi-tenancy"
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--tenant-id',
            type=str,
            help='Migrate a specific tenant by ID',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Migrate all tenants',
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='Number of records to process in a batch',
        )
        parser.add_argument(
            '--model',
            type=str,
            default=None,
            help='Migrate a specific model (e.g., finance.Account)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be migrated without making changes',
        )
    
    def handle(self, *args, **options):
        tenant_id = options.get('tenant_id')
        all_tenants = options.get('all')
        batch_size = options.get('batch_size')
        model_name = options.get('model')
        dry_run = options.get('dry_run')
        
        if not tenant_id and not all_tenants:
            self.stderr.write("You must specify either --tenant-id or --all")
            return
        
        if tenant_id:
            # Migrate a specific tenant
            try:
                tenant = Tenant.objects.get(id=tenant_id)
                self.migrate_tenant(tenant, batch_size, model_name, dry_run)
            except Tenant.DoesNotExist:
                self.stderr.write(f"Tenant with ID {tenant_id} not found")
        else:
            # Migrate all tenants
            tenants = Tenant.objects.filter(is_active=True)
            total = tenants.count()
            
            self.stdout.write(f"Will migrate {total} tenants")
            
            for i, tenant in enumerate(tenants):
                self.stdout.write(f"Migrating tenant {i+1}/{total}: {tenant.name} ({tenant.id})")
                self.migrate_tenant(tenant, batch_size, model_name, dry_run)
    
    def migrate_tenant(self, tenant, batch_size, model_name, dry_run):
        """Migrate data for a single tenant."""
        # Get the schema name from the tenant
        schema_name = f"tenant_{str(tenant.id).replace('-', '_')}"
        
        self.stdout.write(f"Migrating data from schema {schema_name} to row-level tenancy for tenant {tenant.id}")
        
        # Set the current tenant context
        set_current_tenant(tenant.id)
        
        try:
            # Get the table names in the tenant schema
            with connection.cursor() as cursor:
                cursor.execute(f"""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = %s 
                    AND table_type = 'BASE TABLE'
                    AND table_name NOT LIKE 'django_%'
                    AND table_name NOT LIKE 'auth_%'
                    AND table_name NOT LIKE 'custom_auth_%'
                """, [schema_name])
                
                tables = [row[0] for row in cursor.fetchall()]
                
            if model_name:
                # Convert model name to table name
                app_label, model = model_name.split('.')
                table_name = f"{app_label}_{model.lower()}"
                if table_name in tables:
                    tables = [table_name]
                else:
                    self.stderr.write(f"Table {table_name} not found in schema {schema_name}")
                    return
            
            self.stdout.write(f"Found {len(tables)} tables to migrate")
            
            for table in tables:
                self.migrate_table(tenant.id, schema_name, table, batch_size, dry_run)
        
        finally:
            # Clear the tenant context
            clear_current_tenant()
    
    @db_transaction.atomic
    def migrate_table(tenant_id: uuid.UUID:
        """Migrate data from a specific table."""
        self.stdout.write(f"Migrating table {table_name}")
        
        # Check if the table exists in the public schema
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT 1 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = %s
                )
            """, [table_name])
            table_exists = cursor.fetchone()[0]
        
        if not table_exists:
            self.stdout.write(f"Table {table_name} does not exist in public schema, skipping")
            return
        
        # Check if the table has a tenant_id column
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = %s
                    AND column_name = 'tenant_id'
                )
            """, [table_name])
            has_tenant_column = cursor.fetchone()[0]
        
        if not has_tenant_column:
            self.stdout.write(f"Table {table_name} does not have a tenant_id column, skipping")
            return
        
        # Get the columns from the table
        with connection.cursor() as cursor:
            cursor.execute(f"""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_schema = %s 
                AND table_name = %s
                AND column_name != 'tenant_id'
            """, ['public', table_name])
            
            columns = [row[0] for row in cursor.fetchall()]
        
        # Count records in the tenant schema
        with connection.cursor() as cursor:
            cursor.execute(f"""
                SELECT COUNT(*) 
                FROM /* RLS: Use tenant_id filtering */ "{table_name}"
            """)
            count = cursor.fetchone()[0]
        
        self.stdout.write(f"Found {count} records in {schema_name}.{table_name}")
        
        if dry_run:
            self.stdout.write(f"Dry run, not migrating data for {table_name}")
            return
        
        # Process in batches
        offset = 0
        while offset < count:
            with connection.cursor() as cursor:
                # Get a batch of records from the tenant schema
                cursor.execute(f"""
                    SELECT {', '.join(columns)} 
                    FROM /* RLS: Use tenant_id filtering */ "{table_name}"
                    LIMIT %s OFFSET %s
                """, [batch_size, offset])
                
                rows = cursor.fetchall()
                
                if not rows:
                    break
                
                # Insert into the public schema with tenant_id
                placeholders = ', '.join(['%s'] * (len(columns) + 1))  # +1 for tenant_id
                column_list = ', '.join(columns + ['tenant_id'])
                
                values = []
                for row in rows:
                    values.append(row + (tenant_id,))
                
                # Use ON CONFLICT DO NOTHING to handle duplicate keys
                cursor.executemany(f"""
                    INSERT INTO public.{table_name} ({column_list})
                    VALUES ({placeholders})
                    ON CONFLICT DO NOTHING
                """, values)
                
                self.stdout.write(f"Migrated {len(rows)} records from {offset} to {offset + len(rows)}")
                
                offset += batch_size
        
        self.stdout.write(f"Completed migration of {table_name}") 