import uuid
from django.core.management.base import BaseCommand
from django.db import connection
from custom_auth.models import Tenant
from django.utils import timezone

class Command(BaseCommand):
    help = 'Synchronize tenant data between Django model and Next.js application'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting tenant synchronization...'))
        
        # Ensure the custom_auth.management directory exists
        try:
            # First, make sure the migrations have run
            self.stdout.write("Checking if migrations are applied")
            
            # Get existing tenant records directly from PostgreSQL
            import psycopg2
            import os
            
            # Use the same database connection info as in settings.py
            conn = psycopg2.connect(
                dbname=os.getenv('DB_NAME', 'dott_main'),
                user=os.getenv('DB_USER', 'postgres'),
                password=os.getenv('DB_PASSWORD', 'postgres'),
                host=os.getenv('DB_HOST', 'localhost'),
                port=os.getenv('DB_PORT', '5432')
            )
            
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT id, name, owner_id, schema_name, created_at, updated_at, rls_enabled, rls_setup_date, is_active 
                    FROM custom_auth_tenant -- This is the NextJS table
                """)
                columns = [desc[0] for desc in cursor.description]
                next_js_tenants = [dict(zip(columns, row)) for row in cursor.fetchall()]
                
                # Log the tenants found
                self.stdout.write(f"Found {len(next_js_tenants)} tenant records with columns: {columns}")
                
                # Display the first tenant for debugging
                if next_js_tenants:
                    self.stdout.write(f"First tenant: {next_js_tenants[0]}")
                
            conn.close()
            
            self.stdout.write(f"Found {len(next_js_tenants)} tenant records from database")
            
            # Clear existing Django tenant records
            Tenant.objects.all().delete()
            self.stdout.write("Cleared existing Django tenant records")
            
            # Import records from Next.js table
            for tenant_data in next_js_tenants:
                # Convert string UUIDs to UUID objects
                tenant_id = tenant_data['id']
                if isinstance(tenant_id, str):
                    tenant_id = uuid.UUID(tenant_id)
                
                # Create new tenant in Django
                tenant = Tenant(
                    id=tenant_id,
                    name=tenant_data['name'],
                    owner_id=tenant_data['owner_id'],
                    schema_name=tenant_data['schema_name'],
                    created_at=tenant_data['created_at'],
                    updated_at=tenant_data['updated_at'],
                    rls_enabled=tenant_data['rls_enabled'],
                    rls_setup_date=tenant_data['rls_setup_date'],
                    is_active=tenant_data['is_active'],
                )
                tenant.save(
                    update_fields=[
                        'name', 'owner_id', 'schema_name', 'created_at', 
                        'updated_at', 'rls_enabled', 'rls_setup_date', 'is_active'
                    ]
                )
                
                self.stdout.write(f"Synchronized tenant: {tenant.name} (ID: {tenant.id})")
            
            self.stdout.write(self.style.SUCCESS(f'Successfully synchronized {len(next_js_tenants)} tenant records'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error synchronizing tenant data: {str(e)}'))