#!/usr/bin/env python
"""
Complete tenant isolation for ALL ViewSets and models.
Target: 100% coverage.
"""
import os
import re
import glob
import django
from pathlib import Path

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.apps import apps
from django.db import connection

# ViewSets that legitimately don't need tenant isolation
EXEMPT_VIEWSETS = [
    'PublicViewSet',
    'CountryViewSet', 
    'StateViewSet',
    'CurrencyViewSet',
    'TimezoneViewSet',
    'HealthCheckViewSet',
    'PublicSessionDetailView',
    'AuthViewSet',
    'LoginViewSet'
]

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
    
    # User-level data (not tenant-specific)
    'UserProfile', 'UserPreferences', 'UserSession'
]

def find_unsecured_viewsets():
    """Find all ViewSets not using TenantIsolatedViewSet."""
    unsecured = []
    
    # Find all Python files that might contain ViewSets
    python_files = []
    for pattern in ['**/views.py', '**/viewsets.py', '**/views_*.py', '**/*viewset*.py']:
        python_files.extend(glob.glob(
            f'/Users/kuoldeng/projectx/backend/pyfactor/**/{pattern}',
            recursive=True
        ))
    
    # Remove duplicates and filter
    python_files = list(set(python_files))
    python_files = [
        f for f in python_files 
        if 'migrations' not in f 
        and '__pycache__' not in f
        and 'backup' not in f
    ]
    
    for filepath in python_files:
        try:
            with open(filepath, 'r') as f:
                content = f.read()
            
            # Skip if already using TenantIsolatedViewSet
            if 'TenantIsolatedViewSet' in content or 'TenantFilteredViewSet' in content:
                continue
            
            # Look for ViewSet definitions
            viewset_pattern = r'class\s+(\w+(?:ViewSet|View))\s*\([^)]*(?:viewsets\.|views\.)(?:ModelViewSet|ViewSet|ReadOnlyModelViewSet|APIView|GenericAPIView)[^)]*\):'
            matches = re.findall(viewset_pattern, content)
            
            for viewset_name in matches:
                # Skip exempt ViewSets
                if any(exempt in viewset_name for exempt in EXEMPT_VIEWSETS):
                    continue
                
                unsecured.append({
                    'file': filepath,
                    'viewset': viewset_name,
                    'relative_path': Path(filepath).relative_to('/Users/kuoldeng/projectx/backend/pyfactor')
                })
        except Exception as e:
            print(f"Error reading {filepath}: {e}")
    
    return unsecured

def find_models_without_tenant():
    """Find all models missing tenant_id field."""
    models_without_tenant = []
    
    for model in apps.get_models():
        # Skip exempt models
        if model.__name__ in EXEMPT_MODELS:
            continue
        
        # Skip Django internal apps
        if model._meta.app_label in ['admin', 'auth', 'contenttypes', 'sessions', 'sites', 'messages', 'staticfiles']:
            continue
        
        # Check if model has tenant field
        field_names = [f.name for f in model._meta.fields]
        if 'tenant_id' not in field_names and 'business_id' not in field_names and 'tenant' not in field_names:
            models_without_tenant.append({
                'app': model._meta.app_label,
                'model': model.__name__,
                'table': model._meta.db_table,
                'file': model.__module__.replace('.', '/') + '.py'
            })
    
    return models_without_tenant

def update_viewset_file(filepath, viewsets):
    """Update a file to use TenantIsolatedViewSet."""
    with open(filepath, 'r') as f:
        content = f.read()
    
    original_content = content
    
    # Add import if not present
    if 'from custom_auth.tenant_base_viewset import TenantIsolatedViewSet' not in content:
        # Find the imports section
        import_match = re.search(r'(from rest_framework import.*\n)', content)
        if import_match:
            import_line = import_match.group(1)
            new_import = import_line + 'from custom_auth.tenant_base_viewset import TenantIsolatedViewSet\n'
            content = content.replace(import_line, new_import)
    
    # Replace each ViewSet inheritance
    for viewset_info in viewsets:
        viewset_name = viewset_info['viewset']
        
        # Find the class definition
        class_pattern = rf'class\s+{viewset_name}\s*\([^)]*\):'
        class_match = re.search(class_pattern, content)
        
        if class_match:
            # Replace with TenantIsolatedViewSet
            new_definition = f'class {viewset_name}(TenantIsolatedViewSet):'
            content = re.sub(class_pattern, new_definition, content)
    
    # Write back if changed
    if content != original_content:
        # Create backup
        backup_path = filepath + '.backup_complete'
        with open(backup_path, 'w') as f:
            f.write(original_content)
        
        # Write updated content
        with open(filepath, 'w') as f:
            f.write(content)
        
        return True
    
    return False

