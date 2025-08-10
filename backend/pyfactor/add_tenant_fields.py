#!/usr/bin/env python
"""
Add tenant_id fields to all models that need tenant isolation.
This script generates migrations for the 116 models missing tenant_id.
"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.apps import apps
from django.db import connection

# Models that legitimately don't need tenant isolation
EXEMPT_MODELS = [
    # Django system models
    'User', 'Group', 'Permission', 'ContentType', 'Session', 'LogEntry',
    'Migration', 'Site',
    
    # Auth tokens (tied to user, not tenant)
    'Token', 'TokenProxy', 'OutstandingToken', 'BlacklistedToken',
    
    # Reference data (shared across all tenants)
    'Country', 'State', 'City', 'Currency', 'Timezone', 'Language',
    'TaxRate', 'IndustryType', 'BusinessType',
    
    # System configuration
    'Tenant', 'PagePermission', 'RoleTemplate', 'SystemSetting',
    
    # Audit/Security (needs to track cross-tenant attempts)
    'AuditLog', 'SecurityEvent', 'LoginAttempt',
]

def get_models_needing_tenant():
    """Get list of models that need tenant_id field."""
    models_needing_tenant = []
    
    for model in apps.get_models():
        # Skip exempt models
        if model.__name__ in EXEMPT_MODELS:
            continue
            
        # Skip Django internal apps
        if model._meta.app_label in ['admin', 'auth', 'contenttypes', 'sessions', 'sites']:
            continue
            
        # Check if model already has tenant field
        field_names = [f.name for f in model._meta.fields]
        if 'tenant_id' not in field_names and 'business_id' not in field_names:
            models_needing_tenant.append({
                'app': model._meta.app_label,
                'model': model.__name__,
                'table': model._meta.db_table,
                'model_class': model
            })
    
    return models_needing_tenant

def generate_migration_content(app_label, models):
    """Generate migration file content for adding tenant_id."""
    
    operations = []
    for model_info in models:
        operations.append(f"""
        migrations.AddField(
            model_name='{model_info['model'].lower()}',
            name='tenant_id',
            field=models.UUIDField(null=True, blank=True, db_index=True),
        ),""")
    
    migration_content = f'''"""
Auto-generated migration to add tenant_id fields for tenant isolation.
"""
from django.db import migrations, models
import uuid

class Migration(migrations.Migration):
    
    dependencies = [
        ('{app_label}', '0001_initial'),  # Update this to latest migration
    ]
    
    operations = [{''.join(operations)}
    ]
'''
    return migration_content

def create_migrations():
    """Create migration files for each app."""
    
    models_by_app = {}
    models_needing_tenant = get_models_needing_tenant()
    
    # Group models by app
    for model_info in models_needing_tenant:
        app = model_info['app']
        if app not in models_by_app:
            models_by_app[app] = []
        models_by_app[app].append(model_info)
    
    print(f"📊 Found {len(models_needing_tenant)} models needing tenant_id across {len(models_by_app)} apps")
    
    created_migrations = []
    
    for app_label, models in models_by_app.items():
        # Skip certain apps
        if app_label in ['token_blacklist', 'authtoken']:
            print(f"⏭️  Skipping {app_label} (auth-related)")
            continue
            
        migration_dir = f"/Users/kuoldeng/projectx/backend/pyfactor/{app_label}/migrations"
        
        if not os.path.exists(migration_dir):
            print(f"⚠️  No migrations directory for {app_label}")
            continue
        
        # Find next migration number
        existing_migrations = [f for f in os.listdir(migration_dir) if f.endswith('.py') and not f.startswith('__')]
        next_number = len(existing_migrations) + 1
        
        migration_filename = f"{next_number:04d}_add_tenant_id_fields.py"
        migration_path = os.path.join(migration_dir, migration_filename)
        
        # Generate and write migration
        content = generate_migration_content(app_label, models)
        
        with open(migration_path, 'w') as f:
            f.write(content)
        
        created_migrations.append(f"{app_label}/{migration_filename}")
        print(f"✅ Created migration: {app_label}/migrations/{migration_filename}")
    
    return created_migrations

def add_tenant_id_to_models():
    """Add tenant_id directly to database for immediate protection."""
    
    print("\n🔒 Adding tenant_id columns to database...")
    
    models_needing_tenant = get_models_needing_tenant()
    
    with connection.cursor() as cursor:
        success_count = 0
        for model_info in models_needing_tenant:
            table = model_info['table']
            try:
                # Check if column already exists
                cursor.execute(f"""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = '{table}' 
                    AND column_name = 'tenant_id'
                """)
                
                if cursor.fetchone():
                    print(f"  ⏭️  {table} already has tenant_id")
                    continue
                
                # Add tenant_id column
                cursor.execute(f"""
                    ALTER TABLE {table} 
                    ADD COLUMN IF NOT EXISTS tenant_id UUID;
                """)
                
                # Add index for performance
                cursor.execute(f"""
                    CREATE INDEX IF NOT EXISTS idx_{table}_tenant 
                    ON {table}(tenant_id);
                """)
                
                print(f"  ✅ Added tenant_id to {table}")
                success_count += 1
                
            except Exception as e:
                print(f"  ❌ Failed to add tenant_id to {table}: {str(e)}")
    
    print(f"\n✅ Added tenant_id to {success_count} tables")

def main():
    print("="*60)
    print("🔐 Adding Tenant ID Fields to All Models")
    print("="*60)
    
    # Get models needing tenant_id
    models_needing = get_models_needing_tenant()
    
    print(f"\n📋 Models needing tenant_id: {len(models_needing)}")
    
    # Show first 10
    for model in models_needing[:10]:
        print(f"  - {model['app']}.{model['model']} (table: {model['table']})")
    
    if len(models_needing) > 10:
        print(f"  ... and {len(models_needing) - 10} more")
    
    # Add to database immediately
    add_tenant_id_to_models()
    
    # Create migrations
    print("\n📝 Creating Django migrations...")
    migrations = create_migrations()
    
    if migrations:
        print(f"\n✅ Created {len(migrations)} migration files")
        print("\n⚠️  Next steps:")
        print("  1. Review the generated migrations")
        print("  2. Run: python manage.py migrate")
        print("  3. Update models to inherit from TenantAwareModel")
        print("  4. Deploy immediately")

if __name__ == "__main__":
    main()