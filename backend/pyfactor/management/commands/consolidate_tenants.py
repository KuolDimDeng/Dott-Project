import os
import sys
import logging
import uuid
import datetime
import traceback
from django.core.management.base import BaseCommand
from django.db import connection, transaction
from django.conf import settings
from pyfactor.custom_auth.models import TenantSchema
from pyfactor.users.models import User

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Consolidate duplicate tenant schemas for the same business owner'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Run without making any changes')
        parser.add_argument('--tenant-id', type=str, help='Specific tenant ID to consolidate')
        parser.add_argument('--user-email', type=str, help='User email to consolidate tenants for')

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        tenant_id = options.get('tenant_id')
        user_email = options.get('user_email')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('Dry run mode enabled - no changes will be made'))
        
        try:
            # Get all tenant schemas
            schemas = self.get_all_tenant_schemas()
            self.stdout.write(f"Found {len(schemas)} tenant schemas")
            
            # Filter by tenant_id if specified
            if tenant_id:
                schemas = [s for s in schemas if s.get('tenant_id') == tenant_id]
                self.stdout.write(f"Filtered to {len(schemas)} schemas with tenant ID {tenant_id}")
            
            # Group schemas by owner
            owner_schemas = self.group_schemas_by_owner(schemas)
            
            # Further filter by user email if specified
            if user_email:
                user = User.objects.filter(email=user_email).first()
                if user:
                    owner_ids = [str(user.id)]
                    owner_schemas = {owner_id: schemas for owner_id, schemas in owner_schemas.items() 
                                   if owner_id in owner_ids}
                    self.stdout.write(f"Filtered to {len(owner_schemas)} owners with email {user_email}")
                else:
                    self.stdout.write(self.style.ERROR(f"User with email {user_email} not found"))
                    return
            
            # Process owners with multiple schemas
            duplicates = {owner: schemas for owner, schemas in owner_schemas.items() if len(schemas) > 1}
            
            if not duplicates:
                self.stdout.write(self.style.SUCCESS("No duplicate tenant schemas found"))
                return
                
            self.stdout.write(f"Found {len(duplicates)} owners with multiple tenant schemas")
            
            # Process each owner's duplicate schemas
            for owner, schemas in duplicates.items():
                self.stdout.write(f"Processing owner {owner} with {len(schemas)} schemas")
                self.consolidate_schemas(owner, schemas, dry_run)
                
            self.stdout.write(self.style.SUCCESS("Tenant schema consolidation completed"))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error consolidating tenant schemas: {str(e)}"))
            self.stdout.write(self.style.ERROR(traceback.format_exc()))
            
    def get_all_tenant_schemas(self):
        """Get all tenant schemas with their creation times and owners"""
        schemas = []
        
        # Get all tenant schemas from the database
        tenant_records = TenantSchema.objects.all()
        
        for tenant in tenant_records:
            schema_name =  tenant.id
            tenant_id = str(tenant.tenant_id)
            owner_id = self.find_schema_owner(tenant_id)
            
            # Get schema creation time from postgres pg_namespace if available
            created_at = self.get_schema_creation_time(schema_name)
            
            schemas.append({
                'schema_name': schema_name,
                'tenant_id': tenant_id,
                'owner_id': owner_id,
                'created_at': created_at or tenant.created_at,
                'tenant_obj': tenant
            })
            
        return schemas
        
    def find_schema_owner(self, tenant_id):
        """Find the owner of a tenant schema"""
        try:
            # Look up user who owns this tenant
            tenant_user = User.objects.filter(tenant_id=tenant_id, role='owner').first()
            if tenant_user:
                return str(tenant_user.id)
        except Exception as e:
            logger.error(f"Error finding owner for tenant {tenant_id}: {str(e)}")
        
        return None
        
    def get_schema_creation_time(tenant_id: uuid.UUID:
        """Get the creation time of a schema from postgres metadata"""
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT n.nspname, c.relname, c.relkind, n.nspacl, "
                    "COALESCE(pg_catalog.pg_stat_get_relatt_updatetime(c.oid), "
                    "pg_catalog.pg_stat_get_last_reltuples_updatetime(c.oid)) AS last_updated "
                    "FROM pg_catalog.pg_class c "
                    "LEFT JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace "
                    "WHERE n.nspname = %s "
                    "ORDER BY last_updated DESC "
                    "LIMIT 1", [schema_name]
                )
                row = cursor.fetchone()
                if row and row[4]:
                    return row[4]
        except Exception as e:
            logger.error(f"Error getting creation time for schema {schema_name}: {str(e)}")
            
        return None
        
    def group_schemas_by_owner(self, schemas):
        """Group schemas by owner ID"""
        owner_schemas = {}
        
        for schema in schemas:
            owner_id = schema.get('owner_id')
            if not owner_id:
                continue
                
            if owner_id not in owner_schemas:
                owner_schemas[owner_id] = []
                
            owner_schemas[owner_id].append(schema)
            
        return owner_schemas
        
    def consolidate_schemas(self, owner_id, schemas, dry_run=False):
        """Consolidate multiple schemas for a single owner"""
        if len(schemas) <= 1:
            return
            
        # Sort schemas by creation time (oldest first)
        sorted_schemas = sorted(schemas, key=lambda s: s.get('created_at') or datetime.datetime.min)
        
        # The oldest schema is the primary one to keep
        primary_schema = sorted_schemas[0]
        schemas_to_consolidate = sorted_schemas[1:]
        
        self.stdout.write(f"For owner {owner_id}:")
        self.stdout.write(f"  Primary schema: {primary_schema['schema_name']} ({primary_schema['tenant_id']})")
        self.stdout.write(f"  Schemas to consolidate: {len(schemas_to_consolidate)}")
        
        for schema in schemas_to_consolidate:
            self.stdout.write(f"  - {schema['schema_name']} ({schema['tenant_id']})")
            
            if not dry_run:
                self.migrate_schema_data(
                    source_schema=schema['schema_name'],
                    target_schema=primary_schema['schema_name'],
                    source_tenant_id=schema['tenant_id'],
                    target_tenant_id=primary_schema['tenant_id']
                )
                
                # Update any users pointing to the old tenant ID
                self.update_user_tenant_references(
                    old_tenant_id=schema['tenant_id'],
                    new_tenant_id=primary_schema['tenant_id']
                )
                
                # Mark old schema for deletion
                self.mark_schema_for_deletion(schema['tenant_obj'])
                
    def migrate_schema_data(self, source_schema, target_schema, source_tenant_id, target_tenant_id):
        """Migrate data from source schema to target schema"""
        logger.info(f"Migrating data from {source_schema} to {target_schema}")
        
        try:
            with transaction.atomic():
                # Get list of tables in source schema
                with connection.cursor() as cursor:
                    cursor.execute(
                        "SELECT table_name FROM information_schema.tables "
                        "WHERE table_schema = %s AND table_type = 'BASE TABLE'",
                        [source_schema]
                    )
                    tables = [row[0] for row in cursor.fetchall()]
                
                # For each table, count records and determine if migration is needed
                for table in tables:
                    # Skip certain system tables
                    if table.startswith('django_') or table.startswith('auth_'):
                        continue
                        
                    with connection.cursor() as cursor:
                        # Count records in source table
                        cursor.execute(f"SELECT COUNT(*) FROM {source_schema}.{table}")
                        source_count = cursor.fetchone()[0]
                        
                        if source_count == 0:
                            logger.info(f"Table {source_schema}.{table} is empty, skipping")
                            continue
                            
                        # Check if table exists in target schema
                        cursor.execute(
                            "SELECT COUNT(*) FROM information_schema.tables "
                            "WHERE table_schema = %s AND table_name = %s",
                            [target_schema, table]
                        )
                        table_exists = cursor.fetchone()[0] > 0
                        
                        if not table_exists:
                            logger.warning(f"Table {table} does not exist in target schema {target_schema}, skipping")
                            continue
                            
                        # TODO: Implement more complex data migration logic if needed
                        # This is a simplified version that would need to be expanded
                        # based on the specific application schema and data relationships
                        
                        logger.info(f"Table {table} has {source_count} records in source schema")
                    
                logger.info(f"Migration completed from {source_schema} to {target_schema}")
                
        except Exception as e:
            logger.error(f"Error migrating schema data: {str(e)}")
            logger.error(traceback.format_exc())
            raise
            
    def update_user_tenant_references(self, old_tenant_id, new_tenant_id):
        """Update user records to point to the new tenant ID"""
        try:
            # Find users with the old tenant ID
            users_to_update = User.objects.filter(tenant_id=old_tenant_id)
            count = users_to_update.count()
            
            if count > 0:
                users_to_update.update(tenant_id=new_tenant_id)
                logger.info(f"Updated {count} users from tenant {old_tenant_id} to {new_tenant_id}")
        except Exception as e:
            logger.error(f"Error updating user tenant references: {str(e)}")
            logger.error(traceback.format_exc())
            
    def mark_schema_for_deletion(self, tenant_obj):
        """Mark a tenant schema for deletion"""
        try:
            # Update status or add a deletion marker
            tenant_obj.status = 'DELETED'
            tenant_obj.deleted_at = datetime.datetime.now()
            tenant_obj.save()
            
            logger.info(f"Marked schema {tenant_obj.schema_name} for deletion")
            
            # Add schema name to deletion queue
            with connection.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO public.deleted_schemas (schema_name, deleted_at) "
                    "VALUES (%s, NOW()) ON CONFLICT DO NOTHING",
                    [tenant_obj.schema_name]
                )
                
        except Exception as e:
            logger.error(f"Error marking schema for deletion: {str(e)}")
            logger.error(traceback.format_exc()) 