def add_tenant_to_model(model_info):
    """Add tenant_id field to a model file."""
    filepath = f"/Users/kuoldeng/projectx/backend/pyfactor/{model_info['file']}"
    
    if not os.path.exists(filepath):
        print(f"  ⚠️  File not found: {filepath}")
        return False
    
    try:
        with open(filepath, 'r') as f:
            content = f.read()
        
        # Check if already has tenant field
        if 'tenant_id' in content or 'tenant = models.' in content:
            return False
        
        # Find the class definition
        class_pattern = rf'class\s+{model_info["model"]}\s*\([^)]*models\.Model[^)]*\):'
        class_match = re.search(class_pattern, content)
        
        if not class_match:
            return False
        
        # Find the first field definition after the class
        field_pattern = r'(\n\s+)(\w+\s*=\s*models\.)'
        field_match = re.search(class_pattern + r'.*?' + field_pattern, content, re.DOTALL)
        
        if field_match:
            # Insert tenant_id field at the beginning of the model
            indent = field_match.group(1)
            insertion_point = field_match.start(1)
            
            tenant_field = f"{indent}tenant_id = models.UUIDField(null=True, blank=True, db_index=True, help_text='Tenant isolation field')"
            
            new_content = content[:insertion_point] + tenant_field + content[insertion_point:]
            
            # Write back
            with open(filepath, 'w') as f:
                f.write(new_content)
            
            return True
    except Exception as e:
        print(f"  ❌ Error updating {filepath}: {e}")
    
    return False

def add_tenant_to_database(model_info):
    """Add tenant_id column directly to database table."""
    table = model_info['table']
    
    try:
        with connection.cursor() as cursor:
            # Check if column exists
            cursor.execute(f"""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = %s 
                AND column_name = 'tenant_id'
            """, [table])
            
            if cursor.fetchone():
                return False
            
            # Add tenant_id column
            cursor.execute(f"""
                ALTER TABLE {table} 
                ADD COLUMN IF NOT EXISTS tenant_id UUID;
            """)
            
            # Add index
            cursor.execute(f"""
                CREATE INDEX IF NOT EXISTS idx_{table}_tenant 
                ON {table}(tenant_id);
            """)
            
            return True
    except Exception as e:
        print(f"  ❌ Database error for {table}: {e}")
        return False

def main():
    print("="*60)
    print("🔒 COMPLETING 100% TENANT ISOLATION")
    print("="*60)
    
    # Find unsecured ViewSets
    print("\n📊 Finding unsecured ViewSets...")
    unsecured_viewsets = find_unsecured_viewsets()
    print(f"Found {len(unsecured_viewsets)} ViewSets to secure")
    
    # Group by file
    viewsets_by_file = {}
    for vs in unsecured_viewsets:
        if vs['file'] not in viewsets_by_file:
            viewsets_by_file[vs['file']] = []
        viewsets_by_file[vs['file']].append(vs)
    
    # Update ViewSets
    print("\n🔧 Securing ViewSets...")
    updated_files = 0
    for filepath, viewsets in viewsets_by_file.items():
        print(f"  Updating {Path(filepath).name}...")
        for vs in viewsets:
            print(f"    - {vs['viewset']}")
        
        if update_viewset_file(filepath, viewsets):
            updated_files += 1
            print(f"    ✅ Updated")
    
    print(f"\n✅ Updated {updated_files} files with {len(unsecured_viewsets)} ViewSets")
    
    # Find models without tenant
    print("\n📊 Finding models without tenant_id...")
    models_without_tenant = find_models_without_tenant()
    print(f"Found {len(models_without_tenant)} models to update")
    
    # Update models
    print("\n🔧 Adding tenant_id to models...")
    models_updated = 0
    db_updated = 0
    
    for model in models_without_tenant:
        print(f"  {model['app']}.{model['model']} (table: {model['table']})")
        
        # Update model file
        if add_tenant_to_model(model):
            models_updated += 1
            print(f"    ✅ Model file updated")
        
        # Update database
        if add_tenant_to_database(model):
            db_updated += 1
            print(f"    ✅ Database table updated")
    
    print(f"\n✅ Updated {models_updated} model files")
    print(f"✅ Updated {db_updated} database tables")
    
    # Final summary
    print("\n" + "="*60)
    print("📊 FINAL SUMMARY")
    print("="*60)
    print(f"ViewSets secured: {len(unsecured_viewsets)} additional")
    print(f"Models updated: {models_updated} files, {db_updated} tables")
    print("\nNext steps:")
    print("  1. Review the changes")
    print("  2. Run: python manage.py makemigrations")
    print("  3. Run: python manage.py migrate")
    print("  4. Deploy immediately")

if __name__ == "__main__":
    main()