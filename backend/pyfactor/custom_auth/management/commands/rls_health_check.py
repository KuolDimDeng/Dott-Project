#!/usr/bin/env python
"""
Management command to check the health of Row Level Security (RLS) in the application.
This command helps to verify that RLS is properly setup and working as expected.
"""

import uuid
import random
from django.core.management.base import BaseCommand
from django.db import connection
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Check the health of Row Level Security in the application'

    def add_arguments(self, parser):
        parser.add_argument(
            '--tenant',
            type=str,
            help='Specific tenant UUID to test RLS with'
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Enable verbose output'
        )
        
    def handle(self, *args, **options):
        """
        Verify RLS setup:
        1. Find tables with a tenant_id column
        2. Check which tables have RLS enabled
        3. Test RLS with either specific tenant or sample of tenants
        """
        verbose = options.get('verbose', False)
        
        # Get tables with tenant_id column
        rls_tables = self.get_rls_tables()
        self.stdout.write(f"Found {len(rls_tables)} tables with tenant_id column")
        
        if verbose:
            self.stdout.write("Tables with tenant_id column:")
            for table in rls_tables:
                self.stdout.write(f"  - {table}")
                
        # Get tables with RLS enabled
        rls_enabled_tables = self.get_rls_enabled_tables()
        self.stdout.write(f"Found {len(rls_enabled_tables)} tables with RLS enabled")
        
        if verbose:
            self.stdout.write("Tables with RLS enabled:")
            for table in rls_enabled_tables:
                self.stdout.write(f"  - {table}")
                
        # Check for tables that should have RLS but don't
        missing_rls = [t for t in rls_tables if t not in rls_enabled_tables]
        if missing_rls:
            self.stdout.write(self.style.WARNING(
                f"WARNING: {len(missing_rls)} tables have tenant_id but no RLS enabled"
            ))
            for table in missing_rls:
                self.stdout.write(self.style.WARNING(f"  - {table}"))
        else:
            self.stdout.write(self.style.SUCCESS("✅ All tables with tenant_id have RLS enabled"))
            
        # Test RLS with a specific tenant or sample
        tenant_id = options.get('tenant')
        if tenant_id:
            # Test with specific tenant
            try:
                tenant_uuid = uuid.UUID(tenant_id)
                self.test_tenant_rls(tenant_uuid, verbose)
            except ValueError:
                self.stdout.write(self.style.ERROR(f"Invalid tenant UUID: {tenant_id}"))
        else:
            # Test with sample tenants
            self.stdout.write("Testing RLS with sample tenants...")
            
            # Get sample of tenant IDs
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT DISTINCT tenant_id 
                    FROM auth_user 
                    WHERE tenant_id IS NOT NULL 
                    LIMIT 3
                """)
                tenants = [row[0] for row in cursor.fetchall()]
                
            if not tenants:
                self.stdout.write(self.style.WARNING("No tenants found to test with"))
                return
                
            for tenant in tenants:
                self.test_tenant_rls(tenant, verbose)
    
    def get_rls_tables(self):
        """Get all tables in the database that have a tenant_id column"""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT table_schema, table_name
                FROM information_schema.columns
                WHERE column_name = 'tenant_id'
                  AND table_schema NOT IN ('pg_catalog', 'information_schema')
                ORDER BY table_schema, table_name
            """)
            return [f"{row[0]}.{row[1]}" for row in cursor.fetchall()]
    
    def get_rls_enabled_tables(self):
        """Get all tables that have RLS enabled"""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT n.nspname, c.relname
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE c.relrowsecurity = true
                  AND c.relkind = 'r'
                  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
                ORDER BY n.nspname, c.relname
            """)
            return [f"{row[0]}.{row[1]}" for row in cursor.fetchall()]
    
    def test_tenant_rls(self, tenant_id, verbose=False):
        """Test RLS with a specific tenant"""
        self.stdout.write(f"\nTesting RLS for tenant: {tenant_id}")
        
        # Set tenant context
        with connection.cursor() as cursor:
            cursor.execute("SET app.current_tenant_id = %s", [str(tenant_id)])
            
            # Test query on a few random tables
            with connection.cursor() as test_cursor:
                test_cursor.execute("""
                    SELECT table_schema, table_name
                    FROM information_schema.columns
                    WHERE column_name = 'tenant_id'
                      AND table_schema NOT IN ('pg_catalog', 'information_schema')
                    ORDER BY random()
                    LIMIT 5
                """)
                test_tables = test_cursor.fetchall()
                
                for schema, table in test_tables:
                    # Count records for this tenant
                    sql_query = f'SELECT COUNT(*) FROM "{schema}"."{table}" WHERE tenant_id = %s'
                    test_cursor.execute(sql_query, [str(tenant_id)])
                    tenant_count = test_cursor.fetchone()[0]
                    
                    # Count total records returned (should be same with RLS)
                    sql_query = f'SELECT COUNT(*) FROM "{schema}"."{table}"' 
                    test_cursor.execute(sql_query)
                    total_count = test_cursor.fetchone()[0]
                    
                    if tenant_count == total_count:
                        if verbose or tenant_count > 0:
                            self.stdout.write(
                                f"  - {schema}.{table}: {tenant_count} records ✅"
                            )
                    else:
                        self.stdout.write(
                            self.style.ERROR(
                                f"  - {schema}.{table}: Expected {tenant_count} records, got {total_count} ❌"
                            )
                        )
                        
            # Reset tenant context
            cursor.execute("SET app.current_tenant_id = 'unset'") 