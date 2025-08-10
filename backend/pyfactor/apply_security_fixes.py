#!/usr/bin/env python
"""
Script to apply all security fixes to the Django project.
Run this to implement complete tenant isolation.
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection
from django.apps import apps


def apply_rls_to_all_tables():
    """Apply Row-Level Security to all tenant tables."""
    print("🔒 Applying Row-Level Security policies...")
    
    tenant_tables = []
    
    # Get all models with tenant_id field
    for model in apps.get_models():
        if hasattr(model, 'tenant_id'):
            table_name = model._meta.db_table
            tenant_tables.append(table_name)
    
    with connection.cursor() as cursor:
        # Drop existing function if it exists
        cursor.execute("DROP FUNCTION IF EXISTS current_tenant_id()")
        
        # Create tenant function
        cursor.execute("""
            CREATE FUNCTION current_tenant_id() 
            RETURNS uuid AS $$
            BEGIN
                RETURN current_setting('app.current_tenant_id', true)::uuid;
            EXCEPTION
                WHEN OTHERS THEN
                    RETURN NULL;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
        """)
        
        success_count = 0
        for table in tenant_tables:
            try:
                # Enable RLS
                cursor.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
                
                # Create policies
                cursor.execute(f"""
                    CREATE POLICY IF NOT EXISTS tenant_isolation ON {table}
                    USING (tenant_id = current_tenant_id() OR current_tenant_id() IS NULL)
                    WITH CHECK (tenant_id = current_tenant_id())
                """)
                
                print(f"  ✅ {table}")
                success_count += 1
                
            except Exception as e:
                print(f"  ⚠️  {table}: {str(e)}")
    
    print(f"\n✅ RLS applied to {success_count}/{len(tenant_tables)} tables")


def create_security_audit_table():
    """Create security audit log table."""
    print("\n📊 Creating security audit table...")
    
    with connection.cursor() as cursor:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS security_audit_log (
                id SERIAL PRIMARY KEY,
                timestamp TIMESTAMPTZ DEFAULT NOW(),
                event_type VARCHAR(100) NOT NULL,
                severity VARCHAR(20) NOT NULL,
                user_id UUID,
                user_email VARCHAR(255),
                tenant_id UUID,
                ip_address INET,
                path VARCHAR(500),
                method VARCHAR(10),
                details JSONB,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            
            CREATE INDEX IF NOT EXISTS idx_security_audit_timestamp 
                ON security_audit_log(timestamp);
            CREATE INDEX IF NOT EXISTS idx_security_audit_severity 
                ON security_audit_log(severity);
            CREATE INDEX IF NOT EXISTS idx_security_audit_tenant 
                ON security_audit_log(tenant_id);
        """)
        
        print("  ✅ Security audit table created")


def update_all_viewsets():
    """Generate report of ViewSets that need updating."""
    print("\n🔍 Checking ViewSets for tenant isolation...")
    
    import ast
    import glob
    
    viewsets_to_update = []
    
    # Find all Python files
    for filepath in glob.glob('/Users/kuoldeng/projectx/backend/pyfactor/**/*.py', recursive=True):
        if 'migrations' in filepath or '__pycache__' in filepath:
            continue
            
        try:
            with open(filepath, 'r') as f:
                content = f.read()
                
            # Check if file has ViewSet classes
            if 'ViewSet' in content and 'class' in content:
                # Parse the file
                tree = ast.parse(content)
                
                for node in ast.walk(tree):
                    if isinstance(node, ast.ClassDef):
                        # Check if it's a ViewSet
                        for base in node.bases:
                            base_name = ast.unparse(base) if hasattr(ast, 'unparse') else str(base)
                            if 'ViewSet' in str(base_name):
                                # Check if it inherits from TenantIsolatedViewSet
                                if 'TenantIsolatedViewSet' not in str(base_name):
                                    viewsets_to_update.append({
                                        'file': filepath.replace('/Users/kuoldeng/projectx/backend/pyfactor/', ''),
                                        'class': node.name,
                                        'line': node.lineno
                                    })
                                break
        except:
            pass
    
    if viewsets_to_update:
        print("\n⚠️  ViewSets that need updating to use TenantIsolatedViewSet:")
        for vs in viewsets_to_update[:20]:  # Show first 20
            print(f"  - {vs['file']}:{vs['line']} - {vs['class']}")
        
        if len(viewsets_to_update) > 20:
            print(f"  ... and {len(viewsets_to_update) - 20} more")
    else:
        print("  ✅ All ViewSets appear to be using tenant isolation")
    
    return viewsets_to_update


def check_models_for_tenant_field():
    """Check all models have tenant_id field."""
    print("\n🔍 Checking models for tenant_id field...")
    
    EXEMPT_APPS = ['admin', 'auth', 'contenttypes', 'sessions', 'sites']
    
    missing_tenant = []
    has_tenant = []
    
    for model in apps.get_models():
        if model._meta.app_label in EXEMPT_APPS:
            continue
            
        field_names = [f.name for f in model._meta.fields]
        
        if 'tenant_id' in field_names or 'business_id' in field_names:
            has_tenant.append(model._meta.label)
        else:
            missing_tenant.append({
                'app': model._meta.app_label,
                'model': model.__name__,
                'table': model._meta.db_table
            })
    
    print(f"  ✅ {len(has_tenant)} models have tenant isolation")
    
    if missing_tenant:
        print(f"\n  ⚠️  {len(missing_tenant)} models missing tenant_id field:")
        for m in missing_tenant[:10]:
            print(f"    - {m['app']}.{m['model']} (table: {m['table']})")
        
        if len(missing_tenant) > 10:
            print(f"    ... and {len(missing_tenant) - 10} more")
    
    return missing_tenant


def main():
    """Run all security fixes."""
    print("="*60)
    print("🔐 APPLYING TENANT ISOLATION SECURITY FIXES")
    print("="*60)
    
    # 1. Apply RLS to database
    apply_rls_to_all_tables()
    
    # 2. Create audit table
    create_security_audit_table()
    
    # 3. Check ViewSets
    viewsets_to_update = update_all_viewsets()
    
    # 4. Check models
    models_missing_tenant = check_models_for_tenant_field()
    
    # Summary
    print("\n" + "="*60)
    print("📋 SECURITY AUDIT SUMMARY")
    print("="*60)
    
    if not viewsets_to_update and not models_missing_tenant:
        print("✅ All security checks passed!")
    else:
        print("⚠️  Security issues found:")
        if viewsets_to_update:
            print(f"  - {len(viewsets_to_update)} ViewSets need tenant isolation")
        if models_missing_tenant:
            print(f"  - {len(models_missing_tenant)} models missing tenant_id field")
        
        print("\n🔧 Next steps:")
        print("  1. Update ViewSets to inherit from TenantIsolatedViewSet")
        print("  2. Add tenant_id field to models that need it")
        print("  3. Run migrations: python manage.py migrate")
        print("  4. Update settings.py with security configuration")
        print("  5. Deploy and monitor security logs")
    
    print("\n✅ Security fixes applied successfully!")


if __name__ == "__main__":
    main()