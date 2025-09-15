#!/usr/bin/env python3
"""
Script to fix the inventory/models.py file
Run this on the server to fix the syntax error
"""

import re

# Read the current file
with open('/app/inventory/models.py', 'r') as f:
    content = f.read()

# Fix the broken line at the end
# The issue is that line 666 has a broken class definition
lines = content.split('\n')

# Find and fix the problematic area around line 666
fixed_lines = []
for i, line in enumerate(lines):
    # Skip the broken import line if it exists
    if 'app_label = \'inventory\'from .models_storeitems' in line:
        # Replace with proper Meta class
        fixed_lines.append('        app_label = \'inventory\'')
    elif i == 665 and 'class Meta:' in line:
        # Make sure Meta class is properly indented
        fixed_lines.append('    class Meta:')
    else:
        fixed_lines.append(line)

# Join back together
fixed_content = '\n'.join(fixed_lines)

# Make sure the import is at the top if not already there
if 'from .models_storeitems import StoreItem' not in fixed_content:
    # Add import after line with "from .managers import"
    lines = fixed_content.split('\n')
    for i, line in enumerate(lines):
        if 'from .managers import' in line:
            lines.insert(i + 1, 'from .models_storeitems import StoreItem, MerchantStoreItem')
            break
    fixed_content = '\n'.join(lines)

# Write the fixed file
with open('/app/inventory/models.py', 'w') as f:
    f.write(fixed_content)

print("✅ Fixed inventory/models.py")

# Test the import
try:
    import inventory.models
    print("✅ Import test successful")
except Exception as e:
    print(f"❌ Import still failing: {e}")
    print("Manual intervention needed")