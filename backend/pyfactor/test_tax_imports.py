#!/usr/bin/env python
"""Simple import test for tax module without Django setup"""

import sys
import os

# Add paths
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

print("=== Testing Tax Module Imports ===")

# Test direct Python imports without Django
test_files = [
    ('taxes/year_end/form1099_generator.py', 'Form1099Generator'),
    ('taxes/year_end/w2_generator.py', 'W2Generator'),
    ('taxes/multistate/views.py', 'MultistateNexusProfileViewSet'),
    ('purchases/models.py', 'Purchase'),
]

for file_path, class_name in test_files:
    try:
        with open(file_path, 'r') as f:
            content = f.read()
            
        # Check for specific imports
        if 'from purchases.models import' in content and 'Purchase' in content:
            if file_path == 'purchases/models.py':
                if 'class Purchase(' in content:
                    print(f"✓ {file_path}: Purchase model defined")
                else:
                    print(f"✗ {file_path}: Purchase model NOT defined")
            else:
                print(f"✓ {file_path}: imports Purchase")
                
        if 'TaxSetting' in content:
            if 'TaxSettings' in content:
                print(f"✓ {file_path}: uses TaxSettings (correct)")
            else:
                print(f"✗ {file_path}: uses TaxSetting (should be TaxSettings)")
                
        if 'TenantPermission' in content and 'TenantAccessPermission' not in content:
            print(f"✗ {file_path}: uses TenantPermission (should be TenantAccessPermission)")
        elif 'TenantAccessPermission' in content:
            print(f"✓ {file_path}: uses TenantAccessPermission (correct)")
            
    except FileNotFoundError:
        print(f"✗ {file_path}: File not found")
    except Exception as e:
        print(f"✗ {file_path}: {str(e)}")

# Check specific problematic imports
print("\n=== Checking Specific Issues ===")

# Check analytics middleware
try:
    with open('pyfactor/middleware/analytics_middleware.py', 'r') as f:
        content = f.read()
        if 'request.user and request.user.is_authenticated' in content:
            print("✓ Analytics middleware: Fixed to handle None user")
        else:
            print("✗ Analytics middleware: May still have None user issue")
except Exception as e:
    print(f"✗ Analytics middleware: {str(e)}")

# Check migrations
print("\n=== Checking Migration Files ===")
try:
    import glob
    migration_files = glob.glob('purchases/migrations/*.py')
    print(f"Found {len(migration_files)} migration files in purchases app")
    if any('0002_vendor_is_1099_vendor_vendor_tax_id_purchase' in f for f in migration_files):
        print("✓ Purchase model migration exists")
    else:
        print("✗ Purchase model migration missing")
except Exception as e:
    print(f"✗ Migration check failed: {str(e)}")