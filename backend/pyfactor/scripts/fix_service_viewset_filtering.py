#!/usr/bin/env python
"""
Script to fix Service ViewSet filtering issue.
The ServiceViewSet has custom get_queryset() that bypasses TenantManager filtering.

Run: python scripts/fix_service_viewset_filtering.py
"""

import os
import sys

def fix_service_viewset():
    print("=== Fixing Service ViewSet Filtering ===\n")
    
    views_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'inventory', 'views.py')
    
    if not os.path.exists(views_file):
        print(f"❌ Error: {views_file} not found!")
        return False
    
    # Read the file
    with open(views_file, 'r') as f:
        content = f.read()
    
    # Check if the issue exists
    if 'class ServiceViewSet' not in content:
        print("❌ ServiceViewSet not found in views.py")
        return False
    
    # Find the ServiceViewSet section
    import re
    
    # Pattern to match the ServiceViewSet with custom get_queryset
    pattern = r'(class ServiceViewSet\(viewsets\.ModelViewSet\):\s*\n\s*serializer_class = ServiceSerializer\s*\n\s*permission_classes = \[IsAuthenticated\]\s*\n\s*\n\s*def get_queryset\(self\):[\s\S]*?return Service\.objects\.none\(\))'
    
    # Replacement - simple declarative pattern
    replacement = '''class ServiceViewSet(viewsets.ModelViewSet):
    queryset = Service.objects.all()  # TenantManager handles filtering automatically
    serializer_class = ServiceSerializer
    permission_classes = [IsAuthenticated]'''
    
    # Check if the problematic pattern exists
    if re.search(pattern, content):
        print("✅ Found ServiceViewSet with custom get_queryset() override")
        print("   This is preventing TenantManager from filtering properly")
        
        # Apply the fix
        new_content = re.sub(pattern, replacement, content)
        
        # Write back the file
        with open(views_file, 'w') as f:
            f.write(new_content)
        
        print("\n✅ Fixed! ServiceViewSet now uses simple declarative pattern")
        print("   TenantManager will now handle tenant filtering automatically")
        print("\n🎉 Service fetching should now work properly!")
        
        return True
    else:
        print("⚠️  ServiceViewSet pattern not found or already fixed")
        
        # Check if it's already using the simple pattern
        if 'queryset = Service.objects.all()' in content and 'class ServiceViewSet' in content:
            print("✅ ServiceViewSet is already using the correct pattern!")
        else:
            print("❌ ServiceViewSet has an unexpected pattern. Manual fix required.")
        
        return False

if __name__ == "__main__":
    print("This script will fix the Service ViewSet filtering issue.")
    print("The issue: Custom get_queryset() override prevents TenantManager from working.\n")
    
    success = fix_service_viewset()
    
    if success:
        print("\n⚠️  IMPORTANT: You need to restart the Django server for changes to take effect!")
        print("   On Render, the service will auto-restart after deploying this change.")
    else:
        print("\n❌ Fix could not be applied automatically.")
        print("   Please check inventory/views.py manually.")