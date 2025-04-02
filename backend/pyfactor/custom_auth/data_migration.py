"""
Data migration utilities for moving from tenant schemas to RLS.

This script helps migrate data from tenant schema tables to the main schema with tenant_id.
"""

import logging
import uuid
from django.db import connection
from typing import List, Dict, Any, Optional
from django.utils import timezone
from .models import Tenant

logger = logging.getLogger(__name__)

def get_tenant_schemas() -> List[Dict[str, Any]]:
    """
    Get all tenant schemas from the database.
    
    Returns:
        List of dictionaries with schema_name and tenant_id
    """
    schemas = []
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT t.id, s.schema_name
            FROM information_schema.schemata s
            JOIN custom_auth_tenant t ON s.schema_name LIKE 'tenant_%'
            WHERE s.schema_name LIKE 'tenant_%'
        """)
        for row in cursor.fetchall():
            schemas.append({
                'tenant_id': row[0],
                'schema_name': row[1]
            })
    return schemas

def list_schema_tables(schema_name: str) -> List[str]:
    """
    List all tables in a schema.
    
    Args:
        schema_name: The schema name to list tables for
        
    Returns:
        List of table names
    """
    tables = []
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = %s
            ORDER BY table_name
        """, [schema_name])
        tables = [row[0] for row in cursor.fetchall()]
    return tables

def copy_table_data(schema_name: str, table_name: str, tenant_id: uuid.UUID) -> int:
    """
    Copy data from a schema table to the corresponding public table with tenant_id.
    
    Args:
        schema_name: Source schema name
        table_name: Table name
        tenant_id: Tenant ID to assign to the copied rows
        
    Returns:
        Number of rows copied
    """
    try:
        with connection.cursor() as cursor:
            # Check if source table exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = %s AND table_name = %s
                )
            """, [schema_name, table_name])
            source_exists = cursor.fetchone()[0]
            if not source_exists:
                logger.warning(f"Source table {schema_name}.{table_name} does not exist")
                return 0
                
            # Check if destination table exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = %s
                )
            """, [table_name])
            dest_exists = cursor.fetchone()[0]
            if not dest_exists:
                logger.warning(f"Destination table public.{table_name} does not exist")
                return 0
                
            # Check if destination table has tenant_id column
            cursor.execute("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = %s AND column_name = 'tenant_id'
                )
            """, [table_name])
            has_tenant_id = cursor.fetchone()[0]
            if not has_tenant_id:
                logger.warning(f"Destination table public.{table_name} does not have tenant_id column")
                return 0
                
            # Get columns from source table
            cursor.execute("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = %s AND table_name = %s
                ORDER BY ordinal_position
            """, [schema_name, table_name])
            columns = [row[0] for row in cursor.fetchall()]
            
            # Get columns from destination table
            cursor.execute("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = %s
                ORDER BY ordinal_position
            """, [table_name])
            dest_columns = [row[0] for row in cursor.fetchall()]
            
            # Filter out columns that don't exist in dest table
            common_columns = [col for col in columns if col in dest_columns and col != 'tenant_id']
            
            if not common_columns:
                logger.warning(f"No common columns between {schema_name}.{table_name} and public.{table_name}")
                return 0
                
            # Build column list
            column_list = ', '.join(common_columns)
            dest_column_list = column_list + ', tenant_id'
            
            # Insert data
            query = f"""
                INSERT INTO public.{table_name} ({dest_column_list})
                SELECT {column_list}, %s
                FROM {schema_name}.{table_name}
            """
            cursor.execute(query, [str(tenant_id)])
            
            # Get number of rows inserted
            cursor.execute("SELECT ROW_COUNT()")
            rows_affected = cursor.fetchone()[0]
            
            logger.info(f"Copied {rows_affected} rows from {schema_name}.{table_name} to public.{table_name}")
            return rows_affected
            
    except Exception as e:
        logger.error(f"Error copying data from {schema_name}.{table_name}: {str(e)}")
        return 0
        
def migrate_tenant_data(tenant_id: Optional[uuid.UUID] = None) -> Dict[str, Any]:
    """
    Migrate data for a specific tenant or all tenants.
    
    Args:
        tenant_id: Optional tenant ID to migrate, or None for all tenants
        
    Returns:
        Dictionary with migration results
    """
    results = {
        'started_at': timezone.now(),
        'tenants_processed': 0,
        'tables_processed': 0,
        'rows_migrated': 0,
        'errors': 0,
        'tenant_results': []
    }
    
    try:
        # Get tenants to migrate
        if tenant_id:
            tenants = Tenant.objects.filter(id=tenant_id)
        else:
            tenants = Tenant.objects.all()
            
        for tenant in tenants:
            tenant_result = {
                'tenant_id': str(tenant.id),
                'tenant_name': tenant.name,
                'tables_processed': 0,
                'rows_migrated': 0,
                'errors': 0
            }
            
            # Get schema name from tenant ID
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
                
            if not schema_exists:
                logger.warning(f"Schema {schema_name} does not exist for tenant {tenant.id}")
                tenant_result['error'] = f"Schema {schema_name} does not exist"
                results['tenant_results'].append(tenant_result)
                results['errors'] += 1
                continue
                
            # List tables in schema
            tables = list_schema_tables(schema_name)
            
            # Migrate each table
            for table_name in tables:
                try:
                    rows_copied = copy_table_data(schema_name, table_name, tenant.id)
                    tenant_result['tables_processed'] += 1
                    tenant_result['rows_migrated'] += rows_copied
                    results['tables_processed'] += 1
                    results['rows_migrated'] += rows_copied
                except Exception as e:
                    logger.error(f"Error migrating table {schema_name}.{table_name}: {str(e)}")
                    tenant_result['errors'] += 1
                    results['errors'] += 1
            
            results['tenants_processed'] += 1
            results['tenant_results'].append(tenant_result)
            
            # Update tenant record
            tenant.rls_enabled = True
            tenant.rls_setup_date = timezone.now()
            tenant.save()
            
        results['completed_at'] = timezone.now()
        results['duration_seconds'] = (results['completed_at'] - results['started_at']).total_seconds()
        
        return results
        
    except Exception as e:
        logger.error(f"Error during tenant data migration: {str(e)}")
        results['error'] = str(e)
        results['completed_at'] = timezone.now()
        results['duration_seconds'] = (results['completed_at'] - results['started_at']).total_seconds()
        return results 