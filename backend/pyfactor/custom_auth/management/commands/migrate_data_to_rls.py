"""
Management command to migrate data from tenant schemas to Row Level Security.
"""

import logging
import uuid
from django.core.management.base import BaseCommand
from django.db import connection
from django.utils import timezone
from custom_auth.models import Tenant
from custom_auth.data_migration import migrate_tenant_data

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Migrates data from tenant schemas to Row Level Security'

    def add_arguments(self, parser):
        parser.add_argument(
            '--tenant-id',
            type=str,
            help='Migrate data for a specific tenant by ID',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            dest='dry_run',
            help='Show what would be migrated without executing',
        )
        parser.add_argument(
            '--include-table',
            action='append',
            dest='include_tables',
            help='Only include specific tables (can be used multiple times)',
        )
        parser.add_argument(
            '--exclude-table',
            action='append',
            dest='exclude_tables',
            help='Exclude specific tables (can be used multiple times)',
        )

    def handle(self, *args, **options):
        tenant_id = options.get('tenant_id')
        dry_run = options.get('dry_run', False)
        include_tables = options.get('include_tables', [])
        exclude_tables = options.get('exclude_tables', [])
        
        tenant_uuid = None
        if tenant_id:
            try:
                tenant_uuid = uuid.UUID(tenant_id)
                tenant = Tenant.objects.get(id=tenant_uuid)
                self.stdout.write(f"Migrating data for tenant: {tenant.name} ({tenant_id})")
            except ValueError:
                self.stdout.write(self.style.ERROR(f"Invalid tenant ID format: {tenant_id}"))
                return
            except Tenant.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"Tenant not found with ID: {tenant_id}"))
                return
        else:
            self.stdout.write("Migrating data for all tenants")
            
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN - No data will be migrated"))
            
        # Verify RLS is set up
        with connection.cursor() as cursor:
            try:
                cursor.execute("SELECT current_setting('app.current_tenant_id', true)")
                self.stdout.write(self.style.SUCCESS("✓ RLS is configured in database"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"✗ RLS is not properly configured: {e}"))
                self.stdout.write("Please run 'python manage.py setup_rls_policies' first")
                return
        
        if not dry_run:
            # Run the migration
            start_time = timezone.now()
            self.stdout.write(f"Starting data migration at {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
            
            results = migrate_tenant_data(tenant_uuid)
            
            # Display results
            self.stdout.write(self.style.SUCCESS(f"\nMigration completed in {results['duration_seconds']:.2f} seconds"))
            self.stdout.write(f"Tenants processed: {results['tenants_processed']}")
            self.stdout.write(f"Tables processed: {results['tables_processed']}")
            self.stdout.write(f"Rows migrated: {results['rows_migrated']}")
            
            if results['errors'] > 0:
                self.stdout.write(self.style.WARNING(f"Errors encountered: {results['errors']}"))
                
            # Show per-tenant results
            self.stdout.write("\nPer-tenant results:")
            for tenant_result in results['tenant_results']:
                tenant_name = tenant_result['tenant_name']
                tenant_id = tenant_result['tenant_id']
                tables = tenant_result['tables_processed']
                rows = tenant_result['rows_migrated']
                errors = tenant_result['errors']
                
                if errors > 0:
                    result_style = self.style.WARNING
                else:
                    result_style = self.style.SUCCESS
                    
                self.stdout.write(result_style(
                    f"  {tenant_name} ({tenant_id}): {tables} tables, {rows} rows, {errors} errors"
                ))
        else:
            # Show what would be migrated
            if tenant_uuid:
                tenants = Tenant.objects.filter(id=tenant_uuid)
            else:
                tenants = Tenant.objects.all()
                
            self.stdout.write(f"\nFound {tenants.count()} tenants to migrate:")
            
            for tenant in tenants:
                schema_name = f"tenant_{str(tenant.id).replace('-', '_')}"
                
                # Check if schema exists
                with connection.cursor() as cursor:
                    cursor.execute("""
                        SELECT EXISTS (
                            SELECT 1 FROM information_schema.schemata
                            WHERE schema_name = %s
                        )
                    """, [schema_name])
                    schema_exists = cursor.fetchone()[0]
                
                if schema_exists:
                    # List tables in schema
                    with connection.cursor() as cursor:
                        cursor.execute("""
                            SELECT table_name
                            FROM information_schema.tables
                            WHERE table_schema = %s
                            ORDER BY table_name
                        """, [schema_name])
                        tables = [row[0] for row in cursor.fetchall()]
                        
                    # Filter tables based on include/exclude lists
                    if include_tables:
                        tables = [t for t in tables if t in include_tables]
                    if exclude_tables:
                        tables = [t for t in tables if t not in exclude_tables]
                        
                    self.stdout.write(f"  {tenant.name} ({tenant.id}):")
                    self.stdout.write(f"    Schema: {schema_name}")
                    self.stdout.write(f"    Tables to migrate: {len(tables)}")
                    for table in tables[:10]:  # Show first 10 tables
                        self.stdout.write(f"      - {table}")
                    if len(tables) > 10:
                        self.stdout.write(f"      - ... and {len(tables) - 10} more tables")
                else:
                    self.stdout.write(self.style.WARNING(f"  {tenant.name} ({tenant.id}): Schema {schema_name} does not exist")) 