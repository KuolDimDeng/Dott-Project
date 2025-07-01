#!/usr/bin/env python
"""
Check tax models for timestamp field issues
"""

import re

def check_tax_models():
    with open('/Users/kuoldeng/projectx/backend/pyfactor/taxes/models.py', 'r') as f:
        content = f.read()
    
    # Find all ordering references
    created_at_refs = re.findall(r"ordering = \[.*'created_at'.*\]", content)
    if created_at_refs:
        print("Found ordering with 'created_at':")
        for ref in created_at_refs:
            print(f"  - {ref}")
    
    # Find all __str__ methods with created_at
    str_refs = re.findall(r"return f.*created_at.*", content)
    if str_refs:
        print("\nFound __str__ methods with 'created_at':")
        for ref in str_refs:
            print(f"  - {ref}")
    
    # Find models inheriting from TenantAwareModel that might need timestamps
    models = re.findall(r'class (\w+)\(.*TenantAwareModel.*\):', content)
    print(f"\nFound {len(models)} models inheriting from TenantAwareModel")
    
    # Check if all models have timestamp fields
    print("\nChecking models for timestamp fields...")
    lines = content.split('\n')
    
    for model in models:
        # Find the model definition
        model_start = None
        for i, line in enumerate(lines):
            if f'class {model}(' in line:
                model_start = i
                break
        
        if model_start is None:
            continue
            
        # Look for timestamp fields in the next 200 lines
        has_created = False
        has_updated = False
        
        for i in range(model_start, min(model_start + 200, len(lines))):
            line = lines[i]
            if 'class Meta:' in line:
                break
            if 'created = models.DateTimeField' in line:
                has_created = True
            if 'updated = models.DateTimeField' in line:
                has_updated = True
        
        if not has_created or not has_updated:
            print(f"  {model}: created={has_created}, updated={has_updated}")

if __name__ == "__main__":
    check_tax_models()