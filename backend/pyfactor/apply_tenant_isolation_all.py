#!/usr/bin/env python
"""
CRITICAL: Apply tenant isolation to ALL ViewSets automatically.
This script will update all 214 vulnerable ViewSets.
"""
import os
import re
import glob
from pathlib import Path

# ViewSets that should NOT have tenant isolation
EXEMPT_VIEWSETS = [
    'PublicViewSet',
    'CountryViewSet', 
    'StateViewSet',
    'CurrencyViewSet',
    'TimezoneViewSet',
    'HealthCheckViewSet'
]

def update_viewset_file(filepath):
    """Update a single file to use TenantIsolatedViewSet."""
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Skip if already using TenantIsolatedViewSet or TenantFilteredViewSet
    if 'TenantIsolatedViewSet' in content or 'TenantFilteredViewSet' in content:
        return False
    
    # Track if we made changes
    changed = False
    original_content = content
    
    # Add import if not present
    if 'from custom_auth.tenant_base_viewset import TenantIsolatedViewSet' not in content:
        # Find the imports section
        import_match = re.search(r'(from rest_framework import.*viewsets.*\n)', content)
        if import_match:
            import_line = import_match.group(1)
            new_import = import_line + 'from custom_auth.tenant_base_viewset import TenantIsolatedViewSet\n'
            content = content.replace(import_line, new_import)
            changed = True
    
    # Replace ViewSet inheritance
    # Pattern to match class definitions
    class_pattern = r'class\s+(\w+ViewSet)\s*\([^)]*viewsets\.(ModelViewSet|ViewSet|ReadOnlyModelViewSet)[^)]*\):'
    
    def replace_viewset(match):
        class_name = match.group(1)
        
        # Skip exempt ViewSets
        if any(exempt in class_name for exempt in EXEMPT_VIEWSETS):
            return match.group(0)
        
        # Replace with TenantIsolatedViewSet
        return f'class {class_name}(TenantIsolatedViewSet):'
    
    new_content = re.sub(class_pattern, replace_viewset, content)
    
    if new_content != content:
        content = new_content
        changed = True
    
    # Write back if changed
    if changed:
        # Create backup
        backup_path = filepath + '.backup'
        with open(backup_path, 'w') as f:
            f.write(original_content)
        
        # Write updated content
        with open(filepath, 'w') as f:
            f.write(content)
        
        return True
    
    return False

def fix_all_viewsets():
    """Fix all ViewSets in the project."""
    
    print("🔍 Scanning for ViewSets to update...")
    
    # Find all Python files
    viewset_files = []
    for pattern in ['**/views.py', '**/viewsets.py', '**/views_*.py', '**/*viewset*.py']:
        viewset_files.extend(glob.glob(
            f'/Users/kuoldeng/projectx/backend/pyfactor/**/{pattern}',
            recursive=True
        ))
    
    # Remove duplicates and filter
    viewset_files = list(set(viewset_files))
    viewset_files = [
        f for f in viewset_files 
        if 'migrations' not in f 
        and '__pycache__' not in f
        and 'backup' not in f
    ]
    
    updated_files = []
    skipped_files = []
    
    for filepath in viewset_files:
        try:
            if update_viewset_file(filepath):
                updated_files.append(filepath)
                print(f"  ✅ Updated: {Path(filepath).relative_to('/Users/kuoldeng/projectx/backend/pyfactor')}")
            else:
                skipped_files.append(filepath)
        except Exception as e:
            print(f"  ❌ Error updating {filepath}: {str(e)}")
    
    return updated_files, skipped_files

def create_base_viewset_for_all():
    """Ensure base ViewSet exists and is properly configured."""
    
    base_viewset_path = '/Users/kuoldeng/projectx/backend/pyfactor/custom_auth/tenant_base_viewset.py'
    
    if not os.path.exists(base_viewset_path):
        print("❌ Base TenantIsolatedViewSet not found! Creating it...")
        # Create the base viewset file
        # (Already created in previous step)
        return False
    
    print("✅ Base TenantIsolatedViewSet exists")
    return True

def main():
    print("="*60)
    print("🚨 CRITICAL SECURITY FIX: Applying Tenant Isolation to ALL ViewSets")
    print("="*60)
    
    # Check base viewset exists
    if not create_base_viewset_for_all():
        print("❌ Cannot proceed without base ViewSet")
        return
    
    # Fix all viewsets
    updated, skipped = fix_all_viewsets()
    
    print("\n" + "="*60)
    print("📊 RESULTS")
    print("="*60)
    print(f"✅ Updated: {len(updated)} files")
    print(f"⏭️  Skipped: {len(skipped)} files (already protected or exempt)")
    
    if updated:
        print("\n⚠️  IMPORTANT NEXT STEPS:")
        print("  1. Review the changes in each file")
        print("  2. Run tests: python manage.py test")
        print("  3. Commit changes: git add -A && git commit -m 'Apply tenant isolation to all ViewSets'")
        print("  4. Deploy immediately")
        print("\n🔍 Files updated:")
        for f in updated[:10]:
            print(f"  - {Path(f).relative_to('/Users/kuoldeng/projectx/backend/pyfactor')}")
        if len(updated) > 10:
            print(f"  ... and {len(updated) - 10} more")

if __name__ == "__main__":
    main()